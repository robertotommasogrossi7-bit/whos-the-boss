/* ══════════════════════════════════════════════════════
   MAPPING locale ↔ cloud — PONTI M:N (R7.2c)
   Le 4 tabelle-ponte (serata_partecipanti, sessione_gioco_partecipanti,
   partita_gioco_vincitori, partita_gioco_partecipanti) hanno tutte la
   STESSA forma: (id del genitore, giocatore_id) — solo il nome della
   colonna FK del genitore cambia, e quello lo aggiunge chi chiama quando
   costruisce la riga da inserire (non serve saperlo qui). L'unica
   traduzione reale è id_nome locale ↔ uid del giocatore.
══════════════════════════════════════════════════════ */

/** id_nome[] locali → uid[] cloud, per un ponte M:N (partecipanti/vincitori).
    `risolviUid` è la lookup id_nome→uid (di solito da Lega.nomi). */
export function ponteToUids(idNomi: number[], risolviUid: (idNome: number) => string): string[] {
  return idNomi.map(risolviUid);
}

/** uid[] cloud → id_nome[] locali (l'inverso di ponteToUids). */
export function ponteFromUids(giocatoreUids: string[], risolviIdNome: (uid: string) => number): number[] {
  return giocatoreUids.map(risolviIdNome);
}
