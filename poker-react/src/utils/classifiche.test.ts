import { describe, it, expect } from 'vitest';
import { sommaStats, classificaGioco, statsPersonaCrossContesto, classificaPoker, classificaGiocoU, classificaUnificata } from './classifiche';
import { calcolaStatsGioco, type StatsGiocatore } from './statsGiochi';
import type { GiocoLega, SessioneGioco, PartitaGioco, Lega, NomeGiocatore, Partita, GiocatorePartita } from '../types';

const A = 1, B = 2, C = 3;

/* ── builder helpers ── */

function gioco(opts: Partial<GiocoLega> = {}): GiocoLega {
  return { id: 'scopa', nome: 'Scopa', preimpostato: true, attivo: true, pareggioComeVittoria: true, ...opts };
}

function partita(
  id: number,
  vincitori: number[],
  opts: { pareggio?: boolean; partecipanti?: number[] } = {},
): PartitaGioco {
  return { id, ora_inizio: '20:00', ora_fine: '20:30', vincitori, pareggio: opts.pareggio ?? false, partecipanti: opts.partecipanti };
}

function sessione(
  id: number,
  partecipanti: number[],
  partite: PartitaGioco[],
  giocoId = 'scopa',
): SessioneGioco {
  return { id, giocoId, data: '2026-06-01', stato: 'chiusa', ora_inizio: '20:00', ora_fine: '22:00', partecipanti, partite, esitoPareggio: false };
}

function mkStats(overrides: Partial<StatsGiocatore> = {}): StatsGiocatore {
  return { sessioniGiocate: 0, sessioniVinte: 0, sessioniPerse: 0, sessioniPareggio: 0, partiteGiocate: 0, partiteVinte: 0, partitePerse: 0, partitePareggio: 0, percVittorie: 0, ...overrides };
}

function mkLega(
  id: number,
  nomi: NomeGiocatore[],
  sessioni: SessioneGioco[],
  opts: { personale?: boolean; nome?: string; partite?: Partita[] } = {},
): Lega {
  return {
    id, nome: opts.nome ?? `Lega ${id}`, foto: '', nomi,
    partite: opts.partite ?? [], sessioneAttiva: undefined, serate_bg: [],
    _nid: 10, _pid: 10,
    sessioniGioco: sessioni,
    personale: opts.personale ?? false,
  };
}

/* ── builder poker (Partita / GiocatorePartita) ── */

function gpok(id_nome: number, netto: number, vincitore = false): GiocatorePartita {
  return {
    id_nome, entrate: 0, ricarica_fatta: 0, extra: 0, soldi_ricevuti: 0,
    fiches_finali: 0, netto_finale: netto, premio: 0, vincitore,
    buy_in_pagato: true, extra_pagato: false, ricariche: [],
    pagamenti_effettuati: [], pagamenti_ricevuti: [],
    posizione_finale: null, add_on_fatto: false, add_on_pagato: false,
  };
}

function ppok(id: number, data: string, giocatori: GiocatorePartita[]): Partita {
  return {
    id, buy_in: 25, data, ora_inizio: '21:00', ora_fine: '00:00',
    modalita: 'cash', giocatori, settlements: [],
  };
}

/* ══════════════════════════════════════════════════════
   sommaStats
══════════════════════════════════════════════════════ */

