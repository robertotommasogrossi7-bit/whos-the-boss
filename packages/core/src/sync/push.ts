/* ══════════════════════════════════════════════════════
   PUSH — payload delle righe locali da spedire (R7.4c, parte pura)
   ─────────────────────────────────────────────────────
   Il simmetrico dell'import, ma incrementale e per-LEGA (P.2: una RPC per lega,
   una transazione — S9). Tre differenze rispetto all'import:

     1. **solo le righe DIRTY** (`haCambiamentiLocaliNonSincronizzati`): un edit
        locale non ancora confermato dal server. L'import manda tutto; il push
        manda il delta.
     2. **pegno per-riga** `expected_updated_at` = il `lastSyncedAt` locale. La
        RPC lo usa per il CAS: UPDATE solo se `updated_at` sul server combacia,
        altrimenti abort → il client ri-pulla e riprova (P.2). `null` = riga mai
        confermata → INSERT (`ON CONFLICT (id) DO NOTHING`, retry-safe S10).
        L'ordine pull→push garantisce che una riga già sul server abbia sempre
        `lastSyncedAt` (la semina il pull, regola del pegno) → il null è davvero
        "nuova", mai un pegno perso.
     3. **il ledger va per intero con la sua gp**: i movimenti (append-only, I5)
        non hanno dirty-flag; si spediscono con la loro `partita_poker_giocatori`
        quando questa entra nel payload (una gp esistente ha già i suoi movimenti
        sul server, e dopo la chiusura non ne acquisisce più — verificato sullo
        store). INSERT `ON CONFLICT DO NOTHING`, PRIMA dei settlement (parent-first).

   Lo stato LIVE (`sessioneAttiva`/`serate_bg`) non entra (fuori scope R7).
══════════════════════════════════════════════════════ */

import type { Lega } from '../types';
import { mappaGiocatori } from './idMap';
import { haCambiamentiLocaliNonSincronizzati } from './merge';
import {
  giocatoreToCloudRow, giocoLegaToCloudRow, legaToCloudRow,
  type GiocatoreCloudRow, type GiocoLegaCloudRow, type LegaCloudRow,
} from './mapping';
import {
  partitaGiocoToCloudRow, serataToCloudRow, sessioneGiocoToCloudRow,
  type PartitaGiocoCloudRow, type SerataCloudRow, type SessioneGiocoCloudRow,
} from './mappingMultigioco';
import {
  giocatorePartitaToCloudRow, movimentiToCloudRows, partitaToCloudRow, settlementToCloudRow,
  type GiocatorePartitaCloudRow, type PartitaPokerCloudRow, type PokerMovimentoCloudRow,
  type SettlementCloudRow,
} from './mappingPoker';
import { ponteToUids } from './mappingPonti';

/** Versione del formato del payload push (P.8.2/S18: la RPC rifiuta le ignote). */
export const PUSH_VERSION = 1;

type Riga<T> = Omit<T, 'created_at' | 'updated_at'>;
/** Riga sincronizzata da pushare: i campi cloud + il pegno del CAS. */
type RigaPush<T> = Riga<T> & { expected_updated_at: string | null };
interface RigaPonte { giocatore_id: string }

export interface PayloadPush {
  version: number;
  lega_uid: string;  // la RPC è per-lega (P.2)
  // ── ordine parent-first (I-R2) ──
  leghe: RigaPush<LegaCloudRow>[];   // 0 o 1 (la lega stessa, se dirty)
  giocatori: RigaPush<GiocatoreCloudRow>[];
  giochi_lega: RigaPush<GiocoLegaCloudRow>[];
  partite_poker: RigaPush<PartitaPokerCloudRow>[];
  partita_poker_giocatori: RigaPush<GiocatorePartitaCloudRow>[];
  poker_movimenti: Riga<PokerMovimentoCloudRow>[];  // append-only: nessun pegno
  settlements: RigaPush<SettlementCloudRow>[];
  serate: RigaPush<SerataCloudRow>[];
  serata_partecipanti: (RigaPonte & { serata_id: string })[];
  sessioni_gioco: RigaPush<SessioneGiocoCloudRow>[];
  sessione_gioco_partecipanti: (RigaPonte & { sessione_gioco_id: string })[];
  partite_gioco: RigaPush<PartitaGiocoCloudRow>[];
  partita_gioco_vincitori: (RigaPonte & { partita_gioco_id: string })[];
  partita_gioco_partecipanti: (RigaPonte & { partita_gioco_id: string })[];
}

const pegno = (e: { lastSyncedAt?: string }): string | null => e.lastSyncedAt ?? null;

