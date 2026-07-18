/* ══════════════════════════════════════════════════════
   ORCHESTRAZIONE SYNC (R7.4d) — pull → merge → push → stamp, deps iniettate
   ─────────────────────────────────────────────────────
   Il "direttore d'orchestra" del delta-sync (P.1, ordine WatermelonDB), come
   `orchestraImport` per l'import: qui vivono l'ORDINE e i RAMI; store, rete e
   storage sono callback iniettate → tutto testabile senza device né Supabase.

     mutex → PULL completo → primo contatto (import/adozione, P.8.1)
     → merge (applicaPull) → PUSH per lega (payload dirty → RPC CAS → stamp)

   Le regole che vivono qui:
     · S11  mutex: se un ciclo è in corso, il nuovo si SALTA (niente coda);
     · S20  logout-guard: l'account si cattura all'avvio e si ricontrolla
            prima di OGNI scrittura; se è cambiato, risultati SCARTATI;
     · P.8.1/DS9  primo contatto di un device mai sincronizzato:
            - cloud vergine → si passa dall'IMPORT (preflight + guardia
              atomica), non dal push: esito `da_importare`;
            - cloud con dati → NIENTE unione per-uid (S4-R1: duplicherebbe
              tutto e la 2ª Personale andrebbe in deadlock): il device ADOTTA
              il cloud. Telefono "nuovo" (solo il Personale auto-creato,
              vuoto) → adozione automatica; dati veri → decide l'utente;
     · P.2  conflitto CAS: il push abortisce, qui NESSUN retry — il prossimo
            giro ri-pulla (pegno rinfrescato dalla regola del pegno) e
            ri-pusha. Un no-op UPDATE non bumpa updated_at (B31), quindi
            l'eco si auto-risolve;
     · O.3  stamp sullo stato CORRENTE con le revisioni spedite: un edit
            avvenuto durante la RPC resta dirty da solo.

   Niente `confermaPersist` (a differenza dell'import): gli uid nascono con
   le righe (nuovoSync alla creazione) e viaggiano col normale persist; se
   un crash perde la copia locale DOPO un push, il pull successivo la
   rimaterializza con lo STESSO uid — mai un duplicato.
══════════════════════════════════════════════════════ */

import type { Db } from '../types';
import { applicaPull, type SnapshotCloud } from './pull';
import {
  applicaStampPush, costruisciPayloadPush, haRigheDaPushare, revisioniPush,
  type PayloadPush,
} from './push';

export type RispostaPush =
  | { conteggi: Record<string, number>; applicate: Record<string, string> }
  | { errore: string };

export interface DepsSync {
  /** Stato corrente del db locale (rilétto a ogni passo: può cambiare). */
  leggiDb: () => Db;
  /** Sostituisce il db locale (lo store lo persiste, in modo asincrono). */
  scriviDb: (db: Db) => void;
  /** L'account autenticato ADESSO, o null (S20). */
  accountAttuale: () => string | null;
  /** Scarica lo stato completo del cloud per l'account (14 tabelle, filtrate
      dalla RLS). Non lancia: ritorna `{errore}`. */
  scaricaSnapshot: () => Promise<{ snapshot: SnapshotCloud } | { errore: string }>;
  /** Chiama la RPC `push_lega`. Non lancia: ritorna `{errore}`. */
  chiamaRpcPush: (payload: PayloadPush) => Promise<RispostaPush>;
  /** Salva la copia di sicurezza del blob locale PRIMA dell'adozione (DS9:
      la chiave `…:backup-pre-adozione`). */
  salvaBackupPreAdozione: () => Promise<void>;
}

export interface OpzioniSync {
  /** L'utente ha confermato l'adozione del cloud (dopo `adozione_richiesta`). */
  adozioneConfermata?: boolean;
}

export type EsitoSync =
  /** Ciclo completo. `pushate` = righe applicate dal server; `adottato` =
      questo giro ha sostituito il locale col cloud (primo contatto). */
  | { stato: 'ok'; pushate: number; adottato?: boolean }
  | { stato: 'saltato'; motivo: 'in_corso' | 'nessun_account' | 'da_importare' }
  /** Serve la conferma dell'utente: locale con dati veri mai sincronizzati +
      cloud già popolato (P.8.1). Si rilancia con `adozioneConfermata`. */
  | { stato: 'adozione_richiesta' }
  /** CAS fallito: un altro device ha scritto prima. Si risolve al prossimo
      giro (pull → pegno fresco → push). */
  | { stato: 'conflitto' }
  /** Account cambiato durante il ciclo (S20): niente scritto. */
  | { stato: 'scartato' }
  | { stato: 'errore'; messaggio: string };

/** True se questo db ha già sincronizzato almeno una volta (import stampato,
    adozione o pull passati di qui). Basta il livello-lega: import e adozione
    stampano/materializzano anche la lega, mai solo i figli. */
export function giaSincronizzato(db: Db): boolean {
  return db.leghe.some((l) => l.lastSyncedAt !== undefined || (l.syncedRev ?? 0) > 0);
}

/** True se il db locale contiene dati che l'utente perderebbe con l'adozione:
    qualsiasi lega non-Personale, o partite/sessioni/serate/giocatori aggiunti.
    Il SOLO Personale auto-creato al boot (runMigrations: un giocatore = te,
    zero partite) NON conta: è il "telefono nuovo" di P.8.1, adozione senza
    attriti. */
