import { describe, expect, it } from 'vitest';
import type { Db, GiocatorePartita, Lega, Partita, Sessione, SessioneGioco } from '../types';
import {
  battezzaDb, conteggiPayload, costruisciPayloadImport, PAYLOAD_VERSION,
  preflightImport, riconciliaSoldi,
} from './import';

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

describe('preflightImport (R7.3a, I-R8)', () => {
  const tipi = (d: Db) => preflightImport(d).map((p) => p.tipo);

  it('db battezzato e coerente: nessun problema', () => {
    const buono = battezzaDb(db([lega({
      personale: true,
      nomi: [{ id: 1, nome: 'Anna' }, { id: 2, nome: 'Bruno' }],
      giochi: [{ id: 'scopa', nome: 'Scopa', preimpostato: true, attivo: true, pareggioComeVittoria: true }],
      serate: [{ id: 1, data: '2026-07-17', partecipanti: [1, 2] }],
      sessioniGioco: [sessioneGioco({ serataId: 1, partecipanti: [1, 2], partite: [{ id: 1, ora_inizio: '21:00', ora_fine: '21:30', vincitori: [1], pareggio: false }] })],
      partite: [partita({
        giocatori: [gp({ id_nome: 1, pagamenti_effettuati: [{ to: 2, amount: 5 }] }), gp({ id_nome: 2, netto_finale: 0 })],
        settlements: [{ from: 2, to: 1, amount: 15, pagato: false }],
      })],
    })]));
    expect(preflightImport(buono)).toEqual([]);
  });

  it('due leghe Personale: blocca (violerebbe leghe_personale_uniq)', () => {
    const d = battezzaDb(db([lega({ id: 1, personale: true }), lega({ id: 2, personale: true })]));
    expect(tipi(d)).toContain('personale_duplicata');
  });

  it('uid mancante (battesimo non eseguito): segnalato', () => {
    expect(tipi(db([lega({ nomi: [{ id: 1, nome: 'Anna' }] })]))).toContain('uid_mancante');
  });

  it('uid duplicato tra entità: segnalato', () => {
    const d = db([lega({
      uid: 'stesso-uid', syncRev: 1,
      nomi: [{ id: 1, nome: 'Anna', uid: 'stesso-uid', syncRev: 1 }],
    })]);
    expect(tipi(d)).toContain('uid_duplicato');
  });

  it('FK orfana: settlement che punta a un giocatore inesistente', () => {
    const d = battezzaDb(db([lega({
      nomi: [{ id: 1, nome: 'Anna' }],
      partite: [partita({ settlements: [{ from: 99, to: 1, amount: 10, pagato: false }] })],
    })]));
    expect(tipi(d)).toContain('fk_orfana');
    expect(preflightImport(d)[0].messaggio).toMatch(/id 99/);
  });

  it('FK orfana: sessione su un gioco non più configurato', () => {
    const d = battezzaDb(db([lega({
      nomi: [{ id: 1, nome: 'Anna' }],
      giochi: [],
      sessioniGioco: [sessioneGioco({ giocoId: 'briscola', partecipanti: [1] })],
    })]));
    expect(tipi(d)).toContain('fk_orfana');
    expect(preflightImport(d).some((p) => /briscola/.test(p.messaggio))).toBe(true);
  });

  it('FK orfana: sessione legata a una serata inesistente', () => {
    const d = battezzaDb(db([lega({
      nomi: [{ id: 1, nome: 'Anna' }],
      giochi: [{ id: 'scopa', nome: 'Scopa', preimpostato: true, attivo: true, pareggioComeVittoria: true }],
      serate: [],
      sessioniGioco: [sessioneGioco({ giocoId: 'scopa', serataId: 42, partecipanti: [1] })],
    })]));
    expect(preflightImport(d).some((p) => /serata di appartenenza inesistente/.test(p.messaggio))).toBe(true);
  });

  it('i messaggi sono leggibili (niente gergo SQL)', () => {
    const d = battezzaDb(db([lega({ nome: 'Amici', partite: [partita({ giocatori: [gp({ id_nome: 7 })] })] })]));
    const msg = preflightImport(d)[0].messaggio;
    expect(msg).toMatch(/giocatore inesistente/);
    expect(msg).not.toMatch(/violates|constraint|SQLSTATE/i);
  });
});

