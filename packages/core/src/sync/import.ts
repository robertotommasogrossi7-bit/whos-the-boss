/* ══════════════════════════════════════════════════════
   IMPORT ONE-SHOT (R7.3) — funzioni pure
   ─────────────────────────────────────────────────────
   Travaso iniziale del db locale nel cloud, UNA volta sola (invariante I8:
   import ≠ sync, codice separato). Design finale in R7_SCHEMA.md sez. O,
   dopo il red team (registro REDTEAM-R73-IMPORT.md).

   Qui vive SOLO la parte pura e testabile:
     · battesimo idempotente (uid mancanti)      [I-R5]
     · pre-flight strutturale                     [I-R8]  → R7.3a
     · payload builder v1 + conteggi attesi       [I-R6/I-R7]
   La RPC, l'orchestrazione e lo stamp sono R7.3b/c.

   ⚠️ Lo stato LIVE (`Lega.sessioneAttiva`, `Lega.serate_bg`) NON è
   sincronizzato in R7 (arriva col realtime, R9): il battesimo non lo tocca
   e il payload non lo include.
══════════════════════════════════════════════════════ */

import type {
  Db, GiocatorePartita, Lega, Partita, SessioneGioco,
} from '../types';
import { conUid, generaUid } from '../utils/uid';
import { mappaGiocatori } from './idMap';
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

/* ── Battesimo ────────────────────────────────────────────────────────────
   I dati storici (creati prima di R7.2a) non hanno `uid`: senza identità
   stabile il push non è idempotente (finding S2/I-R5). Qui li assegniamo
   SOLO dove mancano: rilanciare il battesimo non deve MAI rigenerare un uid
   già assegnato, altrimenti dopo un crash il locale e il server divergono e
   il primo sync duplica tutto. L'app deve persistire il risultato PRIMA di
   chiamare la RPC (I-R5). */

/** Entità sincronizzata: uid (identità cloud) + syncRev (dirty-tracking). */
function battezzaEntita<T extends { uid?: string; syncRev?: number }>(e: T): T {
  if (e.uid && e.syncRev !== undefined) return e;
  return { ...e, uid: e.uid ?? generaUid(), syncRev: e.syncRev ?? 1 };
}

/* Movimento del ledger: solo uid (append-only → niente syncRev/deletedAt, I5).
   Da R7.4a-2 i movimenti nascono già con l'uid (`conUid` nello store): qui
   resta per i dati storici creati prima. È lo STESSO helper — un movimento ha
   una sola definizione di "identità cloud", non due. */
function battezzaGiocatorePartita(gp: GiocatorePartita): GiocatorePartita {
  return {
    ...battezzaEntita(gp),
    ricariche: gp.ricariche.map(conUid),
    pagamenti_effettuati: gp.pagamenti_effettuati.map(conUid),
    pagamenti_ricevuti: gp.pagamenti_ricevuti.map(conUid),
  };
}

function battezzaPartita(p: Partita): Partita {
  return {
    ...battezzaEntita(p),
    giocatori: p.giocatori.map(battezzaGiocatorePartita),
    settlements: p.settlements.map(battezzaEntita),
  };
}

function battezzaSessione(s: SessioneGioco): SessioneGioco {
  return {
    ...battezzaEntita(s),
    partite: s.partite.map(battezzaEntita),
  };
}

function battezzaLega(l: Lega): Lega {
  return {
    ...battezzaEntita(l),
    nomi: l.nomi.map(battezzaEntita),
    partite: l.partite.map(battezzaPartita),
    giochi: l.giochi?.map(battezzaEntita),
    serate: l.serate?.map(battezzaEntita),
    sessioniGioco: l.sessioniGioco?.map(battezzaSessione),
    // sessioneAttiva / serate_bg (stato live) NON toccati: fuori scope R7.
  };
}

/**
 * Assegna gli uid mancanti a tutto l'albero locale (movimenti inclusi).
 * **Idempotente**: gli uid/syncRev già presenti non vengono mai rigenerati →
 * un retry dopo un crash rispedisce ESATTAMENTE gli stessi uid (I-R5).
 * Il chiamante deve persistire il Db risultante PRIMA di chiamare la RPC.
 */
export function battezzaDb(db: Db): Db {
  return { ...db, leghe: db.leghe.map(battezzaLega) };
}

