import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/* CLIENT SUPABASE (mobile, R2) — sessione persistita su AsyncStorage.
   URL + anon key da EXPO_PUBLIC_* (.env, inlineate da Metro). La anon key e'
   PUBBLICA per design (i dati sono protetti dalle RLS). detectSessionInUrl off
   su RN (niente URL del browser). */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error(
    '[Supabase] Variabili mancanti: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Crea apps/mobile/.env (vedi .env.example).',
  );
}

export const supabase = createClient(url ?? '', anon ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
