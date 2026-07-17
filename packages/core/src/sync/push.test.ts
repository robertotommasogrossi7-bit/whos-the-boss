import { describe, expect, it } from 'vitest';
import type { GiocatorePartita, Lega, Partita, Settlement } from '../types';
import { haCambiamentiLocaliNonSincronizzati } from './merge';
import { applicaStampPush, costruisciPayloadPush, haRigheDaPushare, revisioniPush } from './push';

/* ══════════════════════════════════════════════════════
   R7.4c-1 — payload push (righe dirty) + stamp. Zero rete.
   T0 = pegno vecchio (ultimo sync); T1 = updated_at ritornato dalla RPC.
══════════════════════════════════════════════════════ */

const T0 = '2026-07-16T10:00:00.000Z';
const T1 = '2026-07-17T12:00:00.000Z';

function gp(over: Partial<GiocatorePartita> = {}): GiocatorePartita {
  return {
    id_nome: 1, entrate: 25, ricarica_fatta: 0, extra: 0, soldi_ricevuti: 0, fiches_finali: 0,
    netto_finale: 0, premio: 0, vincitore: false, buy_in_pagato: true, extra_pagato: true,
    ricariche: [], pagamenti_effettuati: [], pagamenti_ricevuti: [], posizione_finale: null,
    add_on_fatto: false, add_on_pagato: false, ...over,
  };
}

/** Lega a stato misto: lega pulita, un giocatore rinominato (dirty), un settlement
    saldato (dirty) su una partita pulita, e una partita nuova (dirty, senza
    pegno) con un movimento. */
function legaMista(): Lega {
  const settlementDirty: Settlement = {
    from: 1, to: 2, amount: 10, pagato: true, uid: 'S1', syncRev: 2, syncedRev: 1, lastSyncedAt: T0,
  };
  const partitaPulita: Partita = {
    id: 1, buy_in: 25, data: '2026-07-16', ora_inizio: '21:00', ora_fine: '01:00', modalita: 'cash',
    giocatori: [gp({ id_nome: 1, uid: 'GP1', syncRev: 1, syncedRev: 1, lastSyncedAt: T0 })],
    settlements: [settlementDirty],
    uid: 'P1', syncRev: 1, syncedRev: 1, lastSyncedAt: T0,
  };
  const partitaNuova: Partita = {
    id: 2, buy_in: 25, data: '2026-07-17', ora_inizio: '21:00', ora_fine: '01:00', modalita: 'cash',
    giocatori: [gp({
      id_nome: 1, uid: 'GP2', syncRev: 1,   // nuova: nessun syncedRev/lastSyncedAt
      ricariche: [{ importo: 10, pagata: false, uid: 'M1' }],
    })],
    settlements: [],
    uid: 'P2', syncRev: 1,   // nuova
  };
  return {
    id: 1, nome: 'Amici', foto: '', _nid: 3, _pid: 3,
    nomi: [
      { id: 1, nome: 'Anna B.', uid: 'G1', syncRev: 2, syncedRev: 1, lastSyncedAt: T0 },   // rinominata: dirty
      { id: 2, nome: 'Bruno', uid: 'G2', syncRev: 1, syncedRev: 1, lastSyncedAt: T0 },      // pulita
    ],
    partite: [partitaPulita, partitaNuova],
    sessioneAttiva: undefined, serate_bg: [],
    uid: 'L1', syncRev: 1, syncedRev: 1, lastSyncedAt: T0,   // lega pulita
  };
}

