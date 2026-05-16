import { useMemo } from 'react';
import type { GiocatoreSessione, Sessione } from '../types';

/* ══════════════════════════════════════════════════════
   COMPUTE LIVE — cash game calcolatrice
   Derivato da computeLive() in session-cash.js
══════════════════════════════════════════════════════ */

export interface LiveGiocatore extends GiocatoreSessione {
  ricaricheTot:   number;
  versato:        number;   // totale dovuto (buy-in + extra + ricariche)
  versato_pagato: number;   // solo la parte già pagata
  mancante:       number;   // versato - versato_pagato
  fiches:         number;   // alias di fiches_finali
  ricevuti:       number;   // alias di soldi_ricevuti
  netto:          number;   // fiches + ricevuti - versato
}

export interface LiveResult {
  arr:      LiveGiocatore[];
  leaderId: number | null;
}

/** Pure function — calcola netto/mancante per ogni giocatore cash. */
export function computeLive(sess: Sessione): LiveResult {
  const arr: LiveGiocatore[] = sess.giocatori.map(g => {
    const ricaricheTot    = g.ricariche.reduce((a, r) => a + r.importo, 0);
    const ricarichePagate = g.ricariche.reduce((a, r) => a + (r.pagata ? r.importo : 0), 0);
    const buyInDovuto     = g.entrato ? sess.buy_in : 0;
    const buyInPagatoAmt  = (g.entrato && g.buy_in_pagato) ? sess.buy_in : 0;
    const extraDovuto     = g.entrato ? (g.extra_amt || 0) : 0;
    const extraPagatoAmt  = (g.entrato && g.extra_amt > 0 && g.extra_pagato) ? g.extra_amt : 0;
    const versato         = buyInDovuto + extraDovuto + ricaricheTot;
    const versato_pagato  = buyInPagatoAmt + extraPagatoAmt + ricarichePagate;
    const mancante        = Math.max(0, versato - versato_pagato);
    const fiches          = g.fiches_finali || 0;
    const ricevuti        = g.soldi_ricevuti || 0;
    const netto           = g.entrato ? (fiches + ricevuti - versato) : 0;
    return { ...g, ricaricheTot, versato, versato_pagato, mancante, fiches, ricevuti, netto };
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
export function useComputeLive(sess: Sessione): LiveResult {
  return useMemo(() => computeLive(sess), [sess]);
}
