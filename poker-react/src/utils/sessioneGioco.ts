import type { SessioneGioco, PartitaGioco } from '../types';

/* ══════════════════════════════════════════════════════
   SESSIONE/PARTITA GIOCO (Card Tracker M3) — funzioni pure
   Costruzione + esito del ciclo sessione/partita dei giochi comuni
   (non-poker). L'esito segue le STESSE regole di calcolaStatsGioco
   (statsGiochi.ts, SPEC §7): qui non si duplica la definizione, la si
   applica — un test di coerenza verifica che i due combacino.
   Il poker NON passa di qui (ha il suo modello).
══════════════════════════════════════════════════════ */

/** Nuova sessione programmabile (stato 'pre'). `ora` = ora programmata. */
export function nuovaSessioneGioco(
  id: number,
  giocoId: string,
  partecipanti: number[],
  data: string,
  ora: string,
): SessioneGioco {
  return {
    id,
    giocoId,
    data,
    stato: 'pre',
    ora_inizio: ora,
    ora_fine: '',
    partecipanti: [...partecipanti],
    partite: [],
    esitoPareggio: false,
  };
}

/** Prossimo id partita interno alla sessione (max+1, 1-based). */
export function prossimoIdPartita(sess: SessioneGioco): number {
  return sess.partite.reduce((m, p) => Math.max(m, p.id), 0) + 1;
}

/** Nuova partita "in corso" (ora_fine vuota finché non si chiude). */
export function nuovaPartitaGioco(id: number, ora: string): PartitaGioco {
  return { id, ora_inizio: ora, ora_fine: '', vincitori: [], pareggio: false };
}

/** Una partita è ancora in corso se non ha ora_fine. */
export function partitaInCorso(p: PartitaGioco): boolean {
  return p.ora_fine === '';
}

/** Partecipanti effettivi di una partita: override se presente, sennò
    quelli della sessione (SPEC §7 — stessa regola di calcolaStatsGioco). */
export function partecipantiPartita(sess: SessioneGioco, p: PartitaGioco): number[] {
  return p.partecipanti ?? sess.partecipanti;
}

/** Partite vinte da ciascun partecipante della sessione. Stessa logica di
    calcolaStatsGioco (conta solo i vincitori che sono tra i partecipanti). */
export function vittoriePartecipanti(sess: SessioneGioco): Map<number, number> {
  const m = new Map<number, number>();
  for (const p of sess.partecipanti) m.set(p, 0);
  for (const partita of sess.partite) {
    for (const w of partita.vincitori) {
      const cur = m.get(w);
      if (cur !== undefined) m.set(w, cur + 1);
    }
  }
  return m;
}

export interface EsitoSessione {
  vincitori: number[];            // [] se pareggio
  pareggio: boolean;
  vittorie: Map<number, number>;  // partite vinte per partecipante
}

/**
 * Esito di una sessione (SPEC §7): vince chi ha vinto più partite, da solo;
 * pareggio se c'è parità in testa OPPURE la sessione è dichiarata pareggio
 * (`esitoPareggio`). Coerente con l'esito sessione di calcolaStatsGioco
 * (sessioniVinte/Perse/Pareggio). Pensata per chiusura/anteprima: ignora i
 * dati di "chiuso" perché una partita in corso ha semplicemente 0 vittorie.
 */
export function esitoSessione(sess: SessioneGioco): EsitoSessione {
  const vittorie = vittoriePartecipanti(sess);
  const conteggi = [...vittorie.values()];
  const max = conteggi.length ? Math.max(...conteggi) : 0;
  const leaders = [...vittorie.entries()]
    .filter(([, v]) => v === max)
    .map(([id]) => id);
  const pareggio = sess.esitoPareggio || leaders.length !== 1;
  return { vincitori: pareggio ? [] : leaders, pareggio, vittorie };
}
