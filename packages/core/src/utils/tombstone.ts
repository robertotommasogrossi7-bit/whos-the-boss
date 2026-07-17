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
