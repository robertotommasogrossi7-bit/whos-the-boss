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
import { generaUid } from '../utils/uid';

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

/** Movimento del ledger: solo uid (append-only → niente syncRev/deletedAt, I5). */
function battezzaMovimento<T extends { uid?: string }>(m: T): T {
  return m.uid ? m : { ...m, uid: generaUid() };
}

function battezzaGiocatorePartita(gp: GiocatorePartita): GiocatorePartita {
  return {
    ...battezzaEntita(gp),
    ricariche: gp.ricariche.map(battezzaMovimento),
    pagamenti_effettuati: gp.pagamenti_effettuati.map(battezzaMovimento),
    pagamenti_ricevuti: gp.pagamenti_ricevuti.map(battezzaMovimento),
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

    const giochiKeys = new Set((l.giochi ?? []).map((g) => g.id));
    l.giochi?.forEach((g) => chkUid(g.uid, `gioco "${g.nome}" in ${inLega}`));

    const serateIds = new Set((l.serate ?? []).map((s) => s.id));
    l.serate?.forEach((s) => {
      chkUid(s.uid, `serata del ${s.data} in ${inLega}`);
      s.partecipanti.forEach((id) => chkNome(id, `serata del ${s.data}`));
    });

    l.sessioniGioco?.forEach((s) => {
      const dove = `sessione "${s.giocoId}" del ${s.data} in ${inLega}`;
      chkUid(s.uid, dove);
      if (!giochiKeys.has(s.giocoId)) err('fk_orfana', `${dove}: il gioco "${s.giocoId}" non è più configurato nella lega.`);
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
