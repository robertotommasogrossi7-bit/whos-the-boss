/* ══════════════════════════════════════════════════════
   PULL — applica lo snapshot del cloud al db locale (R7.4b, ciclo)
   ─────────────────────────────────────────────────────
   Il cuore del pull (P.1 passo 3): per ogni riga cloud, o si fa MERGE con la
   corrispondente locale (`mergeConPegno`, regola del pegno) o — se non esiste
   ancora localmente — si MATERIALIZZA (materializza.ts). Tutto parent-first, con
   una **idMap viva** (P.8.5): ogni entità nuova registra subito `uid → id
   locale` PRIMA di risolvere i figli, così un settlement trova sempre il
   giocatore appena materializzato.

   Zero rete e zero orologio: è una funzione pura `(db, snapshot) → db`. Chi
   scarica lo snapshot e lo scrive nello store è l'orchestratore (R7.4d).

   ⚠️ Questo file copre lega + giocatori + POKER (il percorso "soldi"). Il
   multigioco (giochi/serate/sessioni) e gli orfani ancestor-aware sono R7.4b-4.
══════════════════════════════════════════════════════ */

import type { Db, Lega, NomeGiocatore, Partita } from '../types';
import { mergeConPegno } from './merge';
import { giocatoreFromCloudRow, legaFromCloudRow, type GiocatoreCloudRow, type GiocoLegaCloudRow, type LegaCloudRow } from './mapping';
import type { PartitaGiocoCloudRow, SerataCloudRow, SessioneGiocoCloudRow } from './mappingMultigioco';
import {
  giocatorePartitaFromCloudRow, movimentiFromCloudRows, partitaFromCloudRow, settlementFromCloudRow,
  type GiocatorePartitaCloudRow, type PokerMovimentoCloudRow, type PartitaPokerCloudRow, type SettlementCloudRow,
} from './mappingPoker';
import {
  materializzaGiocatore, materializzaGiocatorePartita, materializzaLega, materializzaPartita,
  materializzaSettlement,
} from './materializza';

/** Riga di una tabella-ponte M:N: id del genitore (nome-colonna variabile) +
    l'uid del giocatore. Qui interessa solo `giocatore_id`. */
interface RigaPonte { giocatore_id: string }

/** Lo stato del cloud per l'account: tutte le tabelle, righe piene (coi
    timestamp). Specchio in lettura del `PayloadImport` del push/import. */
export interface SnapshotCloud {
  leghe: LegaCloudRow[];
  giocatori: GiocatoreCloudRow[];
  giochi_lega: GiocoLegaCloudRow[];
  partite_poker: PartitaPokerCloudRow[];
  partita_poker_giocatori: GiocatorePartitaCloudRow[];
  poker_movimenti: PokerMovimentoCloudRow[];
  settlements: SettlementCloudRow[];
  serate: SerataCloudRow[];
  serata_partecipanti: (RigaPonte & { serata_id: string })[];
  sessioni_gioco: SessioneGiocoCloudRow[];
  sessione_gioco_partecipanti: (RigaPonte & { sessione_gioco_id: string })[];
  partite_gioco: PartitaGiocoCloudRow[];
  partita_gioco_vincitori: (RigaPonte & { partita_gioco_id: string })[];
  partita_gioco_partecipanti: (RigaPonte & { partita_gioco_id: string })[];
}

/** Raggruppa righe per una chiave (di solito l'uid del genitore). */
function raggruppa<T>(rows: T[], chiave: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = chiave(r);
    const lista = m.get(k);
    if (lista) lista.push(r);
    else m.set(k, [r]);
  }
  return m;
}

/**
 * Applica lo snapshot del cloud al db locale (pull completo). Ritorna un NUOVO
 * Db (immutabile verso l'esterno; internamente costruisce array freschi).
 * Le leghe locali non presenti nello snapshot restano intatte (create qui e
 * non ancora pushate). Idempotente: ri-applicare lo stesso snapshot non cambia
 * nulla (mergeConPegno + upsert-by-uid).
 */