/* ── Pre-flight & riconciliazione ─────────────────────────────────────────
   L'import è all-or-nothing: un vincolo violato fa abortire l'intera
   transazione con un errore SQL criptico (I-R8). Meglio accorgersene PRIMA,
   sul client, con un messaggio leggibile. Due livelli distinti:
     · preflightImport() → problemi STRUTTURALI: bloccano (la RPC fallirebbe);
     · riconciliaSoldi() → anomalie sui SOLDI: NON bloccano, si importano e si
       flaggano (F2: mai perdere dati, mai correggere in silenzio). */

export interface ProblemaImport {
  tipo: 'personale_duplicata' | 'uid_mancante' | 'uid_duplicato' | 'fk_orfana' | 'soldi_anomali';
  messaggio: string;
}

/** Problemi strutturali che farebbero abortire la RPC. `[]` = via libera. */
export function preflightImport(db: Db): ProblemaImport[] {
  const out: ProblemaImport[] = [];
  const err = (tipo: ProblemaImport['tipo'], messaggio: string) => out.push({ tipo, messaggio });

  // vincolo DB `leghe_personale_uniq`: al massimo una lega Personale per account
  const personali = db.leghe.filter((l) => l.personale).length;
  if (personali > 1) err('personale_duplicata', `Ci sono ${personali} leghe "Personale": ne è ammessa una sola.`);

  const uidVisti = new Set<string>();
  const chkUid = (uid: string | undefined, dove: string) => {
    if (!uid) { err('uid_mancante', `Identificatore di sync mancante (${dove}): battesimo non eseguito?`); return; }
    if (uidVisti.has(uid)) err('uid_duplicato', `Identificatore duplicato (${dove}).`);
    uidVisti.add(uid);
  };

  for (const l of db.leghe) {
    const inLega = `lega "${l.nome}"`;
    chkUid(l.uid, inLega);

    const nomiIds = new Set(l.nomi.map((n) => n.id));
    const chkNome = (id: number, dove: string) => {
      if (!nomiIds.has(id)) err('fk_orfana', `${dove}: riferimento a un giocatore inesistente (id ${id}).`);
    };
    l.nomi.forEach((n) => chkUid(n.uid, `giocatore "${n.nome}" in ${inLega}`));

    // ⚠️ NIENTE check "il giocoId è in lega.giochi": `lega.giochi` è un layer di
    // override OPZIONALE sopra il catalogo globale (resolveGiocoLega: "cerca
    // prima in lega.giochi, poi nel catalogo"), oggi mai popolato — la UI dei
    // giochi custom è M5. L'identità del gioco viaggia in `sessioni_gioco.
    // gioco_key` (G1). Il vecchio check la trattava come FK obbligatoria e
    // bloccava OGNI import multigioco con un messaggio pure falso ("non è più
    // configurato": non lo è mai stato). Vedi R7_SCHEMA sez. Q.
    l.giochi?.forEach((g) => chkUid(g.uid, `gioco "${g.nome}" in ${inLega}`));

    const serateIds = new Set((l.serate ?? []).map((s) => s.id));
    l.serate?.forEach((s) => {
      chkUid(s.uid, `serata del ${s.data} in ${inLega}`);
      s.partecipanti.forEach((id) => chkNome(id, `serata del ${s.data}`));
    });

    l.sessioniGioco?.forEach((s) => {
      const dove = `sessione "${s.giocoId}" del ${s.data} in ${inLega}`;
      chkUid(s.uid, dove);
      if (s.serataId !== undefined && !serateIds.has(s.serataId)) err('fk_orfana', `${dove}: serata di appartenenza inesistente.`);
      s.partecipanti.forEach((id) => chkNome(id, dove));
      s.partite.forEach((p) => {
        chkUid(p.uid, `partita delle ${p.ora_inizio} in ${dove}`);
        p.vincitori.forEach((id) => chkNome(id, `vincitori della partita delle ${p.ora_inizio}`));
        p.partecipanti?.forEach((id) => chkNome(id, `partecipanti della partita delle ${p.ora_inizio}`));
      });
    });

    for (const p of l.partite) {
      const dove = `partita poker del ${p.data} in ${inLega}`;
      chkUid(p.uid, dove);
      p.settlements.forEach((s) => {
        chkUid(s.uid, `debito in ${dove}`);
        chkNome(s.from, `debito in ${dove}`);
        chkNome(s.to, `debito in ${dove}`);
      });
      for (const g of p.giocatori) {
        chkUid(g.uid, `giocatore in ${dove}`);
        chkNome(g.id_nome, dove);
        g.ricariche.forEach((r) => chkUid(r.uid, `ricarica in ${dove}`));
        g.pagamenti_effettuati.forEach((x) => { chkUid(x.uid, `pagamento in ${dove}`); chkNome(x.to, `pagamento in ${dove}`); });
        g.pagamenti_ricevuti.forEach((x) => { chkUid(x.uid, `incasso in ${dove}`); chkNome(x.from, `incasso in ${dove}`); });
      }
    }
  }
  return out;
}

