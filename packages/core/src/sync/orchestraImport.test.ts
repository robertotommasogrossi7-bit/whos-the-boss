import { describe, expect, it } from 'vitest';
import type { Db, Lega } from '../types';
import { touchSync } from '../utils/uid';
import { conteggiPayload, type PayloadImport } from './import';
import { haCambiamentiLocaliNonSincronizzati } from './merge';
import { orchestraImport, type DepsImport, type RispostaRpc } from './orchestraImport';

/* ── fixture: una lega con 2 giocatori e una partita ──────────────────── */
const dbFixture = (): Db => ({
  _lid: 2, _currentLegaId: 1,
  leghe: [{
    id: 1, nome: 'Amici', foto: '', _nid: 3, _pid: 2,
    sessioneAttiva: undefined, serate_bg: [],
    nomi: [{ id: 1, nome: 'Anna' }, { id: 2, nome: 'Bruno' }],
    partite: [{
      id: 1, buy_in: 20, data: '2026-07-17', ora_inizio: '21:00', ora_fine: '23:00', modalita: 'cash',
      giocatori: [{
        id_nome: 1, entrate: 20, ricarica_fatta: 0, extra: 0, soldi_ricevuti: 0,
        fiches_finali: 20, netto_finale: 0, premio: 0, vincitore: false,
        buy_in_pagato: true, extra_pagato: false, posizione_finale: null,
        add_on_fatto: false, add_on_pagato: false,
        ricariche: [], pagamenti_effettuati: [], pagamenti_ricevuti: [],
      }],
      settlements: [],
    }],
  } as Lega],
});

/** Banco di prova: deps finte + registro degli eventi (per verificare l'ORDINE). */
function banco(over: Partial<DepsImport> = {}, dbIniziale: Db = dbFixture()) {
  let corrente = dbIniziale;
  const eventi: string[] = [];
  const deps: DepsImport = {
    leggiDb: () => corrente,
    scriviDb: (d) => { corrente = d; eventi.push('scriviDb'); },
    confermaPersist: async () => { eventi.push('confermaPersist'); return true; },
    chiamaRpc: async (p: PayloadImport): Promise<RispostaRpc> => { eventi.push('chiamaRpc'); return { conteggi: conteggiPayload(p) }; },
    ownerId: 'owner-1',
    ...over,
  };
  return { deps, eventi, dbFinale: () => corrente };
}

const sporca = (e: { syncRev?: number; syncedRev?: number }) => haCambiamentiLocaliNonSincronizzati(e);

