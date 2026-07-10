import type { StateStorage } from 'zustand/middleware';

/* ══════════════════════════════════════════════════════
   STORAGE PER-ACCOUNT (R7.2b, M12)
   ─────────────────────────────────────────────────────
   Oggi la persistenza locale vive sotto UNA chiave fissa (STORE_KEY):
   due login sullo stesso device mescolerebbero i dati. Qui le funzioni
   pure per namespacizzare la chiave per accountId + la migrazione
   one-shot dal vecchio blob unico. Il wiring nel boot dell'app (quando
   diventa noto l'accountId, prima che lo store venga letto) è un passo
   a parte: tocca l'ordine hydration→initAuth, oggi il primo hydrate è
   automatico e avviene PRIMA che l'account sia noto.
══════════════════════════════════════════════════════ */

/** Chiave storage per l'account. Senza accountId (demo/offline) resta la
    chiave legacy invariata: comportamento pre-R7.2, nessuna rottura. */
export function chiaveStorage(base: string, accountId?: string | null): string {
  return accountId ? `${base}:${accountId}` : base;
}

/** StateStorage che re-instrada ogni chiamata sulla chiave dell'account
    CORRENTE, letta da getAccountId() al momento della chiamata (non alla
    creazione): l'account può diventare noto dopo il boot. */
export function perAccountStorage(
  base: StateStorage,
  getAccountId: () => string | null | undefined,
): StateStorage {
  return {
    getItem: (name) => base.getItem(chiaveStorage(name, getAccountId())),
    setItem: (name, value) => base.setItem(chiaveStorage(name, getAccountId()), value),
    removeItem: (name) => base.removeItem(chiaveStorage(name, getAccountId())),
  };
}

/** Migrazione one-shot: se la chiave dell'account non ha ancora nulla ma
    esiste il vecchio blob unico (pre-R7.2), lo copia (NON lo cancella:
    reversibile, best-effort su device singolo-utente — più account sullo
    stesso device durante la transizione ricevono ciascuno una copia dello
    stato al momento del proprio primo login). Idempotente: se la chiave
    dell'account ha già qualcosa, non tocca nulla. */
export async function migraBlobUnicoSeNecessario(
  base: StateStorage,
  storeKey: string,
  accountId: string,
): Promise<void> {
  const chiaveAccount = chiaveStorage(storeKey, accountId);
  const giaPresente = await base.getItem(chiaveAccount);
  if (giaPresente != null) return;
  const legacy = await base.getItem(storeKey);
  if (legacy == null) return;
  await base.setItem(chiaveAccount, legacy);
}
