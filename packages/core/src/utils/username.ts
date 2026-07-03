/* ══════════════════════════════════════════════════════
   USERNAME — handle univoco dell'account (R6)
   ─────────────────────────────────────────────────────
   Two-tier (stile Discord/Instagram): `username` = handle univoco
   e stabile (identità/ricerca/amici), `display_name` = nome libero.
   Qui vive la validazione "gentile" lato client; la rete di sicurezza
   è il vincolo DB `^[a-z0-9._]{3,20}$` (vedi supabase/migrations R6.1).
   L'app accetta un sottoinsieme di ciò che il DB accetta (più stretto),
   così tutto ciò che passa di qui passa anche il DB.
══════════════════════════════════════════════════════ */

export type EsitoUsername =
  | { ok: true; value: string }
  | { ok: false; error: string };

/** Valida e normalizza un handle. Pura. Trim + minuscolo (come Instagram),
    poi controlla charset/lunghezza/bordi. Ritorna il valore pulito o un
    messaggio d'errore in italiano. Non tocca gli accenti: uno "josé" è un
    errore esplicito (niente strip silenzioso che cambierebbe l'identità). */
export function validaUsername(raw: string): EsitoUsername {
  const v = raw.trim().toLowerCase();
  if (v.length === 0) return { ok: false, error: 'Scegli un username' };
  if (v.length < 3) return { ok: false, error: 'Username: almeno 3 caratteri' };
  if (v.length > 20) return { ok: false, error: 'Username: massimo 20 caratteri' };
  if (!/^[a-z0-9._]+$/.test(v)) {
    return { ok: false, error: 'Solo lettere semplici, numeri, punto e underscore (niente spazi né accenti)' };
  }
  if (/^[._]|[._]$/.test(v)) return { ok: false, error: 'Non può iniziare o finire con . o _' };
  if (/[._]{2,}/.test(v)) return { ok: false, error: 'Niente . o _ ripetuti di fila' };
  return { ok: true, value: v };
}
