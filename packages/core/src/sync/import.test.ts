import { describe, expect, it } from 'vitest';
import type { Db, GiocatorePartita, Lega, Partita, Sessione, SessioneGioco } from '../types';
import { battezzaDb } from './import';

/* ── fixture compatte ─────────────────────────────────────────────────── */
const gp = (over: Partial<GiocatorePartita> = {}): GiocatorePartita => ({
  id_nome: 1, entrate: 20, ricarica_fatta: 0, extra: 0, soldi_ricevuti: 0,
  fiches_finali: 0, netto_finale: 0, premio: 0, vincitore: false,
  buy_in_pagato: true, extra_pagato: false, posizione_finale: null,
  add_on_fatto: false, add_on_pagato: false,
  ricariche: [], pagamenti_effettuati: [], pagamenti_ricevuti: [],
  ...over,
});

const partita = (over: Partial<Partita> = {}): Partita => ({
  id: 1, buy_in: 20, data: '2026-07-17', ora_inizio: '21:00', ora_fine: '23:30',
  modalita: 'cash', giocatori: [], settlements: [],
  ...over,
});

const sessioneGioco = (over: Partial<SessioneGioco> = {}): SessioneGioco => ({
  id: 1, giocoId: 'scopa', data: '2026-07-17', stato: 'chiusa',
  ora_inizio: '21:00', ora_fine: '22:00', partecipanti: [1, 2], partite: [],
  esitoPareggio: false,
  ...over,
});

const lega = (over: Partial<Lega> = {}): Lega => ({
  id: 1, nome: 'Amici del giovedì', foto: '', nomi: [], partite: [],
  sessioneAttiva: undefined, serate_bg: [], _nid: 1, _pid: 1,
  ...over,
});

const db = (leghe: Lega[]): Db => ({ leghe, _lid: leghe.length + 1, _currentLegaId: undefined });

/** Tutti gli uid presenti nell'albero (per unicità e conteggi). */
function raccogliUid(d: Db): string[] {
  const out: (string | undefined)[] = [];
  for (const l of d.leghe) {
    out.push(l.uid);
    l.nomi.forEach((n) => out.push(n.uid));
    l.giochi?.forEach((g) => out.push(g.uid));
    l.serate?.forEach((s) => out.push(s.uid));
    l.sessioniGioco?.forEach((s) => { out.push(s.uid); s.partite.forEach((p) => out.push(p.uid)); });
    for (const p of l.partite) {
      out.push(p.uid);
      p.settlements.forEach((s) => out.push(s.uid));
      for (const g of p.giocatori) {
        out.push(g.uid);
        g.ricariche.forEach((r) => out.push(r.uid));
        g.pagamenti_effettuati.forEach((x) => out.push(x.uid));
        g.pagamenti_ricevuti.forEach((x) => out.push(x.uid));
      }
    }
  }
  return out.filter((u): u is string => !!u);
}