/** Tolleranza sui centesimi: i soldi sono float+r100 (B6/S16), un drift
    minimo è fisiologico e non va segnalato. */
const TOLLERANZA_EURO = 0.01;

/**
 * Anomalie sui soldi. **Non bloccano**: si importa comunque e si flagga (F2/B3)
 * — meglio un dato storico strano ma salvato che un import rifiutato.
 */
export function riconciliaSoldi(db: Db): ProblemaImport[] {
  const out: ProblemaImport[] = [];
  const err = (messaggio: string) => out.push({ tipo: 'soldi_anomali', messaggio });
  const finito = (n: number) => Number.isFinite(n);

  for (const l of db.leghe) {
    for (const p of l.partite) {
      const dove = `Partita del ${p.data} (lega "${l.nome}")`;
      const netti = p.giocatori.map((g) => g.netto_finale ?? 0);
      if (netti.some((n) => !finito(n))) {
        err(`${dove}: un netto non è un numero valido.`);
      } else if (netti.length > 0) {
        // invariante: i soldi non si creano dal nulla → i netti sommano a zero
        const somma = netti.reduce((s, n) => s + n, 0);
        if (Math.abs(somma) > TOLLERANZA_EURO) err(`${dove}: i netti non sommano a zero (${somma.toFixed(2)} €).`);
      }
      p.settlements.forEach((s) => {
        if (!finito(s.amount)) err(`${dove}: un debito ha un importo non valido.`);
        else if (s.amount < 0) err(`${dove}: un debito ha importo negativo (${s.amount.toFixed(2)} €).`);
      });
    }
  }
  return out;
}

/* ── Payload builder ──────────────────────────────────────────────────────
   Il db locale → UN solo oggetto JSONB con tutte le tabelle, spedito alla RPC
   `import_locale` (transazione unica, all-or-nothing). Riusa i mapping puri
   già testati (mapping*.ts) e la mappa id↔uid (idMap.ts): qui c'è solo
   l'assemblaggio. `created_at`/`updated_at` non si spediscono: li mette il
   server (I2/I7). L'ORDINE delle chiavi rispecchia l'ordine di insert
   parent-first che la RPC deve seguire (I-R2: la RLS non è deferibile). */

/** Versione del formato del payload. La RPC rifiuta le versioni che non
    conosce invece di indovinare (I-R7). */
export const PAYLOAD_VERSION = 1;

type Riga<T> = Omit<T, 'created_at' | 'updated_at'>;
interface RigaPonte { giocatore_id: string }

export interface PayloadImport {
  version: number;
  // ── ordine parent-first (I-R2) ──
  leghe: Riga<LegaCloudRow>[];
  giocatori: Riga<GiocatoreCloudRow>[];
  giochi_lega: Riga<GiocoLegaCloudRow>[];
  partite_poker: Riga<PartitaPokerCloudRow>[];
  partita_poker_giocatori: Riga<GiocatorePartitaCloudRow>[];
  poker_movimenti: Riga<PokerMovimentoCloudRow>[];
  settlements: Riga<SettlementCloudRow>[];
  serate: Riga<SerataCloudRow>[];
  serata_partecipanti: (RigaPonte & { serata_id: string })[];
  sessioni_gioco: Riga<SessioneGiocoCloudRow>[];
  sessione_gioco_partecipanti: (RigaPonte & { sessione_gioco_id: string })[];
  partite_gioco: Riga<PartitaGiocoCloudRow>[];
  partita_gioco_vincitori: (RigaPonte & { partita_gioco_id: string })[];
  partita_gioco_partecipanti: (RigaPonte & { partita_gioco_id: string })[];
  /** Anomalie della riconciliazione soft: viaggiano col payload, non bloccano (F2). */
  anomalie: ProblemaImport[];
}

