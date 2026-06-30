import AsyncStorage from '@react-native-async-storage/async-storage';

import { createAppStore, selectCurrentLega } from '@whos-the-boss/state';

/* Store del MOBILE = store condiviso (@whos-the-boss/state) persistito su
   AsyncStorage. Niente auth fino a R2 → lo store usa i default no-op
   (initAuth azzera authLoading, login/register/logout no-op). */
export const useStore = createAppStore({
  storage: {
    getItem: (name) => AsyncStorage.getItem(name),
    setItem: (name, value) => AsyncStorage.setItem(name, value),
    removeItem: (name) => AsyncStorage.removeItem(name),
  },
});

export { selectCurrentLega };
