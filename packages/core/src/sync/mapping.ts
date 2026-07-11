/* ══════════════════════════════════════════════════════
   MAPPING locale ↔ cloud (R7.2c) — funzioni pure, una coppia per tabella
   ─────────────────────────────────────────────────────
   Schema cloud da supabase/migrations/20260701150000_r7_core.sql (R7.1a).
   Solo i campi di PRIMO LIVELLO di ogni tabella: le collezioni figlie
   (nomi/partite/... per Lega) sono altre tabelle, mappate dalle loro
   funzioni — non qui.

   *ToCloudRow: richiede che l'entità abbia già un `uid` (generato alla
   creazione, R7.2a) — se manca, chi chiama ha saltato generaUid().
   *FromCloudRow: richiede un'entità locale ESISTENTE su cui applicare i
   campi del cloud (creare una entità locale ex-novo da un pull senza
   corrispondente locale è import/R7.3, non compito di queste funzioni).
   Sia ToCloudRow che FromCloudRow sono zero-IO: solo dati dentro, dati
   fuori, così restano test-first come tutto il core.
══════════════════════════════════════════════════════ */

import type { GiocoLega, Lega, NomeGiocatore } from '../types';

export interface LegaCloudRow {
  id: string;
  owner_id: string;
  local_id: number | null;
  nome: string;
  foto: string | null;
  personale: boolean;
  mono_gioco_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface GiocatoreCloudRow {
  id: string;
  lega_id: string;
  local_id: number | null;
  nome: string;
  account_id: string | null;
  created_by_account_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Lega locale → riga cloud (per il push). `ownerId` è l'account autenticato
    corrente: non è un dato della Lega locale, arriva da fuori (sessione auth). */
export function legaToCloudRow(
  lega: Lega,
  ownerId: string,
): Omit<LegaCloudRow, 'created_at' | 'updated_at'> {
  if (!lega.uid) throw new Error('legaToCloudRow: Lega senza uid (generaUid() non chiamato alla creazione)');
  return {
    id: lega.uid,
    owner_id: ownerId,
    local_id: lega.id,
    nome: lega.nome,
    foto: lega.foto || null,
    personale: !!lega.personale,
    mono_gioco_id: lega.monoGiocoId ?? null,
    deleted_at: lega.deletedAt ?? null,
  };
}

/** Riga cloud → Lega locale aggiornata (per il pull). `base` è la Lega
    locale esistente (matchata per `uid` da chi chiama); qui si aggiornano
    SOLO i campi di primo livello + i cursori di sync, mai le collezioni
    figlie (nomi/partite/...). */
export function legaFromCloudRow(row: LegaCloudRow, base: Lega): Lega {
  return {
    ...base,
    nome: row.nome,
    foto: row.foto ?? '',
    personale: row.personale,
    monoGiocoId: row.mono_gioco_id ?? undefined,
    uid: row.id,
    syncUpdatedAt: row.updated_at,
    lastSyncedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

/** NomeGiocatore locale → riga cloud. `legaUid` è l'uid della Lega
    genitrice: non è un dato del NomeGiocatore (che vive dentro Lega.nomi),
    arriva da fuori (chi itera i giocatori di una lega). */
export function giocatoreToCloudRow(
  g: NomeGiocatore,
  legaUid: string,
): Omit<GiocatoreCloudRow, 'created_at' | 'updated_at'> {
  if (!g.uid) throw new Error('giocatoreToCloudRow: NomeGiocatore senza uid (generaUid() non chiamato alla creazione)');
  return {
    id: g.uid,
    lega_id: legaUid,
    local_id: g.id,
    nome: g.nome,
    account_id: g.accountId ?? null,
    created_by_account_id: g.createdByAccountId ?? null,
    deleted_at: g.deletedAt ?? null,
  };
}

/** Riga cloud → NomeGiocatore locale aggiornato (per il pull). */
export function giocatoreFromCloudRow(row: GiocatoreCloudRow, base: NomeGiocatore): NomeGiocatore {
  return {
    ...base,
    nome: row.nome,
    accountId: row.account_id ?? undefined,
    createdByAccountId: row.created_by_account_id ?? undefined,
    uid: row.id,
    syncUpdatedAt: row.updated_at,
    lastSyncedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export interface GiocoLegaCloudRow {
  id: string;
  lega_id: string;
  gioco_key: string;
  nome: string | null;
  preimpostato: boolean;
  foto: string | null;
  accent: string | null;
  attivo: boolean;
  pareggio_come_vittoria: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** GiocoLega locale → riga cloud. `legaUid` è l'uid della Lega genitrice.
    `id` locale (es. 'magic'/'custom-<ts>') → colonna `gioco_key` (referenziata
    da sessioni_gioco.gioco_lega_id via l'uid, non via questa chiave stringa).
    Il commento SQL suggerisce "per i preset salva solo gioco_key+attivo": qui
    si mappano comunque tutti i campi presenti (nome/accent/foto se popolati),
    l'eventuale ottimizzazione "manda meno per i preset" è responsabilità di
    chi orchestra il push (R7.4), non di questa funzione pura. */
export function giocoLegaToCloudRow(
  g: GiocoLega,
  legaUid: string,
): Omit<GiocoLegaCloudRow, 'created_at' | 'updated_at'> {
  if (!g.uid) throw new Error('giocoLegaToCloudRow: GiocoLega senza uid (generaUid() non chiamato alla creazione)');
  return {
    id: g.uid,
    lega_id: legaUid,
    gioco_key: g.id,
    nome: g.nome,
    preimpostato: g.preimpostato,
    foto: g.foto ?? null,
    accent: g.accent ?? null,
    attivo: g.attivo,
    pareggio_come_vittoria: g.pareggioComeVittoria,
    deleted_at: g.deletedAt ?? null,
  };
}

/** Riga cloud → GiocoLega locale aggiornato (per il pull). */
export function giocoLegaFromCloudRow(row: GiocoLegaCloudRow, base: GiocoLega): GiocoLega {
  return {
    ...base,
    nome: row.nome ?? base.nome,
    preimpostato: row.preimpostato,
    foto: row.foto ?? undefined,
    accent: row.accent ?? undefined,
    attivo: row.attivo,
    pareggioComeVittoria: row.pareggio_come_vittoria,
    uid: row.id,
    syncUpdatedAt: row.updated_at,
    lastSyncedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}
