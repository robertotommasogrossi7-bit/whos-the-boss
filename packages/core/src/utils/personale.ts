import type { Lega } from '../types';
import { normalizzaNome, èSeiTu } from './normalizzaNome';

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
    serate: [],
    _serataId: 1,
  };
}

/** Assicura che nel Personale esista un giocatore con `username` (#4.5).
    Pura e idempotente: se un nome che normalizza uguale c'è già → lega
    invariata (è già "te", niente doppione); altrimenti aggiunge il record
    e bumpa `_nid`. Chiamata al login/register. */
export function assicuraGiocatorePersonale(personale: Lega, username: string): Lega {
  const u = normalizzaNome(username);
  if (!u) return personale; // username vuoto → no-op difensivo
  const esiste = personale.nomi.some(n => normalizzaNome(n.nome) === u);
  if (esiste) return personale;
  return {
    ...personale,
    nomi: [...personale.nomi, { id: personale._nid, nome: username.trim() }],
    _nid: personale._nid + 1,
  };
}

/** Id "bloccati-inclusi" nel picker partecipanti (#4.5): nel Personale l'id
    "sei tu" (sempre incluso, non deselezionabile); in una lega normale nessuno.
    Pura: dipende solo da lega + username. */
export function idBloccatiInclusi(lega: Lega, username?: string | null): number[] {
  if (!lega.personale || !username) return [];
  const rec = lega.nomi.find(n => èSeiTu(n.nome, username));
  return rec ? [rec.id] : [];
}
