/* ══════════════════════════════════════════════════════
   ORCHESTRAZIONE IMPORT (R7.3c) — la sequenza, con deps iniettate
   ─────────────────────────────────────────────────────
   Il "direttore d'orchestra" dell'import: decide l'ORDINE e i RAMI, che è
   dove il red team ha trovato i buchi (I-R3/I-R4/I-R5/I-R6). Le dipendenze
   (store, storage, rete) sono iniettate come callback → la logica resta
   testabile senza device né Supabase, come tutto il core.

   L'app (R7.3c-2) fornisce le implementazioni vere; qui c'è solo la sequenza:

     leggi db → battezza → PRE-FLIGHT → scrivi in locale → CONFERMA persist
     → payload + istantanea revisioni → RPC → verifica conteggi → STAMP

   Le tre regole che il red team ha imposto e che vivono qui:
     · I-R5  gli uid si confermano su disco PRIMA di spedire (dopo un crash il
             retry deve rispedire gli stessi uid, non generarne di nuovi);
     · I-R6  lo stamp si applica SOLO se i conteggi della RPC combaciano
             (una tabella persa in silenzio non deve passare per "importata");
     · I-R4  su `already_imported` NON si stampa nulla: i dati di un secondo
             device restano locali e MAI marcati puliti. Il sync per-uid non
             può unirli (S4-R1: mondi nati separati → duplicati): il delta-sync
             proporrà l'ADOZIONE del cloud (DS9, backup + sostituzione).
══════════════════════════════════════════════════════ */

import type { Db } from '../types';
import {
  applicaStampImport, battezzaDb, conteggiPayload, costruisciPayloadImport,
  preflightImport, revisioniSpedite,
  type PayloadImport, type ProblemaImport,
} from './import';

export type EsitoImport =
  /** Importato: i dati sono sul cloud e il locale è marcato sincronizzato. */
  | { stato: 'ok'; conteggi: Record<string, number>; anomalie: ProblemaImport[] }
  /** L'account aveva già importato (altro device): niente stamp, i dati locali
      restano com'erano (I-R4). Il delta-sync NON li unirà (impossibile per-uid,
      S4-R1): proporrà l'adozione del cloud, con backup locale (DS9). */
  | { stato: 'gia_importato' }
  /** Problemi strutturali: non si spedisce nulla, si mostrano all'utente (I-R8). */
  | { stato: 'bloccato'; problemi: ProblemaImport[] }
  | { stato: 'errore'; messaggio: string };

export type RispostaRpc = { conteggi: Record<string, number> } | { errore: string };

export interface DepsImport {
  /** Stato corrente del db locale (rileggibile: durante l'import può cambiare). */
  leggiDb: () => Db;
  /** Sostituisce il db locale (lo store lo persiste, in modo asincrono). */
  scriviDb: (db: Db) => void;
  /** Deve risolvere `true` solo quando il db è DAVVERO su disco: l'uid passato
      dev'essere rileggibile dallo storage (I-R5). */
  confermaPersist: (uidDiControllo: string) => Promise<boolean>;
  /** Chiama la RPC `import_locale`. Non lancia: ritorna `{errore}`. */
  chiamaRpc: (payload: PayloadImport) => Promise<RispostaRpc>;
  /** L'account autenticato (owner delle leghe importate). */
  ownerId: string;
}

/** Primo scarto fra conteggi attesi e conteggi confermati dal server (I-R6). */
function differenzaConteggi(attesi: Record<string, number>, ricevuti: Record<string, number>): string | null {
  for (const [tabella, atteso] of Object.entries(attesi)) {
    const ricevuto = ricevuti[tabella];
    if (ricevuto !== atteso) {
      return `Il server ha registrato ${ricevuto ?? 0} righe invece di ${atteso} in "${tabella}": import non confermato.`;
    }
  }
  return null;
}

/**
 * Esegue l'import one-shot. Non lancia mai: ogni esito è un valore.
 * Il backup (Share) è responsabilità del chiamante e **non è un gate**: il
 * locale non viene mai cancellato da questa funzione, quindi resta lui la
 * copia di sicurezza.
 */
export async function orchestraImport(deps: DepsImport): Promise<EsitoImport> {
  // ── 1. battesimo + pre-flight (prima di toccare qualsiasi cosa) ──
  const battezzato = battezzaDb(deps.leggiDb());
  const problemi = preflightImport(battezzato);
  if (problemi.length > 0) return { stato: 'bloccato', problemi };

  const payload = costruisciPayloadImport(battezzato, deps.ownerId);
  const attesi = conteggiPayload(payload);
  if (Object.values(attesi).every((n) => n === 0)) {
    return { stato: 'errore', messaggio: 'Non c\'è niente da importare: il telefono non ha dati.' };
  }

  // ── 2. gli uid vanno su disco PRIMA di spedire (I-R5) ──
  const spedite = revisioniSpedite(battezzato);
  deps.scriviDb(battezzato);
  const uidControllo = battezzato.leghe[0]?.uid;
  if (uidControllo && !(await deps.confermaPersist(uidControllo))) {
    return {
      stato: 'errore',
      messaggio: 'Non sono riuscito a salvare gli identificativi sul telefono: import annullato. Riprova.',
    };
  }

  // ── 3. la RPC (transazione unica lato server) ──
  const risposta = await deps.chiamaRpc(payload);
  if ('errore' in risposta) {
    // I-R4: l'account ha già importato da un altro device. NON è un fallimento:
    // i dati restano locali e MAI marcati puliti; sarà il delta-sync a proporre
    // l'adozione del cloud (DS9) — niente unione per-uid, duplicherebbe tutto.
    if (risposta.errore.includes('already_imported')) return { stato: 'gia_importato' };
    return { stato: 'errore', messaggio: risposta.errore };
  }

  // ── 4. i conteggi devono combaciare, altrimenti NON è importato (I-R6) ──
  const scarto = differenzaConteggi(attesi, risposta.conteggi);
  if (scarto) return { stato: 'errore', messaggio: scarto };

  // ── 5. stamp sullo stato CORRENTE (non su `battezzato`): se l'utente ha
  //       editato durante l'import, quella riga resta dirty da sola (O.3/I-R3) ──
  deps.scriviDb(applicaStampImport(deps.leggiDb(), spedite));
  return { stato: 'ok', conteggi: risposta.conteggi, anomalie: payload.anomalie };
}