describe('riconciliaSoldi (R7.3a, F2 — flagga, non blocca)', () => {
  it('partita coerente (netti a somma zero): nessuna anomalia', () => {
    const d = db([lega({ partite: [partita({ giocatori: [gp({ netto_finale: 15 }), gp({ id_nome: 2, netto_finale: -15 })] })] })]);
    expect(riconciliaSoldi(d)).toEqual([]);
  });

  it('tollera il drift da centesimi (float+r100)', () => {
    const d = db([lega({ partite: [partita({ giocatori: [gp({ netto_finale: 10.005 }), gp({ id_nome: 2, netto_finale: -10 })] })] })]);
    expect(riconciliaSoldi(d)).toEqual([]);
  });

  it('netti che non sommano a zero: anomalia con importo leggibile', () => {
    const d = db([lega({ partite: [partita({ giocatori: [gp({ netto_finale: 50 }), gp({ id_nome: 2, netto_finale: -10 })] })] })]);
    const a = riconciliaSoldi(d);
    expect(a).toHaveLength(1);
    expect(a[0].tipo).toBe('soldi_anomali');
    expect(a[0].messaggio).toMatch(/40\.00 €/);
  });

  it('valori corrotti (NaN/Infinity) e debiti negativi: segnalati', () => {
    const nan = db([lega({ partite: [partita({ giocatori: [gp({ netto_finale: NaN })] })] })]);
    expect(riconciliaSoldi(nan)[0].messaggio).toMatch(/non è un numero valido/);

    const neg = db([lega({ partite: [partita({ giocatori: [gp({ netto_finale: 0 })], settlements: [{ from: 1, to: 2, amount: -5, pagato: false }] })] })]);
    expect(riconciliaSoldi(neg).some((p) => /negativo/.test(p.messaggio))).toBe(true);
  });

  it('è indipendente dal pre-flight: un dato strano non blocca l\'import', () => {
    // netti sbilanciati ma struttura valida → preflight pulito, solo anomalia soft
    const d = battezzaDb(db([lega({
      nomi: [{ id: 1, nome: 'Anna' }],
      partite: [partita({ giocatori: [gp({ id_nome: 1, netto_finale: 99 })] })],
    })]));
    expect(preflightImport(d)).toEqual([]);
    expect(riconciliaSoldi(d)).toHaveLength(1);
  });
});

