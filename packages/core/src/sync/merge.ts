/* ══════════════════════════════════════════════════════
   MERGE LWW (R7.2c) — funzioni pure
   ─────────────────────────────────────────────────────
   Il cloud è server-authoritative (R7_SCHEMA.md sez. C1/G2): in pull vince
   di default. L'unica eccezione è una riga locale con un cambiamento SUO
   non ancora confermato dal server — altrimenti un pull a metà di un edit
   locale lo cancellerebbe in silenzio.

   ⚠️ Il confronto qui è SEMPRE fra due timestamp scritti dallo STESSO
   device (syncUpdatedAt = mio ultimo edit locale, lastSyncedAt = updated_at
   del server all'ultimo sync riuscito DI QUESTA RIGA, salvato in locale).
   Non è mai un confronto fra il clock di due device diversi: quello resta
   vietato (rischio clock-skew, R7_SCHEMA.md sez. I.2).
══════════════════════════════════════════════════════ */

export interface ConSync {
  syncUpdatedAt?: string;
  lastSyncedAt?: string;
}

/** True se la riga ha un cambiamento locale non ancora confermato dal
    server: o non è mai stata sincronizzata (nessun lastSyncedAt) e ha
    comunque un edit, oppure l'edit è successivo all'ultimo sync riuscito. */
export function haCambiamentiLocaliNonSincronizzati(riga: ConSync): boolean {
  if (!riga.syncUpdatedAt) return false;
  if (!riga.lastSyncedAt) return true;
  return riga.syncUpdatedAt > riga.lastSyncedAt;
}

/**
 * Merge LWW per riga in pull: `daCloud` è già mappata in forma locale (via
 * le funzioni di mapping.ts), con `syncUpdatedAt`/`lastSyncedAt` impostati
 * entrambi a `updated_at` del server. Se la riga locale ha un edit non
 * ancora sincronizzato, resta locale (si riconcilia al prossimo push);
 * altrimenti vince il cloud.
 */
export function mergeLWW<L extends ConSync>(locale: L | undefined, daCloud: L): L {
  if (!locale) return daCloud;
  if (haCambiamentiLocaliNonSincronizzati(locale)) return locale;
  return daCloud;
}