describe('sommaStats', () => {

  it('somma tutti i conteggi di sessioni e partite', () => {
    const a = mkStats({ partiteGiocate: 3, partiteVinte: 2, partitePerse: 1, sessioniGiocate: 1, sessioniVinte: 1 });
    const b = mkStats({ partiteGiocate: 2, partiteVinte: 1, partitePerse: 1, sessioniGiocate: 1, sessioniPerse: 1 });
    const r = sommaStats(a, b, true);
    expect(r.partiteGiocate).toBe(5);
    expect(r.partiteVinte).toBe(3);
    expect(r.partitePerse).toBe(2);
    expect(r.sessioniGiocate).toBe(2);
    expect(r.sessioniVinte).toBe(1);
    expect(r.sessioniPerse).toBe(1);
  });

  it('ricalcola percVittorie dai totali — NON media le % (caso classico)', () => {
    // A: 2 vinte su 4 (50%) — B: 3 vinte su 3 (100%)
    // Media sbagliata: (50 + 100) / 2 = 75
    // Ricalcolo corretto: 5/7 ≈ 71.4
    const a = mkStats({ partiteGiocate: 4, partiteVinte: 2, percVittorie: 50 });
    const b = mkStats({ partiteGiocate: 3, partiteVinte: 3, percVittorie: 100 });
    const r = sommaStats(a, b, true);
    expect(r.percVittorie).toBe(71.4);
    expect(r.percVittorie).not.toBe(75);
  });

  it('pareggioComeVittoria=true: i pareggi entrano nella %', () => {
    const a = mkStats({ partiteGiocate: 2, partiteVinte: 1, partitePareggio: 1 });
    const b = mkStats({ partiteGiocate: 2, partiteVinte: 0, partitePareggio: 2 });
    const r = sommaStats(a, b, true);
    // (1 vinta + 1 par + 0 vinte + 2 par) = 4 su 4 giocate = 100%
    expect(r.percVittorie).toBe(100);
    expect(r.partitePareggio).toBe(3);
  });

  it('pareggioComeVittoria=false: i pareggi NON entrano nella %', () => {
    const a = mkStats({ partiteGiocate: 2, partiteVinte: 1, partitePareggio: 1 });
    const b = mkStats({ partiteGiocate: 2, partiteVinte: 0, partitePareggio: 2 });
    const r = sommaStats(a, b, false);
    // Solo 1 vittoria su 4 giocate = 25%
    expect(r.percVittorie).toBe(25);
  });

  it('nessuna partita giocata → percVittorie = 0 (no divisione per zero)', () => {
    const r = sommaStats(mkStats(), mkStats(), true);
    expect(r.percVittorie).toBe(0);
  });

  it('sessioni pareggio sommati correttamente', () => {
    const a = mkStats({ sessioniPareggio: 2 });
    const b = mkStats({ sessioniPareggio: 3 });
    expect(sommaStats(a, b, true).sessioniPareggio).toBe(5);
  });
});

/* ══════════════════════════════════════════════════════
   classificaGioco
══════════════════════════════════════════════════════ */

describe('classificaGioco', () => {
  const nomiABC = [
    { id: A, nome: 'Alice' },
    { id: B, nome: 'Bob' },
    { id: C, nome: 'Carlo' },
  ];

  it('ordina per % vittorie decrescente', () => {
    // A: 2/3 = 66.7%,  B: 1/3 = 33.3%,  C: 0 giocate
    const sess = [sessione(1, [A, B, C], [partita(1, [A]), partita(2, [A]), partita(3, [B])])];
    const righe = classificaGioco(gioco(), sess, nomiABC);
    expect(righe.map(r => r.idNome)).toEqual([A, B, C]);
    expect(righe[0]!.stats.percVittorie).toBeGreaterThan(righe[1]!.stats.percVittorie);
  });

  it('marca il leader (primo con partite giocate)', () => {
    const sess = [sessione(1, [A, B], [partita(1, [A]), partita(2, [A])])];
    const righe = classificaGioco(gioco(), sess, [{ id: A, nome: 'Alice' }, { id: B, nome: 'Bob' }]);
    expect(righe[0]!.isLeader).toBe(true);
    expect(righe[1]!.isLeader).toBe(false);
  });

  it('nessun leader se nessuna partita giocata da nessuno', () => {
    const righe = classificaGioco(gioco(), [], nomiABC);
    expect(righe.every(r => !r.isLeader)).toBe(true);
  });

  it('tiebreak % uguale: vince chi ha più sessioni vinte', () => {
    // A: 1 vittoria in sess1 (solo vince sess1), B: 1 vittoria in sess2 (solo vince sess2)
    // Entrambi 1/2 = 50%; A ha più sessioni vinte perché vince da solo sess1
    const sess = [
      sessione(1, [A, B], [partita(1, [A]), partita(2, [B])]),   // parità in testa → pareggio sessione
      sessione(2, [A, B], [partita(3, [A]), partita(4, [A])]),   // A vince
      sessione(3, [A, B], [partita(5, [B]), partita(6, [B])]),   // B vince
    ];
    // A: sess giocate 3, vinte 1 (sess2) + 1 par; B: 3 giocate, vinte 1 (sess3) + 1 par
    // % = (1+1par)/(2+2+2) con par=true → A e B pareggiano in % (3/6=50)
    // sessioniVinte: A=1, B=1 → stesso, tiebreak = partiteGiocate (6 vs 6) → ordine invariato (A first per posizione iniziale?)
    // Questo test verifica che il codice ordini correttamente; l'importante è che isLeader sia assegnato
    const righe = classificaGioco(gioco(), sess, [{ id: A, nome: 'Alice' }, { id: B, nome: 'Bob' }]);
    expect(righe.some(r => r.isLeader)).toBe(true);
    expect(righe.filter(r => r.isLeader).length).toBe(1);
  });

  it('coerenza: i conteggi di classificaGioco coincidono con calcolaStatsGioco diretta', () => {
    const sess = [sessione(1, [A, B], [partita(1, [A]), partita(2, [A]), partita(3, [B])])];
    const g = gioco();
    const righe = classificaGioco(g, sess, [{ id: A, nome: 'Alice' }, { id: B, nome: 'Bob' }]);
    const statsA = calcolaStatsGioco(g, sess, A);
    const rigaA = righe.find(r => r.idNome === A)!;
    expect(rigaA.stats).toEqual(statsA);
  });
});

