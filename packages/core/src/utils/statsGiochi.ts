import type { GiocoLega, SessioneGioco } from '../types';

/* ══════════════════════════════════════════════════════
   STATISTICHE GIOCHI (Card Tracker M1) — funzioni pure
   Derivate da sessioni/partite CHIUSE (SPEC §7). Il poker NON passa di qui:
   ha il suo modello e la sua classifica (vedi giochi.ts / SPEC §8).
══════════════════════════════════════════════════════ */

export interface StatsGiocatore {
  sessioniGiocate: number;
  sessioniVinte: number;
  sessioniPerse: number;
  sessioniPareggio: number;
  partiteGiocate: number;
  partiteVinte: number;
  partitePerse: number;
  partitePareggio: number;
  percVittorie: number; // 0..100, sulle partite giocate, arrotondata a 1 decimale
}

/**
 * Statistiche di un giocatore per un singolo gioco (SPEC §7).
 * @param gioco    il gioco (id per filtrare, pareggioComeVittoria per la %)
 * @param sessioni sessioni del gioco (idealmente già solo 'chiusa'); ri-filtrate per robustezza
 * @param idNome   id del giocatore
 */
export function calcolaStatsGioco(
  gioco: GiocoLega,
  sessioni: SessioneGioco[],
  idNome: number,
): StatsGiocatore {
  const s: StatsGiocatore = {
    sessioniGiocate: 0, sessioniVinte: 0, sessioniPerse: 0, sessioniPareggio: 0,
    partiteGiocate: 0, partiteVinte: 0, partitePerse: 0, partitePareggio: 0,
    percVittorie: 0,
  };

  for (const sess of sessioni) {
    // SPEC §7: solo sessioni CHIUSE del gioco a cui idNome partecipa.
    if (sess.stato !== 'chiusa') continue;
    if (sess.giocoId !== gioco.id) continue;
    if (!sess.partecipanti.includes(idNome)) continue;

    s.sessioniGiocate++;

    // Partite vinte da ciascun partecipante (serve per l'esito sessione).
    const vittorie = new Map<number, number>();
    for (const p of sess.partecipanti) vittorie.set(p, 0);

    for (const partita of sess.partite) {
      for (const w of partita.vincitori) {
        const cur = vittorie.get(w);
        if (cur !== undefined) vittorie.set(w, cur + 1);
      }

      // Partecipanti della partita: override se presente, sennò quelli della sessione.
      const partecipanti = partita.partecipanti ?? sess.partecipanti;
      if (!partecipanti.includes(idNome)) continue; // idNome non ha giocato questa partita

      s.partiteGiocate++;
      if (partita.vincitori.includes(idNome)) s.partiteVinte++;
      else if (partita.pareggio)              s.partitePareggio++;
      else                                    s.partitePerse++;
    }

    // Esito sessione per idNome (SPEC §7).
    const conteggi = Array.from(vittorie.values());
    const max = Math.max(...conteggi);
    const mie = vittorie.get(idNome) ?? 0;
    const leader = conteggi.filter(v => v === max).length;

    if (sess.esitoPareggio)               s.sessioniPareggio++; // pareggio dichiarato
    else if (mie === max && leader === 1) s.sessioniVinte++;    // primo da solo
    else if (mie === max)                 s.sessioniPareggio++; // parità in testa
    else                                  s.sessioniPerse++;
  }

  // % vittorie: il pareggio conta come vittoria solo se pareggioComeVittoria (SPEC §7).
  const num = s.partiteVinte + (gioco.pareggioComeVittoria ? s.partitePareggio : 0);
  s.percVittorie = s.partiteGiocate === 0
    ? 0
    : Math.round((num / s.partiteGiocate) * 1000) / 10;

  return s;
}
