/* ══════════════════════════════════════════════════════
   UID + tracking sync — identità cloud client-side (R7.2, sync)
   ─────────────────────────────────────────────────────
   generaUid() produce un UUIDv7: 48 bit di timestamp Unix (ms) +
   version nibble '7' + variant nibble + resto random (RFC 9562).
   Ordinabile per tempo di creazione → indici B-tree Postgres compatti
   (deciso vs v4, R7_SCHEMA.md sez. G3). Generato al momento della
   creazione su QUALSIASI device, così due device non generano mai lo
   stesso uid (R7_SCHEMA.md sez. A1) — è la chiave di upsert del sync.
   Niente dipendenza esterna (Math.random basta: qui serve unicità,
   non imprevedibilità crittografica — non è un token di sicurezza).

   nuovoSync()/touchSync() gestiscono il "dirty-tracking a contatore"
   (R7.2d-2): il campo syncRev conta le versioni locali di una riga, e
   la riga è "da pushare" finché syncRev supera la revisione confermata
   dal server (syncedRev). MAI orologi (finding S5, SYNC_INVARIANTI I10).
══════════════════════════════════════════════════════ */

import type { ConSync } from '../sync/merge';

function randomHex(nDigits: number): string {
  let s = '';
  while (s.length < nDigits) s += Math.floor(Math.random() * 16).toString(16);
  return s.slice(0, nDigits);
}

/** UUIDv7 pura. Vedi commento di modulo per il razionale. */
export function generaUid(): string {
  const ts = Date.now().toString(16).padStart(12, '0').slice(-12);
  const randA = randomHex(3);
  const variant = ((Math.floor(Math.random() * 4) + 8)).toString(16); // 8/9/a/b
  const randB = randomHex(15);
  return (
    `${ts.slice(0, 8)}-${ts.slice(8, 12)}-7${randA}-${variant}${randB.slice(0, 3)}-${randB.slice(3, 15)}`
  );
}

/** Campi sync di una entità appena creata: uid nuovo + revisione 1 (nasce
    "sporca", mai sincronizzata) + timestamp diagnostico. Da spandere nei punti
    di creazione delle entità sincronizzate: `{ ...campi, ...nuovoSync() }`. */
export function nuovoSync(): { uid: string; syncRev: number; syncUpdatedAt: string } {
  return { uid: generaUid(), syncRev: 1, syncUpdatedAt: new Date().toISOString() };
}

/** Identità cloud di un movimento del ledger (ricariche/pagamenti): SOLO uid —
    niente syncRev/deletedAt, perché `poker_movimenti` è append-only (I5): un
    movimento non si modifica e non si cancella, quindi non ha revisioni da
    tracciare. **Idempotente**: un uid già assegnato non si rigenera MAI (un
    movimento nasce nella sessione live e viene ricopiato nella partita salvata
    alla chiusura — se cambiasse uid, il retry di un push lo duplicherebbe).

    ⚠️ Firma: `m: T & { uid?: string }`, NON `<T extends { uid?: string }>`. Col
    vincolo, TypeScript non riesce a inferire T da un literal privo di `uid`
    (il vincolo ha solo campi opzionali → nessun aggancio) e ripiega sul vincolo
    stesso: `conUid({ importo, pagata })` diventerebbe un errore "importo non
    esiste su { uid?: string }". Con l'intersezione T si infersce dal literal. */
export function conUid<T>(m: T & { uid?: string }): T & { uid?: string } {
  return m.uid ? m : { ...m, uid: generaUid() };
}

/** Segna una mutazione locale: bump della revisione locale (+1) così supererà
    syncedRev finché il push non la conferma, e aggiorna il timestamp diagnostico.
    NON tocca syncedRev/lastSyncedAt (li scrive il sync). Ritorna una COPIA
    (immutabile, adatto agli update di Zustand). */
export function touchSync<T extends ConSync>(e: T): T {
  return { ...e, syncRev: (e.syncRev ?? 0) + 1, syncUpdatedAt: new Date().toISOString() };
}