describe('costruisciPayloadImport (R7.3a)', () => {
  /** Lega completa e coerente: poker (con movimenti e debiti) + multigioco (serata, sessione, partita). */
  const legaCompleta = () => battezzaDb(db([lega({
    id: 3, nome: 'Amici', personale: false,
    nomi: [{ id: 1, nome: 'Anna' }, { id: 2, nome: 'Bruno' }],
    giochi: [{ id: 'scopa', nome: 'Scopa', preimpostato: true, attivo: true, pareggioComeVittoria: true }],
    serate: [{ id: 1, data: '2026-07-17', partecipanti: [1, 2] }],
    sessioniGioco: [sessioneGioco({
      serataId: 1, partecipanti: [1, 2],
      partite: [{ id: 1, ora_inizio: '21:00', ora_fine: '21:30', vincitori: [1], pareggio: false, partecipanti: [1, 2] }],
    })],
    partite: [partita({
      giocatori: [
        gp({ id_nome: 1, netto_finale: 15, ricariche: [{ importo: 10 }], pagamenti_ricevuti: [{ from: 2, amount: 15 }] }),
        gp({ id_nome: 2, netto_finale: -15, pagamenti_effettuati: [{ to: 1, amount: 15 }] }),
      ],
      settlements: [{ from: 2, to: 1, amount: 15, pagato: false }],
    })],
  })]));

  it('db vuoto: payload versionato con tutte le tabelle vuote', () => {
    const p = costruisciPayloadImport(db([]), 'owner-1');
    expect(p.version).toBe(PAYLOAD_VERSION);
    expect(conteggiPayload(p)).toEqual({
      leghe: 0, giocatori: 0, giochi_lega: 0, partite_poker: 0, partita_poker_giocatori: 0,
      poker_movimenti: 0, settlements: 0, serate: 0, serata_partecipanti: 0, sessioni_gioco: 0,
      sessione_gioco_partecipanti: 0, partite_gioco: 0, partita_gioco_vincitori: 0, partita_gioco_partecipanti: 0,
    });
  });

  it('mappa tutte le 13 tabelle + ponti con i conteggi giusti', () => {
    expect(conteggiPayload(costruisciPayloadImport(legaCompleta(), 'owner-1'))).toEqual({
      leghe: 1, giocatori: 2, giochi_lega: 1,
      partite_poker: 1, partita_poker_giocatori: 2, poker_movimenti: 3, settlements: 1,
      serate: 1, serata_partecipanti: 2,
      sessioni_gioco: 1, sessione_gioco_partecipanti: 2,
      partite_gioco: 1, partita_gioco_vincitori: 1, partita_gioco_partecipanti: 2,
    });
  });

  it('le relazioni passano per gli uid, mai per gli id locali', () => {
    const d = legaCompleta();
    const p = costruisciPayloadImport(d, 'owner-1');
    const l = d.leghe[0];

    expect(p.leghe[0].id).toBe(l.uid);
    expect(p.leghe[0].owner_id).toBe('owner-1');
    expect(p.leghe[0].local_id).toBe(3); // l'id locale viaggia come ponte, non come chiave
    expect(p.giocatori.every((g) => g.lega_id === l.uid)).toBe(true);
    // il debito punta agli uid dei due giocatori, non a 1/2
    expect(p.settlements[0].from_giocatore_id).toBe(l.nomi[1].uid);
    expect(p.settlements[0].to_giocatore_id).toBe(l.nomi[0].uid);
    // la sessione punta al gioco e alla serata via uid
    expect(p.sessioni_gioco[0].gioco_lega_id).toBe(l.giochi![0].uid);
    expect(p.sessioni_gioco[0].serata_id).toBe(l.serate![0].uid);
    // i movimenti puntano al giocatore-partita e alla controparte via uid
    expect(p.poker_movimenti.every((m) => !!m.id && !!m.partita_giocatore_id)).toBe(true);
    expect(p.poker_movimenti.find((m) => m.tipo === 'pagamento_effettuato')?.contro_giocatore_id).toBe(l.nomi[0].uid);
  });

  it('NON spedisce created_at/updated_at (li mette il server, I2/I7)', () => {
    const p = costruisciPayloadImport(legaCompleta(), 'owner-1');
    const righe = [...p.leghe, ...p.giocatori, ...p.partite_poker, ...p.poker_movimenti] as Record<string, unknown>[];
    expect(righe.every((r) => !('created_at' in r) && !('updated_at' in r))).toBe(true);
  });

  it('NON include lo stato live (fuori scope R7)', () => {
    const sessioneFinta = { stato: 'live' } as unknown as Sessione;
    const d = battezzaDb(db([lega({ sessioneAttiva: sessioneFinta, serate_bg: [sessioneFinta] })]));
    const json = JSON.stringify(costruisciPayloadImport(d, 'owner-1'));
    expect(json).not.toMatch(/"stato":"live"/);
  });

  it('porta con sé le anomalie della riconciliazione (non bloccano, I-R6/F2)', () => {
    const d = battezzaDb(db([lega({ nomi: [{ id: 1, nome: 'Anna' }], partite: [partita({ giocatori: [gp({ id_nome: 1, netto_finale: 99 })] })] })]));
    const p = costruisciPayloadImport(d, 'owner-1');
    expect(p.anomalie).toHaveLength(1);
    expect(p.anomalie[0].tipo).toBe('soldi_anomali');
    expect(conteggiPayload(p).partite_poker).toBe(1); // importata comunque
  });

  it('db non battezzato: errore chiaro invece di payload monco', () => {
    expect(() => costruisciPayloadImport(db([lega({ nome: 'Senza uid' })]), 'owner-1'))
      .toThrow(/battezzaDb/);
  });

  it('FK orfana: errore che rimanda al pre-flight', () => {
    const d = battezzaDb(db([lega({ nomi: [{ id: 1, nome: 'Anna' }], partite: [partita({ giocatori: [gp({ id_nome: 99 })] })] })]));
    expect(() => costruisciPayloadImport(d, 'owner-1')).toThrow(/fk_orfana/);
  });

  it('è deterministico: due build dello stesso db danno lo stesso payload (retry sicuro)', () => {
    const d = legaCompleta();
    expect(costruisciPayloadImport(d, 'owner-1')).toEqual(costruisciPayloadImport(d, 'owner-1'));
  });
});
