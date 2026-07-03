/* ══════════════════════════════════════════════════════
   DEEP LINK AUTH — parser del redirect Supabase (R6.4 / R2.4)
   ─────────────────────────────────────────────────────
   Quando l'utente clicca il link di conferma email, Supabase riapre
   l'app (scheme whostheboss://) col risultato nel FRAGMENT dell'URL
   (flow implicito): `#access_token=…&refresh_token=…&type=signup`
   in caso di successo, oppure `#error=…&error_description=…` in caso
   di link scaduto/non valido.
   Qui la logica di parsing è PURA (testabile, dep-free): l'app la usa
   in _layout con expo-linking e poi chiama supabase.auth.setSession.
══════════════════════════════════════════════════════ */

export type AuthRedirect =
  | { kind: 'session'; access_token: string; refresh_token: string; type?: string }
  | { kind: 'error'; code?: string; description: string }
  | { kind: 'none' };

/** Parsa una stringa `k=v&k=v` (x-www-form-urlencoded): `+`→spazio + decode. */
function parseParams(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of s.split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const rawK = i < 0 ? pair : pair.slice(0, i);
    const rawV = i < 0 ? '' : pair.slice(i + 1);
    const dec = (x: string) => {
      try { return decodeURIComponent(x.replace(/\+/g, ' ')); } catch { return x; }
    };
    out[dec(rawK)] = dec(rawV);
  }
  return out;
}

/** Estrae l'esito auth da un URL di redirect. Preferisce il fragment (#…),
    poi la query (?…). Pura. */
export function parseAuthRedirect(url: string): AuthRedirect {
  const hash = url.indexOf('#');
  const q = url.indexOf('?');
  const frag = hash >= 0 ? url.slice(hash + 1) : q >= 0 ? url.slice(q + 1) : '';
  if (!frag) return { kind: 'none' };
  const p = parseParams(frag);
  if (p.error || p.error_description || p.error_code) {
    return {
      kind: 'error',
      code: p.error_code || p.error || undefined,
      description: p.error_description || 'Link non valido o scaduto',
    };
  }
  if (p.access_token && p.refresh_token) {
    return { kind: 'session', access_token: p.access_token, refresh_token: p.refresh_token, type: p.type || undefined };
  }
  return { kind: 'none' };
}