/**
 * Costruisce il payload push di UNA lega: le sole righe dirty + i movimenti
 * delle gp incluse. I ponti (partecipanti/vincitori) seguono il loro genitore
 * SOLO se il genitore è dirty (nuovo o modificato) — un genitore non-dirty ha
 * già i suoi ponti sul server, immutabili dopo la chiusura.
 * Ritorna il payload sempre; usa `haRigheDaPushare` per sapere se c'è delta.
 */
export function costruisciPayloadPush(lega: Lega, ownerId: string): PayloadPush {
  const p: PayloadPush = {
    version: PUSH_VERSION,
    lega_uid: lega.uid ?? '',
    leghe: [], giocatori: [], giochi_lega: [],
    partite_poker: [], partita_poker_giocatori: [], poker_movimenti: [], settlements: [],
    serate: [], serata_partecipanti: [],
    sessioni_gioco: [], sessione_gioco_partecipanti: [],
    partite_gioco: [], partita_gioco_vincitori: [], partita_gioco_partecipanti: [],
  };
  const legaUid = lega.uid;
  if (!legaUid) return p; // lega senza uid: non sincronizzabile (nuovoSync manca)

  const { toUid } = mappaGiocatori(lega.nomi);
  const risolviUid = (idNome: number): string => {
    const u = toUid.get(idNome);
    if (!u) throw new Error(`costruisciPayloadPush: giocatore id ${idNome} senza uid nella lega "${lega.nome}"`);
    return u;
  };

  if (haCambiamentiLocaliNonSincronizzati(lega)) {
    p.leghe.push({ ...legaToCloudRow(lega, ownerId), expected_updated_at: pegno(lega) });
  }

  for (const n of lega.nomi) {
    if (haCambiamentiLocaliNonSincronizzati(n)) {
      p.giocatori.push({ ...giocatoreToCloudRow(n, legaUid), expected_updated_at: pegno(n) });
    }
  }
  for (const g of lega.giochi ?? []) {
    if (haCambiamentiLocaliNonSincronizzati(g)) {
      p.giochi_lega.push({ ...giocoLegaToCloudRow(g, legaUid), expected_updated_at: pegno(g) });
    }
  }

  // ── poker ──
  for (const pt of lega.partite) {
    const partitaUid = pt.uid;
    if (haCambiamentiLocaliNonSincronizzati(pt) && partitaUid) {
      p.partite_poker.push({ ...partitaToCloudRow(pt, legaUid), expected_updated_at: pegno(pt) });
    }
    for (const gp of pt.giocatori) {
      if (!haCambiamentiLocaliNonSincronizzati(gp) || !gp.uid || !partitaUid) continue;
      p.partita_poker_giocatori.push({
        ...giocatorePartitaToCloudRow(gp, partitaUid, risolviUid(gp.id_nome)),
        expected_updated_at: pegno(gp),
      });
      // i movimenti seguono la gp inclusa (append-only, nessun pegno)
      p.poker_movimenti.push(...movimentiToCloudRows(gp, gp.uid, risolviUid));
    }
    for (let i = 0; i < pt.settlements.length; i++) {
      const s = pt.settlements[i];
      if (!haCambiamentiLocaliNonSincronizzati(s) || !s.uid || !partitaUid) continue;
      p.settlements.push({
        ...settlementToCloudRow(s, partitaUid, risolviUid(s.from), risolviUid(s.to), i),
        expected_updated_at: pegno(s),
      });
    }
  }

  // ── multigioco ──
  const giochiUid = new Map((lega.giochi ?? []).map((g) => [g.id, g.uid]));
  const serateUid = new Map((lega.serate ?? []).map((s) => [s.id, s.uid]));

  for (const s of lega.serate ?? []) {
    if (!haCambiamentiLocaliNonSincronizzati(s) || !s.uid) continue;
    p.serate.push({ ...serataToCloudRow(s, legaUid), expected_updated_at: pegno(s) });
    ponteToUids(s.partecipanti, risolviUid).forEach((giocatore_id) => {
      p.serata_partecipanti.push({ serata_id: s.uid!, giocatore_id });
    });
  }

  for (const s of lega.sessioniGioco ?? []) {
    if (!haCambiamentiLocaliNonSincronizzati(s) || !s.uid) continue;
    p.sessioni_gioco.push({
      ...sessioneGiocoToCloudRow(
        s, legaUid,
        giochiUid.get(s.giocoId) ?? null,
        s.serataId !== undefined ? serateUid.get(s.serataId) : undefined,
      ),
      expected_updated_at: pegno(s),
    });
    ponteToUids(s.partecipanti, risolviUid).forEach((giocatore_id) => {
      p.sessione_gioco_partecipanti.push({ sessione_gioco_id: s.uid!, giocatore_id });
    });
    for (const pg of s.partite) {
      if (!haCambiamentiLocaliNonSincronizzati(pg) || !pg.uid) continue;
      p.partite_gioco.push({ ...partitaGiocoToCloudRow(pg, s.uid), expected_updated_at: pegno(pg) });
      ponteToUids(pg.vincitori, risolviUid).forEach((giocatore_id) => {
        p.partita_gioco_vincitori.push({ partita_gioco_id: pg.uid!, giocatore_id });
      });
      pg.partecipanti?.forEach((idNome) => {
        p.partita_gioco_partecipanti.push({ partita_gioco_id: pg.uid!, giocatore_id: risolviUid(idNome) });
      });
    }
  }

  return p;
}

