import type { GiocatoreSessione } from '../types';

/* Timer tempo-gioco per-persona (TAVOLO_LIVE_SPEC §4) — logica pura.
   Traccia quanto un giocatore è stato al tavolo, sommando le sedute. */

type ConTimer = Pick<GiocatoreSessione, 'seduto_da_ms' | 'tempo_gioco_ms'>;

/** Millisecondi totali "vissuti" al tavolo a un dato istante: accumulato +
    seduta in corso (se seduto). Mai negativo (protegge da clock skew). */
export function tempoGiocoMs(g: ConTimer, nowMs: number): number {
  const inCorso = g.seduto_da_ms ? Math.max(0, nowMs - g.seduto_da_ms) : 0;
  return (g.tempo_gioco_ms ?? 0) + inCorso;
}
