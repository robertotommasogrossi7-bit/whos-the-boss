import { useMemo } from 'react';
import type { GiocatoreSessione, Sessione } from '../types';
import { calcolaGrandezze } from '../utils/settlement';

/* ══════════════════════════════════════════════════════
   COMPUTE LIVE — cash game: grandezze §4 per ogni giocatore
   Derivato da computeLive() in session-cash.js
══════════════════════════════════════════════════════ */

export interface LiveGiocatore extends GiocatoreSessione {
  ricaricheTot: number;
  dovuto:   number;   // entrata + somma(ricariche)
  versato:  number;   // quanto ha già messo nella Cassa
  mancante: number;   // dovuto − versato
  netto:    number;   // fiche − dovuto
}

export interface LiveResult {
  arr:      LiveGiocatore[];
  leaderId: number | null;
}

/** Pure function — calcola le grandezze §4 di ogni giocatore cash. */
export function computeLive(sess: Sessione | undefined): LiveResult {
  if (!sess) return { arr: [], leaderId: null };
  const arr: LiveGiocatore[] = sess.giocatori.map(g => {
    if (!g.entrato) {
      return { ...g, ricaricheTot: 0, dovuto: 0, versato: 0, mancante: 0, netto: 0 };
    }
    const gr = calcolaGrandezze({
      id_nome:        g.id_nome,
      entrata:        g.entrata,
      entrata_pagata: g.entrata_pagata,
      ricariche:      g.ricariche,
      fiche:          g.fiches_finali || 0,
    });
    return {
      ...g,
      ricaricheTot: gr.ricaricheTot,
      dovuto:       gr.dovuto,
      versato:      gr.versato,
      mancante:     gr.mancante,
      netto:        gr.netto,
    };
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

/** Hook — memoized wrapper di computeLive. Accetta sess undefined così
 *  da poter essere chiamato prima di un eventuale return condizionale
 *  (rispetta le Rules of Hooks). */
export function useComputeLive(sess: Sessione | undefined): LiveResult {
  return useMemo(() => computeLive(sess), [sess]);
}
