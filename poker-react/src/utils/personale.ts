import type { Lega } from '../types';

/* ══════════════════════════════════════════════════════
   LEGA "PERSONALE" (Card Tracker §2)
   Il Personale è realizzato come una Lega speciale (personale:true,
   sempre presente, non cancellabile): riusa tutta la macchina
   sessioni/partite/statistiche. I giocatori sono i "guest" (lega.nomi).
══════════════════════════════════════════════════════ */

/** Costruisce la lega "Personale" coi default multigioco già impostati. */
export function creaLegaPersonale(id: number): Lega {
  return {
    id,
    nome: 'Personale',
    foto: '',
    nomi: [],
    partite: [],
    sessioneAttiva: undefined,
    serate_bg: [],
    _nid: 1,
    _pid: 1,
    personale: true,
    sessioniGioco: [],
    _sgid: 1,
  };
}
