import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

import { chiaveStorage, createAppStore, selectCurrentLega, STORE_KEY } from '@whos-the-boss/state';

import { supabaseAuth } from './authSlice';

/* Adapter storage grezzo (stringhe, non JSON-parsed): usato sia da zustand
   persist sotto sia da migraBlobUnicoSeNecessario (R7.2b) per copiare il
   vecchio blob unico nella chiave dell'account al primo login. */
export const mobileStorageAdapter: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  removeItem: (name) => AsyncStorage.removeItem(name),
};

/* Store del MOBILE = store condiviso (@whos-the-boss/state) persistito su
   AsyncStorage + auth Supabase (R2) iniettata. I componenti usano `useStore`
   da qui come prima. */
export const useStore = createAppStore({
  storage: mobileStorageAdapter,
  auth: supabaseAuth,
});

/**
 * Scrive SUBITO lo stato sul disco e ne aspetta la conferma.
 *
 * Perché serve (bug osservato sul telefono, 2026-07-22: rinomini un giocatore,
 * chiudi e riapri l'app e il nome è tornato indietro): zustand persist salva a
 * ogni modifica, ma in modo ASINCRONO e senza conferma. Se il processo muore
 * nell'istante sbagliato — tipico quando scorri via l'app dalle recenti —
 * l'ultima scrittura resta in volo e non arriva mai sul disco. Al riavvio si
 * rilegge il disco: la modifica non c'è più.
 *
 * Il merge del sync NON c'entra (il dato locale non confermato vince sempre
 * sul cloud, `mergeConPegno`): il buco è a monte, nella persistenza locale.
 *
 * Chiamata quando l'app lascia il primo piano — l'ultimo momento utile prima
 * che il sistema possa ucciderla. Stesso formato di zustand persist
 * ({state:{…partialize}, version:0}) e stessa chiave → è la stessa scrittura,
 * solo garantita.
 */
export async function flushLocale(): Promise<void> {
  const s = useStore.getState();
  const chiave = chiaveStorage(STORE_KEY, s.utente?.id);
  await mobileStorageAdapter.setItem(chiave, JSON.stringify({
    state: {
      db: s.db,
      giocoFiltro: s.giocoFiltro,
      gameBarVisible: s.gameBarVisible,
      gameBarPinned: s.gameBarPinned,
    },
    version: 0,
  }));
}

export { selectCurrentLega };