/** True se il payload ha almeno una riga da spedire (l'orchestratore salta il
    push se non c'è delta, evitando una RPC a vuoto). I ponti non contano da
    soli: seguono sempre un genitore che è già in una tabella-riga. */
export function haRigheDaPushare(p: PayloadPush): boolean {
  return (
    p.leghe.length + p.giocatori.length + p.giochi_lega.length +
    p.partite_poker.length + p.partita_poker_giocatori.length + p.poker_movimenti.length +
    p.settlements.length + p.serate.length + p.sessioni_gioco.length + p.partite_gioco.length
  ) > 0;
}

/* ── Stamp post-push (contratto O.3 + P.8.2) ──────────────────────────────
   La RPC ritorna, per ogni riga applicata, il suo `updated_at` server-side. Lo
   stamp marca quelle righe come confermate: `syncedRev` = la revisione spedita
   (non l'attuale: un edit avvenuto DURANTE il push ha syncRev più alta e resta
   dirty da solo) e `lastSyncedAt` = l'`updated_at` ritornato (il nuovo pegno,
   così il prossimo push CAS combacia — P.8.2, niente dipendenza dal pull). */

export interface RigaApplicata {
  syncRev: number;      // la revisione spedita (dal payload, non ri-letta dal db)
  updated_at: string;   // il nuovo updated_at server-side
}

/** Le revisioni spedite: uid → syncRev, prese dal db battezzato usato per il
    payload, PRIMA della RPC (come per l'import). I movimenti non hanno syncRev. */
export function revisioniPush(lega: Lega): Map<string, number> {
  const out = new Map<string, number>();
  const add = (e: { uid?: string; syncRev?: number }) => { if (e.uid) out.set(e.uid, e.syncRev ?? 0); };
  add(lega);
  lega.nomi.forEach(add);
  lega.giochi?.forEach(add);
  lega.serate?.forEach(add);
  lega.sessioniGioco?.forEach((s) => { add(s); s.partite.forEach(add); });
  for (const pt of lega.partite) {
    add(pt);
    pt.giocatori.forEach(add);
    pt.settlements.forEach(add);
  }
  return out;
}

/**
 * Applica lo stamp a una lega dopo un push confermato. `applicate` = uid → il
 * suo `updated_at` server-side ritornato dalla RPC. Marca `syncedRev` = revisione
 * spedita (da `revisioniPush`, presa PRIMA della RPC) e `lastSyncedAt` = updated_at
 * ritornato, SOLO per gli uid confermati. Le altre righe restano com'erano.
 */
export function applicaStampPush(
  lega: Lega,
  spedite: Map<string, number>,
  applicate: Map<string, string>,
): Lega {
  const stampa = <T extends { uid?: string; syncedRev?: number; lastSyncedAt?: string }>(e: T): T => {
    const updatedAt = e.uid ? applicate.get(e.uid) : undefined;
    const rev = e.uid ? spedite.get(e.uid) : undefined;
    if (updatedAt === undefined || rev === undefined) return e;
    return { ...e, syncedRev: rev, lastSyncedAt: updatedAt };
  };
  return {
    ...stampa(lega),
    nomi: lega.nomi.map(stampa),
    giochi: lega.giochi?.map(stampa),
    serate: lega.serate?.map(stampa),
    sessioniGioco: lega.sessioniGioco?.map((s) => ({ ...stampa(s), partite: s.partite.map(stampa) })),
    partite: lega.partite.map((pt) => ({
      ...stampa(pt),
      giocatori: pt.giocatori.map(stampa),
      settlements: pt.settlements.map(stampa),
    })),
  };
}
