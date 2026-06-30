import { createAppStore, selectCurrentLega } from '@whos-the-boss/state';

import { supabaseAuth } from './authSlice';
import { vanillaCompatStorage } from './vanillaCompatStorage';

/* Store della WEB = store condiviso (@whos-the-boss/state) con localStorage
   (retrocompat vanilla) + auth Supabase iniettati. I componenti importano
   `useStore` / `selectCurrentLega` da qui come prima: l'API non cambia. */
export const useStore = createAppStore({ storage: vanillaCompatStorage, auth: supabaseAuth });

export { selectCurrentLega };
