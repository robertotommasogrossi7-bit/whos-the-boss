import AsyncStorage from '@react-native-async-storage/async-storage';

import { createAppStore, selectCurrentLega } from '@whos-the-boss/state';

import { supabaseAuth } from './authSlice';

/* Store del MOBILE = store condiviso (@whos-the-boss/state) persistito su
   AsyncStorage + auth Supabase (R2) iniettata. I componenti usano `useStore`
   da qui come prima. */
export const useStore = createAppStore({
  storage: {
    getItem: (name) => AsyncStorage.getItem(name),
    setItem: (name, value) => AsyncStorage.setItem(name, value),
    removeItem: (name) => AsyncStorage.removeItem(name),
  },
  auth: supabaseAuth,
});

export { selectCurrentLega };
