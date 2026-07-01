import type { Lega, SerataMulti, SessioneGioco } from '../types';
import { partecipantiPartita } from './sessioneGioco';

/* ══════════════════════════════════════════════════════
   SERATA MULTI-GIOCO (R4) — logica pura.
   Una serata raggruppa più SessioneGioco (una per gioco), legate via
   `SessioneGioco.serataId`. Ogni gioco resta un record a sé; qui si calcola
   solo l'AGGREGATO della serata (nessun dato duplicato).
══════════════════════════════════════════════════════ */

/** Le sessioni-gioco che appartengono a una serata multi-gioco. */
export function sessioniDiSerata(lega: Lega, serataId: number): SessioneGioco[] {
  return (lega.sessioniGioco ?? []).filter((s) => s.serataId === serataId);
}

/** La serata multi-gioco per id (o undefined). */
export function trovaSerata(lega: Lega, serataId: number): SerataMulti | undefined {
  return (lega.serate ?? []).find((s) => s.id === serataId);
}

export interface PuntoSerata {
  idNome: number;
  punti: number;
}

/**
 * Classifica della serata multi-gioco (SPEC R4). Somma su TUTTE le partite di
 * TUTTI i giochi della serata:
 *  - vittoria  → +1 a OGNI vincitore (coppie: +1 a testa);
 *  - patta     → +0.5 a ogni partecipante di quella partita.
 * Ordinata per punti desc (a parità, per idNome per stabilità). Pura.
 */
export function classificaSerata(lega: Lega, serataId: number): PuntoSerata[] {
  const punti = new Map<number, number>();
  const add = (id: number, p: number) => punti.set(id, (punti.get(id) ?? 0) + p);

  // Semina i partecipanti invitati a 0, così la classifica è completa (anche chi
  // non ha punti); poi somma. Chi entra solo a metà serata compare via `add`.
  for (const id of trovaSerata(lega, serataId)?.partecipanti ?? []) punti.set(id, 0);

  for (const sess of sessioniDiSerata(lega, serataId)) {
    for (const partita of sess.partite) {
      if (partita.pareggio) {
        for (const id of partecipantiPartita(sess, partita)) add(id, 0.5);
      } else {
        for (const w of partita.vincitori) add(w, 1);
      }
    }
  }

  return [...punti.entries()]
    .map(([idNome, p]) => ({ idNome, punti: p }))
    .sort((a, b) => b.punti - a.punti || a.idNome - b.idNome);
}

/**
 * Vincitore/i della serata: chi ha il punteggio ASSOLUTO più alto (>0).
 * A parità in testa → più vincitori (la serata non ha un unico vincitore).
 * Serata senza punti (nessuna partita decisa) → nessun vincitore.
 */
export function vincitoriSerata(lega: Lega, serataId: number): number[] {
  const cl = classificaSerata(lega, serataId);
  const max = cl[0]?.punti ?? 0;
  if (max <= 0) return [];
  return cl.filter((r) => r.punti === max).map((r) => r.idNome);
}
