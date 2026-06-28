# FASE B1 — Auth reale (Supabase Auth) — PROMPT di fase

> **Chi sei**: chat di fase **Sonnet**. Leggi `METODO.md` (Desktop) + `_processo/CONTESTO.md` +
> `_processo/BACKEND_SPEC.md`. Poi questo prompt. **Implementi solo B1.** Micro-commit, push dopo OGNI
> commit. **NON** mergi in `main`. ⚠️ È **auth**: la review della chat base sarà attenta.

## Obiettivo
Sostituire il **login demo** con **Supabase Auth reale** (email + password). `utente` = account reale,
sessione **persistente** (reload / multi-device). I **dati restano LOCALI** (la sync è B2). Il resto
dell'app **non** cambia comportamento; in particolare il **"sei tu" (#4.5) continua a funzionare**
(l'username del tuo account aggancia il tuo giocatore nel Personale).

## Prerequisiti (già pronti dalla chat base)
- `poker-react/.env` (**gitignored**) con `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. **Non**
  committarlo, **non** stampare la key in log/commit. C'è `.env.example` come riferimento.
- Progetto Supabase **live**, Auth/GoTrue attivo, email/password pronto.
- ⚠️ **Step manuale (utente, nel dashboard)**: Authentication → **disattivare "Confirm email"** per il
  dev (così il signup logga subito senza verifica mail). Se è ancora ON, **segnalalo** nel messaggio finale.

## Deliverable
1. **Dipendenza**: `npm install @supabase/supabase-js`.
2. **Client**: `src/lib/supabase.ts` → `createClient(import.meta.env.VITE_SUPABASE_URL,
   import.meta.env.VITE_SUPABASE_ANON_KEY)`. Tipizza le env in `src/vite-env.d.ts`
   (`ImportMetaEnv` con le due `VITE_*`). Se mancano → errore chiaro in console (fail-fast).
3. **Store auth → async** (mantieni il contratto **`string | null`** per gli errori, così la UI resta semplice):
   - `register(username, email, password)` → `supabase.auth.signUp({ email, password, options: { data: { username } } })`.
     Username in `user_metadata`. Errore Supabase → stringa **in italiano**.
   - `login(email, password)` → `supabase.auth.signInWithPassword({ email, password })`. **Login per EMAIL**
     (Supabase richiede l'email; l'username resta solo come display name).
   - `logout()` → `supabase.auth.signOut()`.
   - Diventano **async** (`Promise<string | null>`): aggiorna i chiamanti (`LoginScreen` con `await`).
   - **`utente`** derivato dalla sessione: `{ username: user.user_metadata.username ?? user.email,
     email: user.email, id: user.id }`. **Rimuovi** il vecchio `utente` da sessionStorage
     (`readUtente`/`USER_KEY`): la sessione la gestisce il SDK Supabase (persist su localStorage).
   - **Boot/restore**: `supabase.auth.getSession()` per ripristinare + `supabase.auth.onAuthStateChange(...)`
     per tenere `utente` sincronizzato. Quando `utente` è settato → **chiama `assicuraTuNelPersonale`**
     (la logica #4.5 resta identica: cambia solo la *fonte* dello username).
4. **`App.tsx` — restore SENZA flash**: la sessione si ripristina in modo **asincrono** → aggiungi uno
   stato **`authLoading`** (nello store): finché è `true`, mostra un **loader minimale** invece di lasciar
   decidere a `RequireAuth` (altrimenti al refresh ti sbatte su `/login` prima del restore). A restore
   finito → `authLoading = false`.
5. **`LoginScreen.tsx`**:
   - Tab **Accedi**: campo **Email** (non più "Username o Email") + Password → `await login(email, pwd)`.
   - Tab **Registrati**: Username + Email + Password → `await register(...)`.
   - `doLogin`/`doRegister` **async** con `await`; errori → `toast(err)`.
   - Aggiorna la nota in fondo: da "demo, non salvati su server" → **"accesso reale (Supabase)"**.

## ⛔ Fuori scope (B2/B3 — NON qui)
- **Sync dati su Postgres**, tabelle, RLS, import del localStorage → **B2**.
- **Ruoli, condivisione leghe, trasferimento storico guest** → **B3**.
- **OAuth Google** → dopo.
- I **dati di gioco restano in localStorage** (Zustand persist invariato). Qui cambia **solo l'autenticazione**.

## Attenzioni
- **Mai** hardcodare URL/key: sempre da `import.meta.env`. Non loggare la key. Non committare `.env`.
- Non rompere il `db`/persist, il **"sei tu"**, la logica di gioco. È un cambio **solo di auth**.
- Errori Supabase **in italiano** e robusti: email già usata, password debole/<6, credenziali errate,
  email non confermata.

## Micro-commit suggeriti
1. `feat(B1): dipendenza supabase-js + client src/lib/supabase.ts + tipi env`
2. `feat(B1): store auth async su Supabase (signUp/signIn/signOut) + utente da sessione`
3. `feat(B1): restore sessione + onAuthStateChange + authLoading (no flash) + sei-tu agganciato`
4. `feat(B1): LoginScreen reale (login per email, registrazione, async) + nota aggiornata`

## Checklist fine-fase
1. `npx tsc -b` + `npm run lint` + `npm test` verdi (baseline **147**; l'auth si verifica a browser, le pure restano verdi).
2. `git push` (branch `backend-b1-auth`).
3. Messaggio finale: micro-step + **test browser** (sotto) + se "Confirm email" è ancora ON **segnalalo** +
   "apri chat di review separata per il merge".
4. **NON** mergiare in `main`.

## Test browser (per il messaggio finale)
- **Registrazione**: Registrati (username "Zelda" + email + password) → loggato, atterri sulla Home; in
  **Personale → Giocatori** compare **"Zelda" con badge "sei tu"** (il #4.5 funziona col nuovo account).
- **Refresh**: ricarichi → **resti loggato** (niente bounce su `/login`).
- **Logout → Login**: esci, rientri con **email + password** → ok.
- **Errori**: email già usata / password < 6 / credenziali sbagliate → messaggi chiari in italiano.
- Il resto (leghe, classifica, storico, poker) **funziona come prima** (dati ancora locali).