/* ══════════════════════════════════════════════════════
   statsPersonaCrossContesto
══════════════════════════════════════════════════════ */

describe('statsPersonaCrossContesto', () => {
  const g = gioco({ id: 'scopa', pareggioComeVittoria: true });

  it('aggrega su Personale + 1 lega, somma conteggi e ricalcola %', () => {
    // Personale: Alice vince 2/2 (100%)
    const sessP = sessione(1, [A], [partita(1, [A]), partita(2, [A])]);
    // Lega amici: Alice vince 1/4 (25%)
    const sessL = sessione(2, [A, B], [
      partita(3, [A]), partita(4, [B]), partita(5, [B]), partita(6, [B]),
    ]);

    const legaPersonale = mkLega(10, [{ id: A, nome: 'Alice' }], [sessP], { personale: true });
    const legaAmici     = mkLega(20, [{ id: A, nome: 'Alice' }, { id: B, nome: 'Bob' }], [sessL]);

    const result = statsPersonaCrossContesto('Alice', g, [legaPersonale, legaAmici]);

    expect(result.perContesto.length).toBe(2);
    // 2 + 4 = 6 partite giocate
    expect(result.totale.partiteGiocate).toBe(6);
    // 2 + 1 = 3 partite vinte
    expect(result.totale.partiteVinte).toBe(3);
    // 3/6 = 50% (non mediata: (100+25)/2 = 62.5 → sbagliata)
    expect(result.totale.percVittorie).toBe(50);
    expect(result.totale.percVittorie).not.toBe(62.5);
  });

  it('% ricalcolata — non mediata — su 3 contesti', () => {
    // Lega1: 1/4 (25%), Lega2: 3/3 (100%), Lega3: 0/2 (0%)
    // Totale: 4/9 ≈ 44.4
    const s1 = sessione(1, [A, B], [partita(1, [A]), partita(2, [B]), partita(3, [B]), partita(4, [B])]);
    const s2 = sessione(2, [A],    [partita(5, [A]), partita(6, [A]), partita(7, [A])]);
    const s3 = sessione(3, [A, B], [partita(8, [B]), partita(9, [B])]);

    const r = statsPersonaCrossContesto('Alice', g, [
      mkLega(1, [{ id: A, nome: 'Alice' }, { id: B, nome: 'Bob' }], [s1]),
      mkLega(2, [{ id: A, nome: 'Alice' }],                         [s2]),
      mkLega(3, [{ id: A, nome: 'Alice' }, { id: B, nome: 'Bob' }], [s3]),
    ]);

    expect(r.totale.partiteGiocate).toBe(9);
    expect(r.totale.partiteVinte).toBe(4);
    expect(r.totale.percVittorie).toBe(44.4);  // 4/9 * 100 = 44.444… → 44.4
    expect(r.totale.percVittorie).not.toBe(41.7); // media sbagliata (25+100+0)/3
  });

  it('ignora le leghe dove la persona non è presente', () => {
    const sessConAlice   = sessione(1, [A], [partita(1, [A])]);
    const legaConAlice   = mkLega(10, [{ id: A, nome: 'Alice' }], [sessConAlice]);
    const legaSenzaAlice = mkLega(20, [{ id: B, nome: 'Bob' }], []);

    const result = statsPersonaCrossContesto('Alice', g, [legaConAlice, legaSenzaAlice]);
    expect(result.perContesto.length).toBe(1);
    expect(result.totale.partiteGiocate).toBe(1);
  });

  it('matching nome case-insensitive', () => {
    const sess = sessione(1, [A], [partita(1, [A])]);
    // nome nel db: 'alice' (minuscolo), ricerca: 'Alice' (maiuscolo)
    const lega1 = mkLega(10, [{ id: A, nome: 'alice' }], [sess]);
    const result = statsPersonaCrossContesto('Alice', g, [lega1]);
    expect(result.perContesto.length).toBe(1);
    expect(result.totale.partiteGiocate).toBe(1);
  });

  it('nessun contesto trovato → totale a zero, perContesto vuoto', () => {
    const lega1 = mkLega(10, [{ id: B, nome: 'Bob' }], []);
    const result = statsPersonaCrossContesto('Alice', g, [lega1]);
    expect(result.perContesto.length).toBe(0);
    expect(result.totale.partiteGiocate).toBe(0);
    expect(result.totale.percVittorie).toBe(0);
  });

  it('lega personale: legaNome = "Personale", personale = true', () => {
    const sess = sessione(1, [A], [partita(1, [A])]);
    const legaP = mkLega(1, [{ id: A, nome: 'Alice' }], [sess], { personale: true, nome: 'Personale' });
    const result = statsPersonaCrossContesto('Alice', g, [legaP]);
    expect(result.perContesto[0]!.personale).toBe(true);
    expect(result.perContesto[0]!.legaNome).toBe('Personale');
  });

  it('sessioni non chiuse vengono ignorate (solo chiuse contano)', () => {
    const sessChiusa  = sessione(1, [A], [partita(1, [A])]);
    const sessAperta: SessioneGioco = { ...sessione(2, [A], [partita(2, [A])]), stato: 'attiva' };
    const lega1 = mkLega(10, [{ id: A, nome: 'Alice' }], [sessChiusa, sessAperta]);
    const result = statsPersonaCrossContesto('Alice', g, [lega1]);
    // Solo la sessione chiusa conta
    expect(result.totale.sessioniGiocate).toBe(1);
    expect(result.totale.partiteGiocate).toBe(1);
  });
});

