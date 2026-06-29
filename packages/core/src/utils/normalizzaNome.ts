/* ══════════════════════════════════════════════════════
   NORMALIZZAZIONE NOMI — util condivisa (#4.5)
   ─────────────────────────────────────────────────────
   Match tollerante tra nomi: "  giuliA " ≈ "Giulia" ≈ "GIULIA".
   Nata qui per agganciare lo username di login al record del
   Personale; riusata da #4.7 ovunque serva un filtro/confronto
   per nome (classifica/storico). Definita UNA volta sola.
══════════════════════════════════════════════════════ */

/** Normalizza un nome per confronti: trim → minuscolo → spazi collassati →
    accenti/diacritici rimossi (NFD). Pura. */
export function normalizzaNome(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/** True se `nome` corrisponde all'utente loggato (match per nome normalizzato).
    False se lo username è nullo/vuoto. "sei tu" è SEMPRE calcolato così: niente
    flag salvato nei dati (robusto alla beta, dove lo username può cambiare). */
export function èSeiTu(nome: string, username?: string | null): boolean {
  if (!username) return false;
  const u = normalizzaNome(username);
  if (!u) return false;
  return normalizzaNome(nome) === u;
}
