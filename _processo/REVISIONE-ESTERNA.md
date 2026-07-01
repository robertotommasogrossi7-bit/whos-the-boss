# REVISIONE ESTERNA — Red team "senior" (2026-07-01)

> Review nei panni di un ingegnere senior con esperienza di app in produzione, sul **processo**
> e sul **risultato attuale**. Serve a NON perdere le critiche e a legarle a una linea di
> produzione ordinata. Ogni finding ha un ID (Fn), severità e **dove si risolve**.
> Fatti raccolti da codice/git reali (non a naso): 304 commit; niente `.github/workflows`;
> nessun `resetPasswordForEmail`; `packages/state` e `apps/mobile` senza test; `.env` non tracciato.

## Verdetto (TL;DR)
Architettura e disciplina di processo **da manuale**; la logica critica (soldi) è pura e test-first.
**Ma** dopo 304 commit l'app è stata costruita **due volte** (web → RN) e **non è mai girata su un
device reale**, **non c'è CI**, **nessun test d'integrazione**, **nessun recupero password**, **zero
utenti** — e si sta costruendo backend (identità/sync/ruoli) prima di validare runtime e prodotto.
Principio guida della correzione: **de-risk prima di aggiungere superficie.**
(`expo export` prova che il bundle *compila*, non che l'app *funziona*.)

## Cosa va bene (da tenere)
- Separazione **core / state / UI**, logica pura, niente Tailwind → il pivot RN ha riusato il "cervello".
- **Soldi puri e test-first** (settlement/uscita/timer): il dominio a più alto rischio è il meglio coperto.
- **R6**: ricerca-prima-della-spec, pattern Supabase canonico, deep link **senza** nuove dip, kludge rimosso.
- Igiene segreti (`.env` gitignored, anon key pubblica + RLS).
- Artefatti di processo (DECISIONI/CONTESTO/MAPPA, micro-commit, Co-Author): ottimi per handoff e CV.

## Registro dei finding

| ID | Sev | Finding | Stato | Dove si risolve |
|----|-----|---------|-------|-----------------|
| **F1** | ALTA | Mai girata su **device reale**: runtime non verificato (bundle ≠ funziona). | aperto | **R6.V** (gate) |
| **F2** | ALTA | Garanzia R6 dipende da step **manuale** in dashboard; codice+schema non viaggiano insieme. | mitigato (migration applicata); pipeline aperta | **I2** |
| **F3** | ALTA | Migration mai **eseguita/validata**. | applicata + verifica query ok; manca prova **signup reale** | **R6.V** |
| **F4** | ALTA | **Niente CI**: il "verde" gira solo in locale. | aperto | **I1** |
| **F5** | ALTA | **Nessun recupero password** → lockout permanente. | aperto | **R6.6** |
| **F6** | MEDIA | Errore trigger mappato **troppo largo** (ogni errore → "Username già in uso"). | aperto | **R6.7** |
| **F7** | MEDIA | **Enumerazione username** (profiles select pubblico + RPC anon). | accettato per app-tra-amici; rivedere se cresce | **R8** |
| **F8** | MEDIA | Su **device condiviso** due account vedono lo stesso Personale/leghe (local non partizionato). | aperto | **R7** (+ stopgap) |
| **F9** | MEDIA | **Zero test** d'integrazione e sullo **store**. | aperto | **R6.8** (store) + E2E in H4 |
| **F10** | MEDIA | Nessun **crash/error reporting**. | aperto | **H1** |
| **F11** | MEDIA | Nessuna **privacy policy / ToS** (richieste da store + account). | aperto | **H3** |
| **F12** | BASSA | Email via **SMTP integrato** (rate-limit/spam) → flusso conferma flaky. | aperto | **H2** |
| **F13** | BASSA | Ramo **demo-without-id** in `assicuraGiocatorePersonale` mezzo supportato. | aperto | **R6.7** |
| **F14** | BASSA | **Debito dep Expo R0.3**: 6 dep inutili (`@expo/ui`, `expo-device`, `expo-glass-effect`, `expo-image`, `expo-symbols`, `expo-web-browser`). | aperto | **H4** |

## Linea di produzione riordinata (tutti i finding, nell'ordine giusto)
> Autorità dell'ordine: `CONTESTO.md` (sezione LINEA). Qui la versione con i riferimenti Fn.

**TRACK 0 — INFRASTRUTTURA (subito, protegge tutto ciò che segue)**
- **I1 — CI** (GitHub Actions: install → test → build → tsc su push/PR). [F4]
- **I2 — CI migrations** (`supabase db push` su cambi in `supabase/migrations/`; o almeno lint SQL). [F2]

**BLOCCO R6 — CHIUSURA VERA (prima del merge in `main`)**
- **R6.6 — Recupero password** (`resetPasswordForEmail` + schermata reset, riusa il deep link). [F5]
- **R6.7 — Hardening R6** (mapping errore trigger preciso; togliere/decidere il ramo demo-without-id; nota enumerazione). [F6][F13][F7]
- **R6.8 — Test dello store** (state: auth/applyUtente/assicuraPersonale/idBloccati/rimuovi/rinomina con storage in-memory). [F9]
- **R6.V — Verifica su device reale** (dev build: runtime + signup reale + unicità + ritorno-in-app dalla mail). [F1][F3] → **GATE**
- **→ Merge `rn-r6-identita` → `main`** (solo dopo R6.V verde).

**BLOCCO BACKEND (sul modello definitivo)**
- **R7 — Sync dati cross-device** (+ **partition per account** e clear-local al cambio account). [F8]
- **R8 — Ruoli & condivisione** (+ rivedere permessi/enumerazione profiles). [F7]
- **R9 — Realtime & social**.

**BLOCCO PRE-PUBBLICAZIONE — HARDENING**
- **H1 — Crash/error reporting** (Sentry o simile). [F10]
- **H2 — SMTP custom** (Resend/Postmark). [F12]
- **H3 — Privacy policy + ToS**. [F11]
- **H4 — Pulizia debito** (dep Expo R0.3 [F14]; E2E; editor livelli torneo, foto lega = vecchio R10).

**BLOCCO TRAGUARDO**
- **R12 — Restyle grande** · **RP — Pubblicazione** (EAS Build → screenshot → store → EAS Update OTA).
- (R11 feature nuove = slot aperto in IDEE, prima del restyle.)
