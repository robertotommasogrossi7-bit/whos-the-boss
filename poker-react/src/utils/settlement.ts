import type { Ricarica } from '../types';

/* ══════════════════════════════════════════════════════
   SETTLEMENT CASH — calcolo puro chiusura cash game
   Implementa SETTLEMENT_SPEC.md §4 (grandezze) e §7 (algoritmo).
   Nessuna dipendenza da React: input = giocatori entrati,
   output = lista di trasferimenti.
══════════════════════════════════════════════════════ */

/** Arrotonda a 2 decimali. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Tolleranza per i confronti in euro (residui di arrotondamento, §10). */
const EPS = 0.005;

/** Dati grezzi di un giocatore entrato — input del calcolo. */
export interface GiocatoreCashInput {
  id_nome: number;
  entrata: number;
  entrata_pagata: boolean;
  ricariche: Ricarica[];
  fiche: number;
}

/** Grandezze §4 calcolate per un giocatore entrato. */
export interface GiocatoreCashCalc {
  id_nome: number;
  entrata: number;
  ricaricheTot: number;
  dovuto: number;    // entrata + somma(ricariche.importo)
  versato: number;   // (entrata_pagata ? entrata : 0) + somma(ricariche pagate)
  mancante: number;  // dovuto − versato (≥ 0)
  fiche: number;
  netto: number;     // fiche − dovuto: il risultato vero del giocatore
}

/** Un trasferimento di contante: `from` versa `importo` a `to`. */
export interface Trasferimento {
  from: number;
  to: number;
  importo: number;
}

/** Risultato completo del settlement cash. */
export interface SettlementCash {
  giocatori: GiocatoreCashCalc[];
  trasferimenti: Trasferimento[];
  /** Somma dei netti: dovrebbe essere 0 (§5). Se ≠ 0 le fiche sono
   *  state contate male — si segnala ma non si blocca (§9). */
  sbilancio: number;
}

/** Calcola le grandezze §4 di un singolo giocatore entrato. */
export function calcolaGrandezze(g: GiocatoreCashInput): GiocatoreCashCalc {
  const ricaricheTot    = g.ricariche.reduce((a, r) => a + r.importo, 0);
  const ricarichePagate = g.ricariche.reduce((a, r) => a + (r.pagata ? r.importo : 0), 0);
  const dovuto   = round2(g.entrata + ricaricheTot);
  const versato  = round2((g.entrata_pagata ? g.entrata : 0) + ricarichePagate);
  const mancante = round2(Math.max(0, dovuto - versato));
  const netto    = round2(g.fiche - dovuto);
  return {
    id_nome:      g.id_nome,
    entrata:      g.entrata,
    ricaricheTot: round2(ricaricheTot),
    dovuto,
    versato,
    mancante,
    fiche:        g.fiche,
    netto,
  };
}

/**
 * Calcola il settlement cash di una serata (§7).
 * Il chiamante passa solo i giocatori ENTRATI.
 */
export function calcolaSettlementCash(input: GiocatoreCashInput[]): SettlementCash {
  const giocatori = input.map(calcolaGrandezze);

  /* Passi 1-3 — per ogni giocatore: surplus / bisogno / debito, con
     auto-compensazione (il debito elide prima il proprio bisogno), poi
     fonte e destinazione. Dopo il Passo 2 un giocatore è o fonte o
     destinazione, mai entrambe. */
  const fonti:        { id: number; rem: number }[] = [];
  const destinazioni: { id: number; rem: number }[] = [];
  for (const g of giocatori) {
    const surplus  = Math.max(0, g.versato - g.fiche);
    const bisogno0 = Math.max(0, g.fiche - g.versato);
    const debito0  = g.mancante;
    const conguaglio = Math.min(debito0, bisogno0);   // Passo 2
    const debito  = debito0  - conguaglio;
    const bisogno = bisogno0 - conguaglio;
    const fonte        = round2(surplus + debito);     // Passo 3
    const destinazione = round2(bisogno);
    if (fonte > EPS)        fonti.push({ id: g.id_nome, rem: fonte });
    if (destinazione > EPS) destinazioni.push({ id: g.id_nome, rem: destinazione });
  }

  /* Passo 4 — abbinamento greedy: fonti e destinazioni dal più grande al
     più grande; ogni prelievo genera un trasferimento. */
  fonti.sort((a, b) => b.rem - a.rem);
  destinazioni.sort((a, b) => b.rem - a.rem);

  const trasferimenti: Trasferimento[] = [];
  let fi = 0;
  for (const d of destinazioni) {
    while (d.rem > EPS && fi < fonti.length) {
      const f = fonti[fi]!;
      if (f.rem <= EPS) { fi++; continue; }
      const importo = round2(Math.min(d.rem, f.rem));
      trasferimenti.push({ from: f.id, to: d.id, importo });
      d.rem = round2(d.rem - importo);
      f.rem = round2(f.rem - importo);
      if (f.rem <= EPS) fi++;
    }
  }

  const sbilancio = round2(giocatori.reduce((a, g) => a + g.netto, 0));
  return { giocatori, trasferimenti, sbilancio };
}