describe('costruisciPayloadPush — solo le righe dirty, col pegno', () => {
  const p = costruisciPayloadPush(legaMista(), 'acc-1');

  it('la lega pulita NON entra nel payload', () => {
    expect(p.leghe).toHaveLength(0);
  });

  it('solo il giocatore rinominato entra, col suo pegno (UPDATE con CAS)', () => {
    expect(p.giocatori).toHaveLength(1);
    expect(p.giocatori[0].id).toBe('G1');
    expect(p.giocatori[0].nome).toBe('Anna B.');
    expect(p.giocatori[0].expected_updated_at).toBe(T0);
  });

  it('la partita nuova ha pegno null (INSERT); la pulita non entra', () => {
    expect(p.partite_poker).toHaveLength(1);
    expect(p.partite_poker[0].id).toBe('P2');
    expect(p.partite_poker[0].expected_updated_at).toBeNull();
  });

  it('il settlement saldato entra col suo pegno, anche se la partita padre è pulita', () => {
    expect(p.settlements).toHaveLength(1);
    expect(p.settlements[0].id).toBe('S1');
    expect(p.settlements[0].pagato).toBe(true);
    expect(p.settlements[0].expected_updated_at).toBe(T0);
  });

  it('i movimenti seguono la gp nuova inclusa (append-only, senza pegno)', () => {
    expect(p.partita_poker_giocatori.map((g) => g.id)).toEqual(['GP2']); // GP1 è pulita
    expect(p.poker_movimenti).toHaveLength(1);
    expect(p.poker_movimenti[0].id).toBe('M1');
    expect(p.poker_movimenti[0]).not.toHaveProperty('expected_updated_at');
  });

  it('haRigheDaPushare = true quando c\'è delta, false su una lega tutta pulita', () => {
    expect(haRigheDaPushare(p)).toBe(true);
    const pulita: Lega = { ...legaMista(), nomi: [], partite: [] };
    expect(haRigheDaPushare(costruisciPayloadPush(pulita, 'acc-1'))).toBe(false);
  });
});

describe('applicaStampPush — marca confermate solo le righe applicate', () => {
  it('syncedRev = revisione spedita, lastSyncedAt = updated_at ritornato', () => {
    const lega = legaMista();
    const spedite = revisioniPush(lega);
    // la RPC conferma: giocatore G1, settlement S1, partita P2, gp GP2
    const applicate = new Map([['G1', T1], ['S1', T1], ['P2', T1], ['GP2', T1]]);
    const out = applicaStampPush(lega, spedite, applicate);

    const anna = out.nomi.find((n) => n.uid === 'G1')!;
    expect(anna.syncedRev).toBe(2);           // = syncRev spedita
    expect(anna.lastSyncedAt).toBe(T1);        // nuovo pegno
    expect(haCambiamentiLocaliNonSincronizzati(anna), 'ora pulita').toBe(false);

    const p2 = out.partite.find((x) => x.uid === 'P2')!;
    expect(p2.syncedRev).toBe(1);
    expect(p2.lastSyncedAt).toBe(T1);
    expect(haCambiamentiLocaliNonSincronizzati(p2)).toBe(false);
  });

  it('una riga NON confermata dalla RPC resta com\'era (dirty)', () => {
    const lega = legaMista();
    const out = applicaStampPush(lega, revisioniPush(lega), new Map()); // la RPC non conferma nulla
    const anna = out.nomi.find((n) => n.uid === 'G1')!;
    expect(anna.syncedRev).toBe(1);
    expect(haCambiamentiLocaliNonSincronizzati(anna), 'resta dirty: si ritenta').toBe(true);
  });

  it('un edit avvenuto DURANTE il push resta dirty (syncRev oltre la spedita)', () => {
    const lega = legaMista();
    const spedite = revisioniPush(lega);   // G1 spedita a syncRev 2
    // durante il push l'utente rinomina di nuovo Anna → syncRev sale a 3
    lega.nomi[0] = { ...lega.nomi[0], syncRev: 3 };
    const out = applicaStampPush(lega, spedite, new Map([['G1', T1]]));
    const anna = out.nomi.find((n) => n.uid === 'G1')!;
    expect(anna.syncedRev).toBe(2);   // confermata la rev 2...
    expect(anna.syncRev).toBe(3);     // ...ma il nuovo edit è la 3
    expect(haCambiamentiLocaliNonSincronizzati(anna), 'l\'edit nella finestra resta da spedire').toBe(true);
  });
});