function esigiUid(uid: string | undefined, dove: string): string {
  if (!uid) throw new Error(`costruisciPayloadImport: ${dove} senza uid — battezzaDb() non è stato eseguito.`);
  return uid;
}

/**
 * Db locale (già battezzato) → payload per la RPC `import_locale`.
 * Presuppone `preflightImport(db) === []`: se una FK è orfana o un uid manca,
 * qui si lancia (meglio un errore chiaro che un payload monco).
 * Lo stato LIVE non entra nel payload (fuori scope R7).
 */
export function costruisciPayloadImport(db: Db, ownerId: string): PayloadImport {
  const p: PayloadImport = {
    version: PAYLOAD_VERSION,
    leghe: [], giocatori: [], giochi_lega: [],
    partite_poker: [], partita_poker_giocatori: [], poker_movimenti: [], settlements: [],
    serate: [], serata_partecipanti: [],
    sessioni_gioco: [], sessione_gioco_partecipanti: [],
    partite_gioco: [], partita_gioco_vincitori: [], partita_gioco_partecipanti: [],
    anomalie: riconciliaSoldi(db),
  };

  for (const l of db.leghe) {
    const legaUid = esigiUid(l.uid, `lega "${l.nome}"`);
    p.leghe.push(legaToCloudRow(l, ownerId));

    const { toUid } = mappaGiocatori(l.nomi);
    const risolviUid = (idNome: number): string => {
      const u = toUid.get(idNome);
      if (!u) throw new Error(`costruisciPayloadImport: giocatore id ${idNome} inesistente nella lega "${l.nome}" (preflightImport() lo segnala come fk_orfana).`);
      return u;
    };

    l.nomi.forEach((n) => p.giocatori.push(giocatoreToCloudRow(n, legaUid)));
    l.giochi?.forEach((g) => p.giochi_lega.push(giocoLegaToCloudRow(g, legaUid)));

    // ── poker ──
    for (const pt of l.partite) {
      const partitaUid = esigiUid(pt.uid, `partita del ${pt.data}`);
      p.partite_poker.push(partitaToCloudRow(pt, legaUid));
      pt.settlements.forEach((s, i) => {
        p.settlements.push(settlementToCloudRow(s, partitaUid, risolviUid(s.from), risolviUid(s.to), i));
      });
      for (const gp of pt.giocatori) {
        const gpUid = esigiUid(gp.uid, `giocatore della partita del ${pt.data}`);
        p.partita_poker_giocatori.push(giocatorePartitaToCloudRow(gp, partitaUid, risolviUid(gp.id_nome)));
        p.poker_movimenti.push(...movimentiToCloudRows(gp, gpUid, risolviUid));
      }
    }

    // ── multigioco ──
    const giochiUid = new Map((l.giochi ?? []).map((g) => [g.id, esigiUid(g.uid, `gioco "${g.nome}"`)]));
    const serateUid = new Map((l.serate ?? []).map((s) => [s.id, esigiUid(s.uid, `serata del ${s.data}`)]));

    l.serate?.forEach((s) => {
      const serataUid = serateUid.get(s.id)!;
      p.serate.push(serataToCloudRow(s, legaUid));
      ponteToUids(s.partecipanti, risolviUid).forEach((giocatore_id) => {
        p.serata_partecipanti.push({ serata_id: serataUid, giocatore_id });
      });
    });

    l.sessioniGioco?.forEach((s) => {
      const sessioneUid = esigiUid(s.uid, `sessione "${s.giocoId}" del ${s.data}`);
      p.sessioni_gioco.push(sessioneGiocoToCloudRow(
        s, legaUid,
        giochiUid.get(s.giocoId) ?? null,
        s.serataId !== undefined ? serateUid.get(s.serataId) : undefined,
      ));
      ponteToUids(s.partecipanti, risolviUid).forEach((giocatore_id) => {
        p.sessione_gioco_partecipanti.push({ sessione_gioco_id: sessioneUid, giocatore_id });
      });
      s.partite.forEach((pg) => {
        const pgUid = esigiUid(pg.uid, `partita delle ${pg.ora_inizio}`);
        p.partite_gioco.push(partitaGiocoToCloudRow(pg, sessioneUid));
        ponteToUids(pg.vincitori, risolviUid).forEach((giocatore_id) => {
          p.partita_gioco_vincitori.push({ partita_gioco_id: pgUid, giocatore_id });
        });
        pg.partecipanti?.forEach((idNome) => {
          p.partita_gioco_partecipanti.push({ partita_gioco_id: pgUid, giocatore_id: risolviUid(idNome) });
        });
      });
    });
  }
  return p;
}

