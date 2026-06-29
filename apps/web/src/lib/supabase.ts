import { createClient } from '@supabase/supabase-js';

/* ══════════════════════════════════════════════════════
   CLIENT SUPABASE (B1 — Auth reale)
   URL + anon key da `.env` (gitignored; vedi `.env.example`).
   La anon key è PUBBLICA per design (i dati sono protetti dalle RLS).
══════════════════════════════════════════════════════ */
const url  = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error(
    '[Supabase] Variabili mancanti: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Crea apps/web/.env (vedi .env.example).',
  );
}

export const supabase = createClient(url, anon);
