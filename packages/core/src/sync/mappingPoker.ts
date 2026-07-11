/* ══════════════════════════════════════════════════════
   MAPPING locale ↔ cloud — POKER (R7.2c)
   Schema cloud da supabase/migrations/20260701150100_r7_poker.sql (R7.1b).
   Stesse convenzioni di mapping.ts (vedi commento lì): *ToCloudRow lancia
   senza uid, *FromCloudRow richiede un'entità locale esistente.
══════════════════════════════════════════════════════ */

import type { GiocatorePartita, Partita, PagamentoEffettuato, PagamentoRicevuto, Ricarica, Settlement } from '../types';

export interface PartitaPokerCloudRow {
  id: string;
  lega_id: string;
  local_id: number | null;
  buy_in: number | null;
  data: string | null;
  ora_inizio: string | null;
  ora_fine: string | null;
  modalita: 'cash' | 'torneo';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export function partitaToCloudRow(
  p: Partita,
  legaUid: string,
): Omit<PartitaPokerCloudRow, 'created_at' | 'updated_at'> {
  if (!p.uid) throw new Error('partitaToCloudRow: Partita senza uid (generaUid() non chiamato alla creazione)');
  return {
    id: p.uid,
    lega_id: legaUid,
    local_id: p.id,
    buy_in: p.buy_in,
    data: p.data || null,
    ora_inizio: p.ora_inizio || null,
    ora_fine: p.ora_fine || null,
    modalita: p.modalita,
    deleted_at: p.deletedAt ?? null,
  };
}

/** Riga cloud → Partita locale aggiornata (per il pull). Non tocca
    `giocatori`/`settlements` (tabelle a parte, mappate dalle loro funzioni). */
export function partitaFromCloudRow(row: PartitaPokerCloudRow, base: Partita): Partita {
  return {
    ...base,
    buy_in: row.buy_in ?? base.buy_in,
    data: row.data ?? base.data,
    ora_inizio: row.ora_inizio ?? base.ora_inizio,
    ora_fine: row.ora_fine ?? base.ora_fine,
    modalita: row.modalita,
    uid: row.id,
    syncUpdatedAt: row.updated_at,
    lastSyncedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export interface GiocatorePartitaCloudRow {
  id: string;
  partita_id: string;
  giocatore_id: string;
  entrate: number | null;
  ricarica_fatta: number | null;
  extra: number | null;
  soldi_ricevuti: number | null;
  fiches_finali: number | null;
  netto_finale: number | null;
  premio: number | null;
  vincitore: boolean;
  buy_in_pagato: boolean;
  extra_pagato: boolean;
  add_on_fatto: boolean;
  add_on_pagato: boolean;
  posizione_finale: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** GiocatorePartita locale → riga cloud. `partitaUid`/`giocatoreUid` sono
    risolti da chi chiama (la Partita e il NomeGiocatore genitori — questo
    tipo ha solo `id_nome`, non un riferimento diretto). Le liste
    ricariche/pagamenti_* NON sono qui: vanno in poker_movimenti (ledger
    append-only a parte, vedi sotto). */
export function giocatorePartitaToCloudRow(
  gp: GiocatorePartita,
  partitaUid: string,
  giocatoreUid: string,
): Omit<GiocatorePartitaCloudRow, 'created_at' | 'updated_at'> {
  if (!gp.uid) throw new Error('giocatorePartitaToCloudRow: GiocatorePartita senza uid (generaUid() non chiamato alla creazione)');
  return {
    id: gp.uid,
    partita_id: partitaUid,
    giocatore_id: giocatoreUid,
    entrate: gp.entrate,
    ricarica_fatta: gp.ricarica_fatta,
    extra: gp.extra,
    soldi_ricevuti: gp.soldi_ricevuti,
    fiches_finali: gp.fiches_finali,
    netto_finale: gp.netto_finale,
    premio: gp.premio,
    vincitore: gp.vincitore,
    buy_in_pagato: gp.buy_in_pagato,
    extra_pagato: gp.extra_pagato,
    add_on_fatto: gp.add_on_fatto,
    add_on_pagato: gp.add_on_pagato,
    posizione_finale: gp.posizione_finale,
    deleted_at: gp.deletedAt ?? null,
  };
}

/** Riga cloud → GiocatorePartita locale aggiornato. Non tocca ricariche/
    pagamenti_* (arrivano da movimentiFromCloudRows, vedi sotto). */
export function giocatorePartitaFromCloudRow(row: GiocatorePartitaCloudRow, base: GiocatorePartita): GiocatorePartita {
  return {
    ...base,
    entrate: row.entrate ?? base.entrate,
    ricarica_fatta: row.ricarica_fatta ?? base.ricarica_fatta,
    extra: row.extra ?? base.extra,
    soldi_ricevuti: row.soldi_ricevuti ?? base.soldi_ricevuti,
    fiches_finali: row.fiches_finali ?? base.fiches_finali,
    netto_finale: row.netto_finale ?? base.netto_finale,
    premio: row.premio ?? base.premio,
    vincitore: row.vincitore,
    buy_in_pagato: row.buy_in_pagato,
    extra_pagato: row.extra_pagato,
    add_on_fatto: row.add_on_fatto,
    add_on_pagato: row.add_on_pagato,
    posizione_finale: row.posizione_finale,
    uid: row.id,
    syncUpdatedAt: row.updated_at,
    lastSyncedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

/* ── poker_movimenti (ledger append-only: SOLO insert, mai update/delete) ──
   Le liste locali (ricariche/pagamenti_effettuati/pagamenti_ricevuti) non
   hanno una loro identità stabile (niente uid per-elemento): sono
   ricostruite per intero dal pull, mai identificate riga-per-riga come le
   altre tabelle. Per questo qui c'è SOLO la direzione cloud→locale (pull):
   la direzione locale→cloud (push) richiede una strategia di dedup
   "cosa ho già mandato" che è responsabilità dell'orchestratore (R7.4),
   non di una funzione di mapping pura — vedi R7_SCHEMA.md sez. R7.2c. */
export interface PokerMovimentoCloudRow {
  id: string;
  partita_giocatore_id: string;
  tipo: 'ricarica' | 'pagamento_effettuato' | 'pagamento_ricevuto';
  importo: number;
  pagata: boolean | null;
  contro_giocatore_id: string | null;
  ordine: number | null;
  created_at: string;
  updated_at: string;
}

export interface MovimentiRicostruiti {
  ricariche: Ricarica[];
  pagamenti_effettuati: PagamentoEffettuato[];
  pagamenti_ricevuti: PagamentoRicevuto[];
}

/** Ricostruisce le 3 liste locali da un elenco di righe poker_movimenti
    (di UN solo giocatore-partita), ordinate per `ordine`. `risolviIdNome`
    traduce l'uid della controparte (contro_giocatore_id) nell'id_nome
    locale — serve solo per i pagamenti (from/to), non per le ricariche. */
export function movimentiFromCloudRows(
  rows: PokerMovimentoCloudRow[],
  risolviIdNome: (giocatoreUid: string) => number,
): MovimentiRicostruiti {
  const ordinate = [...rows].sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0));
  const ricariche: Ricarica[] = [];
  const pagamenti_effettuati: PagamentoEffettuato[] = [];
  const pagamenti_ricevuti: PagamentoRicevuto[] = [];
  for (const r of ordinate) {
    if (r.tipo === 'ricarica') {
      ricariche.push({ importo: r.importo, pagata: r.pagata ?? undefined });
    } else if (r.tipo === 'pagamento_effettuato') {
      if (!r.contro_giocatore_id) continue; // riga inconsistente, non dovrebbe capitare (F1: tollera, non crashare)
      pagamenti_effettuati.push({ to: risolviIdNome(r.contro_giocatore_id), amount: r.importo, pagato: r.pagata ?? undefined });
    } else if (r.tipo === 'pagamento_ricevuto') {
      if (!r.contro_giocatore_id) continue;
      pagamenti_ricevuti.push({ from: risolviIdNome(r.contro_giocatore_id), amount: r.importo });
    }
  }
  return { ricariche, pagamenti_effettuati, pagamenti_ricevuti };
}

export interface SettlementCloudRow {
  id: string;
  partita_id: string;
  from_giocatore_id: string;
  to_giocatore_id: string;
  amount: number;
  pagato: boolean;
  ordine: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Settlement locale → riga cloud. `partitaUid` dal genitore; `fromUid`/
    `toUid` risolti da chi chiama (Settlement ha solo from/to = id_nome). */
export function settlementToCloudRow(
  s: Settlement,
  partitaUid: string,
  fromUid: string,
  toUid: string,
  ordine?: number,
): Omit<SettlementCloudRow, 'created_at' | 'updated_at'> {
  if (!s.uid) throw new Error('settlementToCloudRow: Settlement senza uid (generaUid() non chiamato alla creazione)');
  return {
    id: s.uid,
    partita_id: partitaUid,
    from_giocatore_id: fromUid,
    to_giocatore_id: toUid,
    amount: s.amount,
    pagato: s.pagato,
    ordine: ordine ?? null,
    deleted_at: s.deletedAt ?? null,
  };
}

/** Riga cloud → Settlement locale. `risolviIdNome` traduce l'uid del
    giocatore nell'id_nome locale (from/to sono id_nome, non uid). */
export function settlementFromCloudRow(
  row: SettlementCloudRow,
  base: Settlement,
  risolviIdNome: (giocatoreUid: string) => number,
): Settlement {
  return {
    ...base,
    from: risolviIdNome(row.from_giocatore_id),
    to: risolviIdNome(row.to_giocatore_id),
    amount: row.amount,
    pagato: row.pagato,
    uid: row.id,
    syncUpdatedAt: row.updated_at,
    lastSyncedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}
