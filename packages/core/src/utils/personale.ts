import type { Lega, NomeGiocatore, User } from '../types';
import { normalizzaNome } from './normalizzaNome';
import { soloVive } from './tombstone';
import { nuovoSync, touchSync } from './uid';

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
    ...nuovoSync(),
  };
}

/** True se il record è il giocatore dell'account loggato (identità per ACCOUNT,
    R6). Rimpiazza il vecchio match-per-nome `èSeiTu`: robusto a nomi uguali,
    soprannomi e login demo. Pura. */
export function èSeiTuRecord(rec: Pick<NomeGiocatore, 'accountId'>, accountId?: string | null): boolean {
  return !!accountId && rec.accountId === accountId;
}

/** Reclama (per nome) un record ESISTENTE non ancora legato a un account, in
    QUALSIASI lega (Personale o normale) — senza crearne di nuovi (a
    differenza di `assicuraGiocatorePersonale`, che sul Personale può anche
    creare). Migrazione one-shot (R6-B2/M7): le leghe create prima di R6.5
    avevano il creatore/i partecipanti come record "liberi" (nome = username o
    displayName, nessun `accountId`) — al primo login post-R6 li aggancia.
    Match su username O displayName normalizzati (M8: evita di creare un
    doppione quando il tuo displayName combacia con un ospite preesistente ma
    lo username no). Pura e idempotente: se già reclamato o nessun match →
    stesso riferimento (lega invariata). */
export function reclamaGiocatoreInLega(lega: Lega, user: User): Lega {
  const accountId = user.id;
  if (!accountId) return lega;
  // soloVive (R7.4a-3): un record cancellato non vale come "già reclamato" e
  // non si reclama — altrimenti il tuo giocatore resterebbe una lapide.
  if (soloVive(lega.nomi).some(n => n.accountId === accountId)) return lega; // già reclamato

  const uUsername = normalizzaNome(user.username);
  const uDisplay = user.displayName ? normalizzaNome(user.displayName) : '';
  const idx = lega.nomi.findIndex(n => {
    if (n.accountId || n.deletedAt) return false;
    const nn = normalizzaNome(n.nome);
    return (!!uUsername && nn === uUsername) || (!!uDisplay && nn === uDisplay);
  });
  if (idx < 0) return lega;

  // touchSync: agganciare l'accountId CAMBIA la riga `giocatori` nel cloud
  // (colonna account_id) — senza, la rivendicazione resterebbe solo su questo
  // device e gli altri continuerebbero a vedere un ospite libero (R7.4a-2).
  return { ...lega, nomi: lega.nomi.map((n, i) => (i === idx ? touchSync({ ...n, accountId }) : n)) };
}

/** Assicura che nel Personale esista IL giocatore dell'utente loggato (R6).
    Identità ancorata all'`accountId`, non più al nome. Pura e idempotente:
    1) se un record ha già il tuo accountId → invariato;
    2) se un record "libero" combacia per nome (username o displayName) → lo
       RECLAMA (`reclamaGiocatoreInLega`, migra il vecchio record #4.5);
    3) altrimenti crea un nuovo record (nome = displayName o username) — SOLO
       il Personale può creare; le leghe normali (`reclamaGiocatoreInLega`) no.
    Fallback difensivo per il login demo senza `id`: comportamento per-nome. */
export function assicuraGiocatorePersonale(personale: Lega, user: User): Lega {
  const accountId = user.id;
  const display = (user.displayName?.trim() || user.username).trim();

  if (!accountId) {
    // niente account (demo): dedup per nome come prima
    const u = normalizzaNome(user.username);
    if (!u || soloVive(personale.nomi).some(n => normalizzaNome(n.nome) === u)) return personale;
    return {
      ...personale,
      nomi: [...personale.nomi, { id: personale._nid, nome: display, ...nuovoSync() }],
      _nid: personale._nid + 1,
    };
  }

  // 1) già reclamato da questo account
  if (soloVive(personale.nomi).some(n => n.accountId === accountId)) return personale;

  // 2) reclama un record libero che combacia per nome (migrazione del vecchio)
  const reclamata = reclamaGiocatoreInLega(personale, user);
  if (reclamata !== personale) return reclamata;

  // 3) nuovo record dell'account
  return {
    ...personale,
    nomi: [...personale.nomi, { id: personale._nid, nome: display, accountId, ...nuovoSync() }],
    _nid: personale._nid + 1,
  };
}

/** Id "bloccati-inclusi" nel picker partecipanti (R6): nel Personale l'id del
    giocatore dell'account (sempre incluso, non deselezionabile); in una lega
    normale nessuno. Pura: dipende da lega + accountId. */
export function idBloccatiInclusi(lega: Lega, accountId?: string | null): number[] {
  if (!lega.personale || !accountId) return [];
  const rec = soloVive(lega.nomi).find(n => èSeiTuRecord(n, accountId));
  return rec ? [rec.id] : [];
}
