/* ══════════════════════════════════════════════════════
   SOLDI D'USCITA (cash + torneo) — logica pura. USCITA_CASH_SPEC §3.
   Un giocatore esce dal tavolo a metà: quanto incassa o versa.
══════════════════════════════════════════════════════ */

/**
 * Saldo d'uscita di un giocatore (formula UNICA cash + torneo, USCITA_CASH_SPEC §3).
 * Forma generale sempre valida (anche con overpay): `valore − dovuto + versato`.
 *  - `valore`  = quanto porta via: fiche contate (cash) o premio della posizione (torneo);
 *  - `dovuto`  = quanto doveva mettere: entrata + Σricariche (cash) / buy_in + Σrebuy + add_on (torneo);
 *  - `versato` = quanto ha realmente messo nel piatto.
 * Risultato: `> 0` incassa, `< 0` versa |x|, `= 0` pari.
 * Con `versato ≤ dovuto` equivale a `valore − mancante` (mancante = dovuto − versato).
 */
export function saldoUscita(valore: number, dovuto: number, versato: number): number {
  return valore - dovuto + versato;
}

/** P&L informativo (statistiche, non cassa): `valore − dovuto` (= saldoUscita − versato). */
export function nettoUscita(valore: number, dovuto: number): number {
  return valore - dovuto;
}

/** Quota non ancora versata: `max(0, dovuto − versato)`. */
export function mancante(dovuto: number, versato: number): number {
  return Math.max(0, dovuto - versato);
}
