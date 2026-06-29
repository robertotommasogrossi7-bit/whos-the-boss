import { useMemo } from 'react';
import type { GiocatoreSessione, Sessione } from '@whos-the-boss/core';

/* ══════════════════════════════════════════════════════
   COMPUTE LIVE — cash game calcolatrice
   Nuovo modello §4 SETTLEMENT_SPEC:
     dovuto  = g.entrata + sum(ricariche.importo)
     versato = g.versato (numero libero)
     mancante = max(0, dovuto - versato)
     netto   = fiche - dovuto
══════════════════════════════════════════════════════ */

export interface LiveGiocatore extends GiocatoreSessione {
  ricaricheTot: number;
  dovuto:       number; // entrata + ricariche
  mancante:     number; // max(0, dovuto - versato)
  fiches:       number; // alias fiches_finali
  ricevuti:     number; // alias soldi_ricevuti (legacy, non usato nel nuovo modello)
  netto:        number; // fiche - dovuto
}

export interface LiveResult {
  arr:      LiveGiocatore[];
  leaderId: number | null;
}

/** Pure function — calcola netto/mancante per ogni giocatore cash (nuovo modello). */
export function computeLive(sess: Sessione | undefined): LiveResult {
  if (!sess) return { arr: [], leaderId: null };
  const arr: LiveGiocatore[] = sess.giocatori.map(g => {
    const ricaricheTot = g.ricariche.reduce((a, r) => a + r.importo, 0);
    const entrata      = g.entrata ?? sess.buy_in;
    const dovuto       = g.entrato ? Math.round((entrata + ricaricheTot) * 100) / 100 : 0;
    const versato      = g.versato ?? 0;
    const mancante     = g.entrato ? Math.max(0, Math.round((dovuto - versato) * 100) / 100) : 0;
    const fiches       = g.fiches_finali || 0;
    const ricevuti     = g.soldi_ricevuti || 0;
    const netto        = g.entrato ? Math.round((fiches - dovuto) * 100) / 100 : 0;
    return { ...g, ricaricheTot, dovuto, mancante, fiches, ricevuti, netto };
  });

  let leaderId: number | null = null;
  const entrati = arr.filter(c => c.entrato);
  if (entrati.length) {
    const max = Math.max(...entrati.map(c => c.netto));
    if (max >= 0) {
      const w = entrati.find(c => c.netto === max);
      if (w) leaderId = w.id_nome;
    }
  }

  return { arr, leaderId };
}

/** Hook — memoized wrapper di computeLive. */
export function useComputeLive(sess: Sessione | undefined): LiveResult {
  return useMemo(() => computeLive(sess), [sess]);
}
