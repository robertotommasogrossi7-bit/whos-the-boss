/* ══════════════════════════════════════════════════════
   PRIMA SEMINA DEL CLOUD — gli agganci veri (R7.3c)
   ─────────────────────────────────────────────────────
   La logica (ordine, rami, contratto O.3) vive in `orchestraImport` nel core,
   testata senza device. Qui ci sono solo i fili: store, disco, rete.

   ⚠️ Da R7.4f NON esiste più una schermata che la lancia: la chiama il ciclo
   di sync (`lib/sync.ts` → dep `eseguiImport`) quando il cloud dell'account è
   vergine. L'utente non preme niente — non era una sua decisione.
══════════════════════════════════════════════════════ */

import { orchestraImport, type DepsImport, type EsitoImport, type PayloadImport } from '@whos-the-boss/core';
import { chiaveStorage, STORE_KEY } from '@whos-the-boss/state';

import { supabase } from '@/lib/supabase';
import { mobileStorageAdapter, useStore } from '@/store/useStore';

/* Zustand persist scrive su AsyncStorage in modo ASINCRONO e non espone una
   conferma. Ma I-R5 chiede che gli uid siano davvero su disco PRIMA di
   spedirli (dopo un crash il retry deve rispedire gli stessi uid, non
   generarne di nuovi → altrimenti il primo sync duplica tutto). L'unica
   conferma onesta è rileggere: cerchiamo l'uid nel blob salvato. */
const TENTATIVI = 20;
const ATTESA_MS = 50;

async function confermaPersist(chiave: string, uidDiControllo: string): Promise<boolean> {
  for (let i = 0; i < TENTATIVI; i++) {
    const raw = await mobileStorageAdapter.getItem(chiave);
    if (raw?.includes(uidDiControllo)) return true;
    await new Promise((r) => setTimeout(r, ATTESA_MS));
  }
  return false;
}

/**
 * Esegue l'import del db locale sul cloud. Non lancia: ogni esito è un valore
 * (vedi `EsitoImport`). Il db locale NON viene mai cancellato — resta lui la
 * copia di sicurezza se qualcosa va storto.
 */
export async function importaSulCloud(): Promise<EsitoImport> {
  const { utente, sostituisciDb } = useStore.getState();
  const accountId = utente?.id;
  if (!accountId) return { stato: 'errore', messaggio: 'Devi aver fatto l\'accesso per importare i dati.' };

  const chiave = chiaveStorage(STORE_KEY, accountId);

  const deps: DepsImport = {
    leggiDb: () => useStore.getState().db,
    scriviDb: sostituisciDb,
    confermaPersist: (uid) => confermaPersist(chiave, uid),
    chiamaRpc: async (payload: PayloadImport) => {
      const { data, error } = await supabase.rpc('import_locale', { payload });
      if (error) return { errore: error.message };
      return { conteggi: (data ?? {}) as Record<string, number> };
    },
    ownerId: accountId,
  };

  return orchestraImport(deps);
}

/* `contaDatiLocali` (righe che l'import manderebbe) è stato rimosso con la
   schermata "Carica i dati" in R7.4f: la semina è automatica, non c'è più una
   UI che debba dire "sto per caricare N elementi". */
