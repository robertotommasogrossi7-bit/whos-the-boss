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
