/* ══════════════════════════════════════════════════════
   TOMBSTONE — le righe cancellate (R7.4a-3)
   ─────────────────────────────────────────────────────
   Dal delta-sync in poi una cancellazione NON toglie più la riga dall'array:
   la marca `deletedAt` e la lascia lì (tombstone). Il motivo: una riga sparita
   fisicamente è indistinguibile da una riga mai esistita — il push non avrebbe
   nulla da spedire e sull'altro telefono il dato resterebbe vivo per sempre.
   La lapide è ciò che si spedisce. Mai purgata (I4/I9).

   Conseguenza: **tutto ciò che CALCOLA deve saltare i tombstonati**. Il filtro
   sta in UN punto solo — qui, chiamato dagli utils che calcolano (S4-R3) — e
   NON nelle viste: venti filtri sparsi nella UI sono venti occasioni di
   dimenticarne uno, e un giocatore cancellato che ricompare in classifica è
   esattamente il genere di bug che non si nota finché non lo vede un amico.

   ⚠️ NON si filtra dove si assegnano gli ID (`prossimoIdPartita`): un id di una
   riga tombstonata non va MAI riciclato, o il nuovo record collide col morto.
   E nemmeno nei lookup per id (`getNome`): una riga storica che punta a un
   giocatore cancellato deve poter ancora mostrare il suo nome.
══════════════════════════════════════════════════════ */

import type { ConSync } from '../sync/merge';
import type { Partita, SessioneGioco } from '../types';
import { touchSync } from './uid';

/** Riga che può essere stata cancellata. */
export interface Cancellabile {
  deletedAt?: string;
}

/** True se la riga NON è stata cancellata. */
export function èVivo(x: Cancellabile): boolean {
  return !x.deletedAt;
}

/**
 * Le sole righe vive. Accetta `undefined` (i campi multigioco della Lega sono
 * opzionali) e ritorna sempre un array → si incatena senza `?? []` sparsi.
 */
export function soloVive<T extends Cancellabile>(xs: T[] | undefined): T[] {
  return (xs ?? []).filter(èVivo);
}

/**
 * Marca una riga come cancellata: `deletedAt = now` + `touchSync` (così il
 * push la spedisce — un tombstone che resta pulito non partirebbe mai, e
 * sull'altro device la riga resterebbe viva). Idempotente sul timestamp: se
 * era già tombstonata NON si aggiorna la data (evita un re-push a vuoto).
 * `now` iniettato (le funzioni di core non leggono l'orologio → testabili).
 */
export function tombstona<T extends ConSync & Cancellabile>(riga: T, now: string): T {
  if (riga.deletedAt) return riga;
  return touchSync({ ...riga, deletedAt: now });
}

/* ── Cascade (S4-R4) ────────────────────────────────────────────────────────
   Cancellare un padre deve cancellare i figli nello STESSO gesto: un figlio
   che sopravvive al padre è un orfano che il pull rimaterializzerebbe (C4), e
   soprattutto i suoi soldi continuerebbero a contare. Il cascade tombstona
   tutto il sottoalbero con lo stesso `now`, così una riga già morta prima
   (deletedAt precedente) mantiene la sua data e non viene ri-spinta.
   I MOVIMENTI del ledger non si tombstonano: sono append-only (I5), non hanno
   deletedAt — spariscono col loro `partita_poker_giocatori` padre. */

/** Tombstona una Partita poker + tutti i suoi giocatori e settlement. */
export function tombstonaPartita(p: Partita, now: string): Partita {
  const t = tombstona(p, now);
  return {
    ...t,
    giocatori: p.giocatori.map((g) => tombstona(g, now)),
    settlements: p.settlements.map((s) => tombstona(s, now)),
  };
}

/** Tombstona una SessioneGioco + tutte le sue partite. */
export function tombstonaSessioneGioco(s: SessioneGioco, now: string): SessioneGioco {
  const t = tombstona(s, now);
  return { ...t, partite: s.partite.map((p) => tombstona(p, now)) };
}