/**
 * Righe per tabella nel payload. Il client le confronta con i conteggi che la
 * RPC restituisce, PRIMA di considerare l'import riuscito: è il vero controllo
 * anti-perdita (I-R6) — una tabella saltata in silenzio verrebbe scoperta qui.
 */
export function conteggiPayload(p: PayloadImport): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(p)) {
    if (Array.isArray(v) && k !== 'anomalie') out[k] = v.length;
  }
  return out;
}

/* ── Stamp post-import: il contratto R7.3 → R7.4 (sez. O.3) ───────────────
   Il vero output dell'import NON è "le righe sono sul server": è **"locale e
   cloud sono in uno stato da cui il delta-sync non duplica e non perde"**.
   Il red team l'ha indicato come il pezzo che, lasciato implicito, trasforma
   un import "riuscito" in perdita o duplicazione di soldi al primo sync (I-R3).

   La regola, in una riga:
     per ogni riga importata `syncedRev` = **la revisione spedita**;
     ogni edit avvenuto nella finestra dell'import resta dirty;
     nessuna riga divergente di un altro device viene mai marcata pulita.

   Il meccanismo si appoggia al dirty-tracking a contatore (R7.2d-2) e non ha
   bisogno di altra logica: se durante l'import l'utente tocca una riga, la sua
   `syncRev` avanza oltre la revisione spedita e la riga risulta sporca **da
   sola** (syncRev > syncedRev). Nessuna finestra di perdita silenziosa. */

/** Istantanea di ciò che si sta spedendo: uid → revisione spedita. Va presa
    dal db battezzato usato per costruire il payload, PRIMA della RPC. */
export function revisioniSpedite(db: Db): Map<string, number> {
  const out = new Map<string, number>();
  const add = (e: { uid?: string; syncRev?: number }) => {
    if (e.uid) out.set(e.uid, e.syncRev ?? 0);
  };
  for (const l of db.leghe) {
    add(l);
    l.nomi.forEach(add);
    l.giochi?.forEach(add);
    l.serate?.forEach(add);
    l.sessioniGioco?.forEach((s) => { add(s); s.partite.forEach(add); });
    for (const p of l.partite) {
      add(p);
      p.settlements.forEach(add);
      p.giocatori.forEach(add);
      // i movimenti non hanno syncRev (append-only, I5): niente stamp
    }
  }
  return out;
}

/**
 * Marca come sincronizzate SOLO le righe effettivamente spedite, con la
 * revisione spedita (contratto O.3). Da chiamare **dopo** che la RPC ha
 * confermato E i conteggi combaciano (I-R6).
 *
 * ⚠️ NON va chiamata sul ramo `already_imported` di un secondo device con dati
 * divergenti: quei dati non sono sul server, marcarli puliti li perderebbe
 * (I-R4). Restano dirty; il delta-sync proporrà l'adozione del cloud (DS9).
 */
export function applicaStampImport(db: Db, spedite: Map<string, number>): Db {
  const stampa = <T extends { uid?: string; syncedRev?: number }>(e: T): T => {
    const rev = e.uid ? spedite.get(e.uid) : undefined;
    return rev === undefined ? e : { ...e, syncedRev: rev };
  };
  return {
    ...db,
    leghe: db.leghe.map((l) => ({
      ...stampa(l),
      nomi: l.nomi.map(stampa),
      giochi: l.giochi?.map(stampa),
      serate: l.serate?.map(stampa),
      sessioniGioco: l.sessioniGioco?.map((s) => ({ ...stampa(s), partite: s.partite.map(stampa) })),
      partite: l.partite.map((p) => ({
        ...stampa(p),
        giocatori: p.giocatori.map(stampa),
        settlements: p.settlements.map(stampa),
      })),
    })),
  };
}
