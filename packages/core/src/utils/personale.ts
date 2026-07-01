import type { Lega, NomeGiocatore, User } from '../types';
import { normalizzaNome } from './normalizzaNome';

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

/** True se il record è il giocatore dell'account loggato (identità per ACCOUNT,
    R6). Rimpiazza il vecchio match-per-nome `èSeiTu`: robusto a nomi uguali,
    soprannomi e login demo. Pura. */
export function èSeiTuRecord(rec: Pick<NomeGiocatore, 'accountId'>, accountId?: string | null): boolean {
  return !!accountId && rec.accountId === accountId;
}

/** Assicura che nel Personale esista IL giocatore dell'utente loggato (R6).
    Identità ancorata all'`accountId`, non più al nome. Pura e idempotente:
    1) se un record ha già il tuo accountId → invariato;
    2) se un record "libero" (senza accountId) combacia per nome normalizzato
       col tuo username → lo RECLAMA (timbra accountId) — migra il vecchio
       record #4.5 creato per nome, una volta sola;
    3) altrimenti crea un nuovo record (nome = displayName o username).
    Fallback difensivo per il login demo senza `id`: comportamento per-nome. */
export function assicuraGiocatorePersonale(personale: Lega, user: User): Lega {
  const accountId = user.id;
  const display = (user.displayName?.trim() || user.username).trim();
  const u = normalizzaNome(user.username);

  if (!accountId) {
    // niente account (demo): dedup per nome come prima
    if (!u || personale.nomi.some(n => normalizzaNome(n.nome) === u)) return personale;
    return { ...personale, nomi: [...personale.nomi, { id: personale._nid, nome: display }], _nid: personale._nid + 1 };
  }

  // 1) già reclamato da questo account
  if (personale.nomi.some(n => n.accountId === accountId)) return personale;

  // 2) reclama un record libero che combacia per nome (migrazione del vecchio)
  const idx = personale.nomi.findIndex(n => !n.accountId && !!u && normalizzaNome(n.nome) === u);
  if (idx >= 0) {
    return { ...personale, nomi: personale.nomi.map((n, i) => (i === idx ? { ...n, accountId } : n)) };
  }

  // 3) nuovo record dell'account
  return {
    ...personale,
    nomi: [...personale.nomi, { id: personale._nid, nome: display, accountId }],
    _nid: personale._nid + 1,
  };
}

/** Id "bloccati-inclusi" nel picker partecipanti (R6): nel Personale l'id del
    giocatore dell'account (sempre incluso, non deselezionabile); in una lega
    normale nessuno. Pura: dipende da lega + accountId. */
export function idBloccatiInclusi(lega: Lega, accountId?: string | null): number[] {
  if (!lega.personale || !accountId) return [];
  const rec = lega.nomi.find(n => èSeiTuRecord(n, accountId));
  return rec ? [rec.id] : [];
}