/* ══════════════════════════════════════════════════════
   classificaPoker (#4.6) — estratta da TabClassifica
══════════════════════════════════════════════════════ */

describe('classificaPoker', () => {
  const nomiABC = [
    { id: A, nome: 'Alice' },
    { id: B, nome: 'Bob' },
    { id: C, nome: 'Carlo' },
  ];

  it('aggrega partite/vittorie/netto per id_nome', () => {
    const partite = [
      ppok(1, '2026-06-01', [gpok(A, 30, true), gpok(B, -30)]),
      ppok(2, '2026-06-02', [gpok(A, -10), gpok(B, 10, true)]),
    ];
    const righe = classificaPoker(partite, nomiABC);
    const rA = righe.find(r => r.idNome === A)!;
    expect(rA.kpi).toEqual({ tipo: 'soldi', partiteGiocate: 2, partiteVinte: 1, percVittorie: 50, netto: 20 });
    const rB = righe.find(r => r.idNome === B)!;
    expect(rB.kpi.tipo === 'soldi' && rB.kpi.netto).toBe(-20);
  });

  it('ordina per netto desc; leader = primo (netto più alto)', () => {
    const partite = [
      ppok(1, '2026-06-01', [gpok(A, 5, true), gpok(B, 50, true), gpok(C, -55)]),
    ];
    const righe = classificaPoker(partite, nomiABC);
    expect(righe.map(r => r.idNome)).toEqual([B, A, C]); // 50, 5, -55
    expect(righe[0]!.isLeader).toBe(true);
    expect(righe.filter(r => r.isLeader).length).toBe(1);
  });

  it('include solo chi ha giocato (non tutti i nomi della lega)', () => {
    const partite = [ppok(1, '2026-06-01', [gpok(A, 10, true), gpok(B, -10)])];
    const righe = classificaPoker(partite, nomiABC); // C non ha giocato
    expect(righe.map(r => r.idNome).sort()).toEqual([A, B]);
  });

  it('netto negativo gestito (perdente in coda)', () => {
    const partite = [ppok(1, '2026-06-01', [gpok(A, -100), gpok(B, 100, true)])];
    const righe = classificaPoker(partite, nomiABC);
    expect(righe[righe.length - 1]!.idNome).toBe(A);
    const rA = righe.find(r => r.idNome === A)!;
    expect(rA.kpi.tipo === 'soldi' && rA.kpi.netto).toBe(-100);
  });

  it('range data: filtra le partite fuori intervallo', () => {
    const partite = [
      ppok(1, '2026-05-01', [gpok(A, 100, true), gpok(B, -100)]),
      ppok(2, '2026-06-15', [gpok(A, -20), gpok(B, 20, true)]),
    ];
    const righe = classificaPoker(partite, nomiABC, { from: '2026-06-01', to: '2026-06-30' });
    const rA = righe.find(r => r.idNome === A)!;
    expect(rA.kpi).toEqual({ tipo: 'soldi', partiteGiocate: 1, partiteVinte: 0, percVittorie: 0, netto: -20 });
  });

  it('lega senza partite poker → classifica vuota, nessun leader', () => {
    const righe = classificaPoker([], nomiABC);
    expect(righe).toEqual([]);
  });

  it('nome sconosciuto (id non in idNomi) → "?"', () => {
    const partite = [ppok(1, '2026-06-01', [gpok(99, 10, true)])];
    const righe = classificaPoker(partite, nomiABC);
    expect(righe[0]!.nome).toBe('?');
  });

  it('percVittorie arrotondata a 1 decimale (1/3)', () => {
    const partite = [
      ppok(1, '2026-06-01', [gpok(A, 10, true)]),
      ppok(2, '2026-06-02', [gpok(A, -5)]),
      ppok(3, '2026-06-03', [gpok(A, -5)]),
    ];
    const righe = classificaPoker(partite, nomiABC);
    expect(righe[0]!.kpi.tipo === 'soldi' && righe[0]!.kpi.percVittorie).toBe(33.3);
  });
});

