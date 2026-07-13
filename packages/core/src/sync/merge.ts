/* ══════════════════════════════════════════════════════
   MERGE LWW (R7.2c → hardening R7.2d-2) — funzioni pure
   ─────────────────────────────────────────────────────
   Il cloud è server-authoritative (R7_SCHEMA.md sez. C1/G2): in pull vince
   di default. Le due eccezioni, entrambe imposte qui:
     1. una riga locale con un edit SUO non ancora confermato dal server
        (altrimenti un pull a metà di un edit locale lo cancellerebbe);
     2. le cancellazioni (tombstone) vincono sempre — delete-wins (I4).

   ⚠️ "Ha un edit non sincronizzato?" si decide con un CONTATORE locale, MAI
   con un orologio (R7.2d-2, finding S5). syncRev = quante volte ho toccato
   la riga (bump locale); syncedRev = l'ultima syncRev che il server ha
   confermato. Sporca ⇔ syncRev > syncedRev. Nessun clock, nessun clock-skew.
   (syncUpdatedAt/lastSyncedAt restano nel tipo ma NON decidono più lo sporco:
   il primo è diagnostica "sync N min fa", il secondo è il pegno per il CAS
   del push in R7.4. Vedi _processo/SYNC_INVARIANTI.md I2/I10.)
══════════════════════════════════════════════════════ */

export interface ConSync {
  syncRev?: number; // revisione locale: 1 alla creazione, +1 a ogni mutazione locale
  syncedRev?: number; // ultima syncRev confermata dal server (scritta dal push/pull)
  deletedAt?: string; // tombstone locale (delete-wins, mai purgato — I4/I9)
  // — legacy, NON più usati per decidere lo sporco (I2/I10) —
  syncUpdatedAt?: string; // solo diagnostica ("sincronizzato N min fa")
  lastSyncedAt?: string; // solo pegno per il CAS del push (R7.4)
}

/** True se la riga ha un cambiamento locale non ancora confermato dal server:
    la sua revisione locale supera quella confermata. Confronta due contatori
    dello STESSO device — niente orologi (R7.2d-2, S5). */
export function haCambiamentiLocaliNonSincronizzati(riga: ConSync): boolean {
  return (riga.syncRev ?? 0) > (riga.syncedRev ?? 0);
}

/**
 * Merge LWW per riga in pull: `daCloud` è già mappata in forma locale (via le
 * funzioni di mapping.ts). Ordine delle regole:
 *   1. tombstone nel cloud → vince il cloud (la cancellazione si propaga), anche
 *      se il locale ha un edit non sincronizzato — delete-wins (I4);
 *   2. nessuna riga locale → prende il cloud;
 *   3. tombstone locale → resta il tombstone (non lo resuscita un edit cloud) — delete-wins (I4);
 *   4. il locale ha un edit non ancora confermato → resta locale (si riconcilia al prossimo push);
 *   5. altrimenti → vince il cloud.
 */
export function mergeLWW<L extends ConSync>(locale: L | undefined, daCloud: L): L {
  if (daCloud.deletedAt) return daCloud;
  if (!locale) return daCloud;
  if (locale.deletedAt) return locale;
  if (haCambiamentiLocaliNonSincronizzati(locale)) return locale;
  return daCloud;
}
