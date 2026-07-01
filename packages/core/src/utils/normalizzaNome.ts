/* ══════════════════════════════════════════════════════
   NORMALIZZAZIONE NOMI — util condivisa (#4.5)
   ─────────────────────────────────────────────────────
   Match tollerante tra nomi: "  giuliA " ≈ "Giulia" ≈ "GIULIA".
   Nata qui per agganciare lo username di login al record del
   Personale; riusata da #4.7 ovunque serva un filtro/confronto
   per nome (classifica/storico). Definita UNA volta sola.
══════════════════════════════════════════════════════ */

/** Normalizza un nome per confronti: trim → minuscolo → spazi collassati →
    accenti/diacritici rimossi (NFD). Pura. Usata per il match/dedup dei nomi
    (guest, filtri classifica/storico). L'identità dell'utente loggato NON si
    calcola più dal nome: si ancora all'account (`èSeiTuRecord` in personale.ts). */
export function normalizzaNome(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}
