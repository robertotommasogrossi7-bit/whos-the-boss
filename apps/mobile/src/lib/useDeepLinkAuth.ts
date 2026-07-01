import { parseAuthRedirect } from '@whos-the-boss/core';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

/* DEEP LINK AUTH (R6.4 / R2.4) — gestisce il ritorno in app dal link di
   conferma email (o cambio email). Supabase riapre l'app via scheme
   whostheboss:// col risultato nel fragment dell'URL; qui estraiamo i token
   (parser puro in core) e creiamo la sessione. Al successo, onAuthStateChange
   setta `utente` e il gate in _layout passa da solo all'app.
   Config una-tantum in dashboard: Redirect URLs = whostheboss://** (vedi supabase/README). */
export function useDeepLinkAuth(): void {
  const toast = useStore((s) => s.toast);

  useEffect(() => {
    async function handle(url: string | null): Promise<void> {
      if (!url) return;
      const r = parseAuthRedirect(url);
      if (r.kind === 'session') {
        const { error } = await supabase.auth.setSession({
          access_token: r.access_token,
          refresh_token: r.refresh_token,
        });
        toast(error ? 'Conferma non riuscita, riprova' : 'Email confermata!');
      } else if (r.kind === 'error') {
        const expired = /expired|invalid/i.test(r.description);
        toast(expired ? 'Link scaduto o non valido — richiedi una nuova email' : r.description);
      }
    }

    // cold start (app aperta dal link) + warm (app gia' in background)
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, [toast]);
}