/* ── test ─────────────────────────────────────────────────────────────── */
describe('battezzaDb (R7.3a, I-R5)', () => {
  it('db senza leghe: invariato', () => {
    expect(battezzaDb(db([]))).toEqual(db([]));
  });

  it('assegna uid + syncRev a tutte le entità dell\'albero che ne sono prive', () => {
    const out = battezzaDb(db([lega({
      nomi: [{ id: 1, nome: 'Anna' }, { id: 2, nome: 'Bruno' }],
      giochi: [{ id: 'scopa', nome: 'Scopa', preimpostato: true, attivo: true, pareggioComeVittoria: true }],
      serate: [{ id: 1, data: '2026-07-17', partecipanti: [1, 2] }],
      sessioniGioco: [sessioneGioco({ partite: [{ id: 1, ora_inizio: '21:00', ora_fine: '21:30', vincitori: [1], pareggio: false }] })],
      partite: [partita({
        giocatori: [gp()],
        settlements: [{ from: 2, to: 1, amount: 15, pagato: false }],
      })],
    })]));

    const l = out.leghe[0];
    expect(l.uid).toBeTruthy();
    expect(l.syncRev).toBe(1);
    expect(l.nomi.every((n) => n.uid && n.syncRev === 1)).toBe(true);
    expect(l.giochi?.[0].uid).toBeTruthy();
    expect(l.serate?.[0].uid).toBeTruthy();
    expect(l.sessioniGioco?.[0].uid).toBeTruthy();
    expect(l.sessioniGioco?.[0].partite[0].uid).toBeTruthy();
    expect(l.partite[0].uid).toBeTruthy();
    expect(l.partite[0].giocatori[0].uid).toBeTruthy();
    expect(l.partite[0].settlements[0].uid).toBeTruthy();
  });

  it('battezza anche i movimenti del ledger (solo uid: append-only, niente syncRev)', () => {
    const out = battezzaDb(db([lega({
      partite: [partita({
        giocatori: [gp({
          ricariche: [{ importo: 10 }, { importo: 20, pagata: true }],
          pagamenti_effettuati: [{ to: 2, amount: 5 }],
          pagamenti_ricevuti: [{ from: 3, amount: 8 }],
        })],
      })],
    })]));

    const g = out.leghe[0].partite[0].giocatori[0];
    expect(g.ricariche.every((r) => !!r.uid)).toBe(true);
    expect(g.pagamenti_effettuati[0].uid).toBeTruthy();
    expect(g.pagamenti_ricevuti[0].uid).toBeTruthy();
    // append-only: nessun contatore di revisione sui movimenti
    expect((g.ricariche[0] as { syncRev?: number }).syncRev).toBeUndefined();
  });

  it('IDEMPOTENTE: non rigenera uid/syncRev già presenti', () => {
    const originale = db([lega({
      uid: 'lega-uid-esistente', syncRev: 7,
      nomi: [{ id: 1, nome: 'Anna', uid: 'nome-uid-esistente', syncRev: 3 }],
      partite: [partita({
        uid: 'partita-uid-esistente', syncRev: 2,
        giocatori: [gp({ uid: 'gp-uid', syncRev: 1, ricariche: [{ importo: 10, uid: 'ric-uid' }] })],
      })],
    })]);
    const out = battezzaDb(originale);

    expect(out.leghe[0].uid).toBe('lega-uid-esistente');
    expect(out.leghe[0].syncRev).toBe(7);
    expect(out.leghe[0].nomi[0].uid).toBe('nome-uid-esistente');
    expect(out.leghe[0].nomi[0].syncRev).toBe(3);
    expect(out.leghe[0].partite[0].uid).toBe('partita-uid-esistente');
    expect(out.leghe[0].partite[0].giocatori[0].ricariche[0].uid).toBe('ric-uid');
  });

  it('IDEMPOTENTE: battezzare due volte dà lo stesso risultato (stessi uid — retry sicuro dopo un crash)', () => {
    const uno = battezzaDb(db([lega({
      nomi: [{ id: 1, nome: 'Anna' }],
      partite: [partita({ giocatori: [gp({ ricariche: [{ importo: 10 }] })], settlements: [{ from: 2, to: 1, amount: 5, pagato: false }] })],
      sessioniGioco: [sessioneGioco()],
    })]));
    const due = battezzaDb(uno);
    expect(due).toEqual(uno);
    expect(raccogliUid(due)).toEqual(raccogliUid(uno));
  });

  it('battesimo parziale: completa solo ciò che manca, senza toccare il resto', () => {
    const out = battezzaDb(db([lega({
      uid: 'lega-gia-battezzata', syncRev: 1,
      nomi: [{ id: 1, nome: 'Anna', uid: 'anna-uid', syncRev: 1 }, { id: 2, nome: 'Nuovo' }],
    })]));
    expect(out.leghe[0].uid).toBe('lega-gia-battezzata');
    expect(out.leghe[0].nomi[0].uid).toBe('anna-uid');
    expect(out.leghe[0].nomi[1].uid).toBeTruthy();
    expect(out.leghe[0].nomi[1].uid).not.toBe('anna-uid');
  });

  it('NON tocca lo stato live (sessioneAttiva / serate_bg): fuori scope R7', () => {
    const sessioneFinta = { stato: 'live' } as unknown as Sessione;
    const bgFinte = [{ stato: 'bg' }] as unknown as Sessione[];
    const out = battezzaDb(db([lega({ sessioneAttiva: sessioneFinta, serate_bg: bgFinte })]));
    // stesso riferimento = non copiato, non battezzato
    expect(out.leghe[0].sessioneAttiva).toBe(sessioneFinta);
    expect(out.leghe[0].serate_bg).toBe(bgFinte);
  });

  it('gli uid generati sono tutti diversi', () => {
    const out = battezzaDb(db([
      lega({ id: 1, nomi: [{ id: 1, nome: 'Anna' }, { id: 2, nome: 'Bruno' }], partite: [partita({ giocatori: [gp(), gp({ id_nome: 2 })] })] }),
      lega({ id: 2, nomi: [{ id: 1, nome: 'Carla' }] }),
    ]));
    const uids = raccogliUid(out);
    expect(uids.length).toBeGreaterThan(5);
    expect(new Set(uids).size).toBe(uids.length);
  });

  it('non muta il db originale (funzione pura)', () => {
    const originale = db([lega({ nomi: [{ id: 1, nome: 'Anna' }] })]);
    battezzaDb(originale);
    expect(originale.leghe[0].uid).toBeUndefined();
    expect(originale.leghe[0].nomi[0].uid).toBeUndefined();
  });
});