export function applicaPull(db: Db, snap: SnapshotCloud): Db {
  const giocatoriPerLega = raggruppa(snap.giocatori, (g) => g.lega_id);
  const partitePerLega = raggruppa(snap.partite_poker, (p) => p.lega_id);
  const gpPerPartita = raggruppa(snap.partita_poker_giocatori, (g) => g.partita_id);
  const movimentiPerGp = raggruppa(snap.poker_movimenti, (m) => m.partita_giocatore_id);
  const settlementsPerPartita = raggruppa(snap.settlements, (s) => s.partita_id);

  let _lid = db._lid;
  const snapPerUid = new Map(snap.leghe.map((l) => [l.id, l]));
  const legheGia = new Set<string>();

  const riconcilia = (row: LegaCloudRow, base: Lega | undefined): Lega => {
    // ── Lega: primo livello (merge o materializza) ──
    const lega: Lega = base
      ? mergeConPegno(base, legaFromCloudRow(row, base))
      : materializzaLega(row, _lid++);

    let _nid = lega._nid;
    let _pid = lega._pid;

    // ── Giocatori: idMap VIVA uid → id_nome ──
    const nomi: NomeGiocatore[] = [...lega.nomi];
    const toIdNome = new Map<string, number>();
    for (const n of nomi) if (n.uid) toIdNome.set(n.uid, n.id);

    for (const gRow of giocatoriPerLega.get(row.id) ?? []) {
      const idNomeEsistente = toIdNome.get(gRow.id);
      if (idNomeEsistente !== undefined) {
        const i = nomi.findIndex((n) => n.id === idNomeEsistente);
        nomi[i] = mergeConPegno(nomi[i], giocatoreFromCloudRow(gRow, nomi[i]));
      } else {
        const id = _nid++;
        nomi.push(materializzaGiocatore(gRow, id));
        toIdNome.set(gRow.id, id); // P.8.5: registra SUBITO, prima dei figli
      }
    }
    // F1: una controparte orfana (giocatore mancante) → id sentinella, mai crash;
    // getNome la mostrerà come '?'. Non dovrebbe capitare (giocatori parent-first).
    const risolviIdNome = (uid: string): number => toIdNome.get(uid) ?? -1;

    // ── Poker: partite + giocatori-partita + movimenti + settlement ──
    const partite: Partita[] = [...lega.partite];
    const partiteByUid = new Map<string, number>(); // uid partita → indice in `partite`
    partite.forEach((p, i) => { if (p.uid) partiteByUid.set(p.uid, i); });

    for (const pRow of partitePerLega.get(row.id) ?? []) {
      let idx = partiteByUid.get(pRow.id);
      if (idx === undefined) {
        idx = partite.push(materializzaPartita(pRow, _pid++)) - 1;
        partiteByUid.set(pRow.id, idx);
      } else {
        // mergeConPegno(localeORIGINALE, versioneCloud): il primo arg è il
        // locale prima di applicare i campi cloud, o si perde "dirty vince".
        const orig = partite[idx];
        partite[idx] = mergeConPegno(orig, partitaFromCloudRow(pRow, orig));
      }
      const partita = partite[idx];

      // giocatori-partita (identità = uid, dentro l'array della partita)
      const gioc = [...partita.giocatori];
      const giocByUid = new Map<string, number>();
      gioc.forEach((g, i) => { if (g.uid) giocByUid.set(g.uid, i); });
      for (const gpRow of gpPerPartita.get(pRow.id) ?? []) {
        const movimenti = movimentiFromCloudRows(movimentiPerGp.get(gpRow.id) ?? [], risolviIdNome);
        const idNome = risolviIdNome(gpRow.giocatore_id);
        const j = giocByUid.get(gpRow.id);
        if (j === undefined) {
          gioc.push(materializzaGiocatorePartita(gpRow, idNome, movimenti));
        } else {
          gioc[j] = mergeConPegno(gioc[j], { ...giocatorePartitaFromCloudRow(gpRow, gioc[j]), ...movimenti });
        }
      }

      // settlement (identità = uid)
      const setts = [...partita.settlements];
      const settByUid = new Map<string, number>();
      setts.forEach((s, i) => { if (s.uid) settByUid.set(s.uid, i); });
      for (const sRow of settlementsPerPartita.get(pRow.id) ?? []) {
        const from = risolviIdNome(sRow.from_giocatore_id);
        const to = risolviIdNome(sRow.to_giocatore_id);
        const k = settByUid.get(sRow.id);
        if (k === undefined) {
          setts.push(materializzaSettlement(sRow, from, to));
        } else {
          setts[k] = mergeConPegno(setts[k], settlementFromCloudRow(sRow, setts[k], risolviIdNome));
        }
      }

      partite[idx] = { ...partita, giocatori: gioc, settlements: setts };
    }

    return { ...lega, nomi, partite, _nid, _pid };
  };

  // Leghe locali: riconcilia quelle nel cloud, tieni intatte le altre.
  const leghe: Lega[] = db.leghe.map((local) => {
    const row = local.uid ? snapPerUid.get(local.uid) : undefined;
    if (!row) return local;
    legheGia.add(row.id);
    return riconcilia(row, local);
  });
  // Leghe nuove dal cloud (create su un altro device).
  for (const row of snap.leghe) {
    if (legheGia.has(row.id)) continue;
    leghe.push(riconcilia(row, undefined));
  }

  return { ...db, leghe, _lid };
}
