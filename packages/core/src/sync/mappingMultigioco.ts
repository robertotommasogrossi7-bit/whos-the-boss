/* ══════════════════════════════════════════════════════
   MAPPING locale ↔ cloud — MULTIGIOCO (R7.2c)
   Schema cloud da supabase/migrations/20260701150200_r7_multigioco.sql (R7.1c).
   Stesse convenzioni di mapping.ts. I ponti M:N (partecipanti/vincitori)
   sono in mappingPonti.ts: qui solo i campi di primo livello.
══════════════════════════════════════════════════════ */

import type { PartitaGioco, SerataMulti, SessioneGioco } from '../types';

export interface SerataCloudRow {
  id: string;
  lega_id: string;
  local_id: number | null;
  data: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export function serataToCloudRow(
  s: SerataMulti,
  legaUid: string,
): Omit<SerataCloudRow, 'created_at' | 'updated_at'> {
  if (!s.uid) throw new Error('serataToCloudRow: SerataMulti senza uid (generaUid() non chiamato alla creazione)');
  return {
    id: s.uid,
    lega_id: legaUid,
    local_id: s.id,
    data: s.data || null,
    deleted_at: s.deletedAt ?? null,
  };
}

/** Non tocca `partecipanti` (ponte serata_partecipanti, mappingPonti.ts). */
export function serataFromCloudRow(row: SerataCloudRow, base: SerataMulti): SerataMulti {
  return {
    ...base,
    data: row.data ?? base.data,
    uid: row.id,
    syncUpdatedAt: row.updated_at,
    lastSyncedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export interface SessioneGiocoCloudRow {
  id: string;
  lega_id: string;
  local_id: number | null;
  /** G1: QUALE gioco — la chiave locale `SessioneGioco.giocoId` ('scopa',
      'custom-<ts>'). È l'identità, ed è l'unica cosa che serve per ricostruire
      la sessione su un altro device. `null` solo per le righe scritte prima
      della migration #9 (in pratica: nessuna). */
  gioco_key: string | null;
  /** Collegamento alla riga di override in `giochi_lega`, se esiste (M5).
      NON è l'identità del gioco: vedi R7_SCHEMA sez. Q. */
  gioco_lega_id: string | null;
  data: string | null;
  stato: 'pre' | 'attiva' | 'chiusa' | null;
  ora_inizio: string | null;
  ora_fine: string | null;
  esito_pareggio: boolean;
  serata_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** `gioco_key` (= `s.giocoId`) porta l'identità del gioco: si scrive SEMPRE.
    `giocoLegaUid` è il collegamento all'eventuale riga di override in
    `giochi_lega` — lo risolve chi chiama, ed è `null` finché M5 non crea quei
    record (il caso normale oggi). Prima di G1 esisteva solo quest'ultimo, e il
    cloud non sapeva mai quale gioco fosse stato giocato (R7_SCHEMA sez. Q).
    `serataUid` opzionale, stesso discorso per `serataId`. */
export function sessioneGiocoToCloudRow(
  s: SessioneGioco,
  legaUid: string,
  giocoLegaUid: string | null,
  serataUid?: string,
): Omit<SessioneGiocoCloudRow, 'created_at' | 'updated_at'> {
  if (!s.uid) throw new Error('sessioneGiocoToCloudRow: SessioneGioco senza uid (generaUid() non chiamato alla creazione)');
  return {
    id: s.uid,
    lega_id: legaUid,
    local_id: s.id,
    gioco_key: s.giocoId,
    gioco_lega_id: giocoLegaUid,
    data: s.data || null,
    stato: s.stato,
    ora_inizio: s.ora_inizio || null,
    ora_fine: s.ora_fine || null,
    esito_pareggio: s.esitoPareggio,
    serata_id: serataUid ?? null,
    deleted_at: s.deletedAt ?? null,
  };
}

/** Il `giocoId` arriva diretto da `gioco_key`: nessuna traduzione, nessuna
    dipendenza dall'override. (Prima di G1 si risaliva al gioco dalla FK
    `gioco_lega_id`, con ripiego su `base` — che per una riga materializzata
    ex-novo su un 2° device NON esiste: il gioco si sarebbe perso. Vedi
    R7_SCHEMA sez. Q.) Il `??` copre solo le righe scritte prima della #9.
    `risolviSerataId` traduce l'uid serata nell'id locale (int). Non tocca
    `partecipanti`/`partite` (ponte + tabella figlia, altre funzioni). */
export function sessioneGiocoFromCloudRow(
  row: SessioneGiocoCloudRow,
  base: SessioneGioco,
  risolviSerataId: (serataUid: string) => number | undefined,
): SessioneGioco {
  return {
    ...base,
    giocoId: row.gioco_key ?? base.giocoId,
    data: row.data ?? base.data,
    stato: row.stato ?? base.stato,
    ora_inizio: row.ora_inizio ?? base.ora_inizio,
    ora_fine: row.ora_fine ?? base.ora_fine,
    esitoPareggio: row.esito_pareggio,
    serataId: row.serata_id ? risolviSerataId(row.serata_id) : undefined,
    uid: row.id,
    syncUpdatedAt: row.updated_at,
    lastSyncedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export interface PartitaGiocoCloudRow {
  id: string;
  sessione_gioco_id: string;
  local_id: number | null;
  ora_inizio: string | null;
  ora_fine: string | null;
  pareggio: boolean;
  nome_libero: string | null;
  ordine: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** `sessioneGiocoUid` dal genitore. `ordine`: il locale non ha un campo
    esplicito, ma `p.id` è già un intero progressivo per-sessione — lo si
    riusa come ordine (nessun dato nuovo da inventare). Non tocca
    vincitori/partecipanti (ponti, mappingPonti.ts). */
export function partitaGiocoToCloudRow(
  p: PartitaGioco,
  sessioneGiocoUid: string,
): Omit<PartitaGiocoCloudRow, 'created_at' | 'updated_at'> {
  if (!p.uid) throw new Error('partitaGiocoToCloudRow: PartitaGioco senza uid (generaUid() non chiamato alla creazione)');
  return {
    id: p.uid,
    sessione_gioco_id: sessioneGiocoUid,
    local_id: p.id,
    ora_inizio: p.ora_inizio || null,
    ora_fine: p.ora_fine || null,
    pareggio: p.pareggio,
    nome_libero: p.nomeLibero ?? null,
    ordine: p.id,
    deleted_at: p.deletedAt ?? null,
  };
}

export function partitaGiocoFromCloudRow(row: PartitaGiocoCloudRow, base: PartitaGioco): PartitaGioco {
  return {
    ...base,
    ora_inizio: row.ora_inizio ?? base.ora_inizio,
    ora_fine: row.ora_fine ?? base.ora_fine,
    pareggio: row.pareggio,
    nomeLibero: row.nome_libero ?? undefined,
    uid: row.id,
    syncUpdatedAt: row.updated_at,
    lastSyncedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}