describe('orchestraImport (R7.3c)', () => {
  it('successo: importa e marca il locale come sincronizzato', async () => {
    const b = banco();
    const esito = await orchestraImport(b.deps);

    expect(esito.stato).toBe('ok');
    if (esito.stato !== 'ok') return;
    expect(esito.conteggi.leghe).toBe(1);
    expect(esito.conteggi.giocatori).toBe(2);
    // stamp applicato: le righe non risultano più da pushare
    const l = b.dbFinale().leghe[0];
    expect(sporca(l)).toBe(false);
    expect(l.nomi.some(sporca)).toBe(false);
  });

  it('ORDINE (I-R5): salva → conferma il disco → SOLO POI spedisce → stampa', async () => {
    const b = banco();
    await orchestraImport(b.deps);
    expect(b.eventi).toEqual(['scriviDb', 'confermaPersist', 'chiamaRpc', 'scriviDb']);
  });

  it('persist NON confermato: non spedisce nulla (gli uid non sono al sicuro)', async () => {
    const b = banco({ confermaPersist: async () => false });
    const esito = await orchestraImport(b.deps);

    expect(esito.stato).toBe('errore');
    expect(b.eventi).not.toContain('chiamaRpc'); // il punto: mai spedire uid non salvati
    if (esito.stato === 'errore') expect(esito.messaggio).toMatch(/salvare gli identificativi/);
  });

  it('già importato da un altro device (I-R4): NIENTE stamp, i dati restano da sincronizzare', async () => {
    const b = banco({ chiamaRpc: async () => ({ errore: 'already_imported' }) });
    const esito = await orchestraImport(b.deps);

    expect(esito.stato).toBe('gia_importato');
    // il locale resta dirty: R7.4 proporrà l'adozione (DS9). Pulito = dati persi.
    const l = b.dbFinale().leghe[0];
    expect(sporca(l)).toBe(true);
    expect(l.nomi.every(sporca)).toBe(true);
  });

  it('conteggi che non combaciano (I-R6): errore e NIENTE stamp', async () => {
    // il server "dimentica" i giocatori
    const b = banco({
      chiamaRpc: async (p) => ({ conteggi: { ...conteggiPayload(p), giocatori: 0 } }),
    });
    const esito = await orchestraImport(b.deps);

    expect(esito.stato).toBe('errore');
    if (esito.stato === 'errore') expect(esito.messaggio).toMatch(/0 righe invece di 2.*giocatori/);
    expect(sporca(b.dbFinale().leghe[0])).toBe(true); // non marcato importato
  });

  it('pre-flight fallito: si ferma prima, senza scrivere né spedire', async () => {
    const rotto = dbFixture();
    rotto.leghe[0].partite[0].giocatori[0].id_nome = 99; // FK orfana
    const b = banco({}, rotto);
    const esito = await orchestraImport(b.deps);

    expect(esito.stato).toBe('bloccato');
    if (esito.stato === 'bloccato') expect(esito.problemi[0].tipo).toBe('fk_orfana');
    expect(b.eventi).toEqual([]); // nessuna scrittura, nessuna RPC
  });

  it('db vuoto: errore leggibile, niente RPC', async () => {
    const b = banco({}, { leghe: [], _lid: 1, _currentLegaId: undefined });
    const esito = await orchestraImport(b.deps);
    expect(esito.stato).toBe('errore');
    if (esito.stato === 'errore') expect(esito.messaggio).toMatch(/niente da importare/);
    expect(b.eventi).not.toContain('chiamaRpc');
  });

  it('errore di rete: riportato, niente stamp (l\'import resta ritentabile)', async () => {
    const b = banco({ chiamaRpc: async () => ({ errore: 'network request failed' }) });
    const esito = await orchestraImport(b.deps);
    expect(esito.stato).toBe('errore');
    expect(sporca(b.dbFinale().leghe[0])).toBe(true);
  });

  it('CONTRATTO O.3: la riga editata DURANTE l\'import resta dirty, le altre no', async () => {
    let corrente = dbFixture();
    const deps: DepsImport = {
      leggiDb: () => corrente,
      scriviDb: (d) => { corrente = d; },
      confermaPersist: async () => true,
      // mentre la RPC è "in volo", l'utente rinomina Anna
      chiamaRpc: async (p) => {
        const l = corrente.leghe[0];
        corrente = { ...corrente, leghe: [{ ...l, nomi: [touchSync(l.nomi[0]), l.nomi[1]] }] };
        return { conteggi: conteggiPayload(p) };
      },
      ownerId: 'owner-1',
    };
    const esito = await orchestraImport(deps);

    expect(esito.stato).toBe('ok');
    const l = corrente.leghe[0];
    expect(sporca(l.nomi[0])).toBe(true);  // Anna: edit non perso, lo pusherà R7.4
    expect(sporca(l.nomi[1])).toBe(false); // Bruno: sincronizzato
    expect(sporca(l)).toBe(false);
  });

  it('le anomalie della riconciliazione tornano al chiamante (non bloccano)', async () => {
    const conAnomalia = dbFixture();
    conAnomalia.leghe[0].partite[0].giocatori[0].netto_finale = 99; // netti sbilanciati
    const b = banco({}, conAnomalia);
    const esito = await orchestraImport(b.deps);

    expect(esito.stato).toBe('ok'); // importato lo stesso (F2)
    if (esito.stato === 'ok') expect(esito.anomalie[0].tipo).toBe('soldi_anomali');
  });
});
