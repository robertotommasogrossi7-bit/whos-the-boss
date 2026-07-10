import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

import { createAppStore, selectCurrentLega } from '@whos-the-boss/state';

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

export { selectCurrentLega };