export function haDatiSignificativi(db: Db): boolean {
  return db.leghe.some((l) =>
    !l.personale
    || l.partite.length > 0
    || (l.sessioniGioco?.length ?? 0) > 0
    || (l.serate?.length ?? 0) > 0
    || l.nomi.length > 1
    // una serata LIVE non è sincronizzata ma è il dato più fresco che c'è:
    // mai adottare in silenzio sopra una sessione in corso (audit S5-R2)
    || l.sessioneAttiva !== undefined
    || (l.serate_bg?.length ?? 0) > 0,
  );
}

/** Il db "adottato": tutto e solo il cloud, materializzato da zero (le righe
    nascono pulite: syncRev === syncedRev, pegno = updated_at server). La lega
    corrente diventa il Personale (o la prima viva). */
export function adottaCloud(snap: SnapshotCloud): Db {
  const db = applicaPull({ leghe: [], _lid: 1, _currentLegaId: undefined }, snap);
  const corrente = db.leghe.find((l) => l.personale && !l.deletedAt)
    ?? db.leghe.find((l) => !l.deletedAt);
  return { ...db, _currentLegaId: corrente?.id };
}

/**
 * Crea il ciclo di sync. Il MUTEX (S11) vive nella closure: l'app crea UNA
 * istanza e la chiama da tutti i trigger (boot, foreground, bottone); una
 * chiamata mentre un'altra è in volo si salta, niente coda.
 * Il ciclo non lancia mai: ogni esito è un valore.
 */
export function creaSync(deps: DepsSync): (opz?: OpzioniSync) => Promise<EsitoSync> {
  let inCorso = false;
  return async (opz = {}) => {
    if (inCorso) return { stato: 'saltato', motivo: 'in_corso' };
    const account = deps.accountAttuale();
    if (!account) return { stato: 'saltato', motivo: 'nessun_account' };
    inCorso = true;
    try {
      return await ciclo(deps, account, opz);
    } catch (e) {
      return { stato: 'errore', messaggio: e instanceof Error ? e.message : String(e) };
    } finally {
      inCorso = false;
    }
  };
}

async function ciclo(deps: DepsSync, account: string, opz: OpzioniSync): Promise<EsitoSync> {
  const guardia = (): boolean => deps.accountAttuale() === account; // S20

  // ── 1. PULL completo (P.1: a questa scala niente cursore) ──
  const r = await deps.scaricaSnapshot();
  if ('errore' in r) return { stato: 'errore', messaggio: r.errore };
  const snap = r.snapshot;

  // ── 2. Primo contatto: import o adozione (P.8.1/DS9) ──
  const db = deps.leggiDb();
  if (!giaSincronizzato(db)) {
    if (snap.leghe.length === 0) return { stato: 'saltato', motivo: 'da_importare' };
    if (haDatiSignificativi(db) && !opz.adozioneConfermata) {
      return { stato: 'adozione_richiesta' };
    }
    await deps.salvaBackupPreAdozione();
    if (!guardia()) return { stato: 'scartato' };
    deps.scriviDb(adottaCloud(snap));
    return { stato: 'ok', pushate: 0, adottato: true };
  }

  // ── 3. MERGE (pull puro: mergeConPegno + materializzazione, R7.4b) ──
  if (!guardia()) return { stato: 'scartato' };
  deps.scriviDb(applicaPull(deps.leggiDb(), snap));

  // ── 4. PUSH: una RPC per lega (S9), stamp a conferma (O.3) ──
  let pushate = 0;
  let conflitto = false;
  const uids = deps.leggiDb().leghe.map((l) => l.uid);
  for (const uid of uids) {
    if (!uid) continue; // lega senza uid: non sincronizzabile (non dovrebbe esistere)
    const lega = deps.leggiDb().leghe.find((l) => l.uid === uid);
    if (!lega) continue;
    const payload = costruisciPayloadPush(lega, account);
    if (!haRigheDaPushare(payload)) continue; // niente RPC a vuoto
    const spedite = revisioniPush(lega); // PRIMA della RPC (O.3)

    const risposta = await deps.chiamaRpcPush(payload);
    if ('errore' in risposta) {
      // Conflitto CAS su QUESTA lega: qualcun altro ha scritto prima. Le
      // ALTRE leghe (RPC indipendenti, S9) si tentano comunque (audit S5-R3);
      // l'esito del giro resta 'conflitto' e il prossimo ciclo ri-pulla
      // (pegno rinfrescato) e ri-pusha questa (P.2). Nessun retry qui.
      if (risposta.errore.includes('conflict')) { conflitto = true; continue; }
      return { stato: 'errore', messaggio: risposta.errore };
    }

    if (!guardia()) return { stato: 'scartato' };
    const applicate = new Map(Object.entries(risposta.applicate));
    const corrente = deps.leggiDb();
    deps.scriviDb({
      ...corrente,
      leghe: corrente.leghe.map((l) => (l.uid === uid ? applicaStampPush(l, spedite, applicate) : l)),
    });
    pushate += Object.values(risposta.conteggi).reduce((a, b) => a + b, 0);
  }
  return conflitto ? { stato: 'conflitto' } : { stato: 'ok', pushate };
}
