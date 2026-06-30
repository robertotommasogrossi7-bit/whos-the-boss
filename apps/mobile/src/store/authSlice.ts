import type { User } from '@whos-the-boss/core';
import type { AuthInjector } from '@whos-the-boss/state';
import type { User as SupabaseUser } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/* Slice AUTH (Supabase) per il MOBILE — iniettata nello store condiviso
   (createAppStore). Stessa logica della web; cambia solo il client (AsyncStorage). */
function mapAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) return 'Email già in uso';
  if (m.includes('invalid login credentials')) return 'Email o password errati';
  if (m.includes('password should be at least')) return 'Password: almeno 6 caratteri';
  if (m.includes('email not confirmed')) return 'Email non confermata: controlla la posta';
  if (m.includes('unable to validate email') || (m.includes('email') && m.includes('invalid'))) return 'Email non valida';
  if (m.includes('should be different')) return 'La nuova password deve essere diversa dalla vecchia';
  if (m.includes('rate limit') || m.includes('too many')) return 'Troppi tentativi, riprova tra poco';
  return msg;
}

/* Riverifica la password attuale (gate per le operazioni sensibili): un
   signInWithPassword sullo stesso utente rinfresca solo la sessione, non cambia
   nulla di visibile. Ritorna un messaggio d'errore o null se la password e' giusta. */
async function verifyCurrentPassword(email: string, currentPassword: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (!error) return null;
  if (error.message.toLowerCase().includes('invalid login credentials')) return 'Password attuale errata';
  return mapAuthError(error.message);
}

function toUser(u: SupabaseUser | null): User | null {
  if (!u) return null;
  const uname = String(u.user_metadata?.username ?? '').trim();
  const username = uname || u.email || 'utente';
  return { username, email: u.email ?? undefined, id: u.id };
}

export const supabaseAuth: AuthInjector = (get) => ({
  initAuth: () => {
    supabase.auth.getSession().then(({ data }) => {
      get().applyUtente(toUser(data.session?.user ?? null));
      get().setAuthLoading(false);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      get().applyUtente(toUser(session?.user ?? null));
    });
  },

  login: async (email, password) => {
    const e = email.trim();
    if (!e || !password) return 'Inserisci email e password';
    const { error } = await supabase.auth.signInWithPassword({ email: e, password });
    return error ? mapAuthError(error.message) : null;
  },

  register: async (username, email, password) => {
    const u = username.trim();
    const e = email.trim();
    if (!u || !e || !password) return 'Compila tutti i campi';
    if (password.length < 6) return 'Password: almeno 6 caratteri';
    const { data, error } = await supabase.auth.signUp({
      email: e, password, options: { data: { username: u } },
    });
    if (error) return mapAuthError(error.message);
    if (!data.session) return 'Registrazione ok — conferma la mail per accedere.';
    return null;
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  updatePassword: async (currentPassword, newPassword) => {
    if (!currentPassword || !newPassword) return 'Compila tutti i campi';
    if (newPassword.length < 6) return 'Nuova password: almeno 6 caratteri';
    const email = get().utente?.email;
    if (!email) return 'Sessione non valida, riaccedi';
    const bad = await verifyCurrentPassword(email, currentPassword);
    if (bad) return bad;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? mapAuthError(error.message) : null;
  },

  updateEmail: async (currentPassword, newEmail) => {
    const e = newEmail.trim();
    if (!currentPassword || !e) return 'Compila tutti i campi';
    const email = get().utente?.email;
    if (!email) return 'Sessione non valida, riaccedi';
    if (e.toLowerCase() === email.toLowerCase()) return 'La nuova email coincide con quella attuale';
    const bad = await verifyCurrentPassword(email, currentPassword);
    if (bad) return bad;
    // Supabase invia la conferma a vecchia + nuova email (secure email change):
    // il cambio si completa solo dopo il click sul link. (Il ritorno in app sara'
    // fluido con il deep link, R2.4.)
    const { error } = await supabase.auth.updateUser({ email: e });
    return error ? mapAuthError(error.message) : null;
  },
});