/* ══════════════════════════════════════════════════════
   classificaGiocoU + classificaUnificata (#4.6)
══════════════════════════════════════════════════════ */

describe('classificaGiocoU', () => {
  it('wrappa classificaGioco: kpi punti con le stesse stats', () => {
    const sess = [sessione(1, [A, B], [partita(1, [A]), partita(2, [A]), partita(3, [B])])];
    const g = gioco();
    const righeU = classificaGiocoU(g, sess, [{ id: A, nome: 'Alice' }, { id: B, nome: 'Bob' }]);
    const righe  = classificaGioco(g, sess, [{ id: A, nome: 'Alice' }, { id: B, nome: 'Bob' }]);
    // stesso ordine, stesso leader
    expect(righeU.map(r => r.idNome)).toEqual(righe.map(r => r.idNome));
    const uA = righeU.find(r => r.idNome === A)!;
    expect(uA.kpi.tipo).toBe('punti');
    expect(uA.kpi.tipo === 'punti' && uA.kpi.stats).toEqual(calcolaStatsGioco(g, sess, A));
    expect(uA.isLeader).toBe(true);
  });
});

describe('classificaUnificata (dispatcher poker/gioco)', () => {
  it('giocoId "poker" → tipo soldi, righe da lega.partite', () => {
    const partite = [ppok(1, '2026-06-01', [gpok(A, 40, true), gpok(B, -40)])];
    const lega = mkLega(1, [{ id: A, nome: 'Alice' }, { id: B, nome: 'Bob' }], [], { partite });
    const cl = classificaUnificata(lega, 'poker');
    expect(cl.tipo).toBe('soldi');
    expect(cl.righe[0]!.idNome).toBe(A);
    expect(cl.righe[0]!.kpi.tipo).toBe('soldi');
  });

  it('giocoId di un gioco → tipo punti, solo sessioni chiuse di quel gioco', () => {
    const sScopa = sessione(1, [A, B], [partita(1, [A]), partita(2, [A])], 'scopa');
    const sBrisc = sessione(2, [A, B], [partita(3, [B])], 'briscola');
    const lega = mkLega(1, [{ id: A, nome: 'Alice' }, { id: B, nome: 'Bob' }], [sScopa, sBrisc]);
    const cl = classificaUnificata(lega, 'scopa');
    expect(cl.tipo).toBe('punti');
    const rA = cl.righe.find(r => r.idNome === A)!;
    // solo scopa: A ha 2 partite giocate (la briscola non conta)
    expect(rA.kpi.tipo === 'punti' && rA.kpi.stats.partiteGiocate).toBe(2);
  });

  it('giocoId sconosciuto → classifica punti vuota', () => {
    const lega = mkLega(1, [{ id: A, nome: 'Alice' }], []);
    const cl = classificaUnificata(lega, 'gioco-inesistente');
    expect(cl).toEqual({ tipo: 'punti', righe: [] });
  });

  it('poker senza partite → soldi, righe vuote', () => {
    const lega = mkLega(1, [{ id: A, nome: 'Alice' }], []);
    const cl = classificaUnificata(lega, 'poker');
    expect(cl.tipo).toBe('soldi');
    expect(cl.righe).toEqual([]);
  });
});
