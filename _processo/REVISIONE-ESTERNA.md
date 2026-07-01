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

---

# Red team ESTERNO (2026-07-01) — findings aggiuntivi E1–E11

> Verdetto esterno: **CAMBIA** (con BUTTA su pezzi specifici). Lo scheletro (monorepo core/state/mobile,
> test sul core, unique index, account-id anchoring) è sano; il problema è la **sequenza** e il
> **peso morto**. Concessione onesta della chat interna: il piano mascherava "mai eseguita" dietro un
> gate di fase 2 (razionalizzazione). Sotto, i finding + cosa verificato dal codice.

| ID | Sev | Finding esterno | Verificato/Azione |
|----|-----|-----------------|-------------------|
| **E1** | ALTA | La UI **non è MAI stata renderizzata** (`expo export` bundla, non esegue). | → **V0** device ORA |
| **E2** | ALTA | Backend/identità con **zero utenti** = "tetto prima dei muri". Valore-portfolio vero = *usata → access pattern reali → "così progetterei il sync"*. | → **CONGELA R7/R8/R9** |
| **E3** | ALTA | **Parser deep link custom** non esercitato = la cosa più rischiosa (cold/warm, fragment vs query, iOS/Android). | → **A4** verifica su device; se edge → `expo-linking`/handling ufficiale |
| **E4** | ALTA | Trigger su `auth.users`: può **bloccare TUTTI i signup** (non solo edge, es. username mancante = NOT NULL violation); mapping errore troppo largo. | → **A2** hardening trigger |
| **E5** | ALTA | **Profili PUBBLICI** = enumerabili per una feature (ricerca-username) che non esiste; RLS mal configurata = incidente Supabase #1. | → **A1** profili PRIVATI |
| **E6** | MEDIA | **TOCTOU** sul pre-check RPC: la violazione di unicità va gestita **all'insert** a prescindere (il pre-check è solo UX). | → **A2** |
| **E7** | MEDIA | **Step manuale in dashboard** = non riproducibile su repo portfolio pubblico. Fix = Supabase CLI (`db push`) + README, **non** CI-per-migration. | → **A6** (declassa I2) |
| **E8** | MEDIA | **Web congelata** = tassa a valore negativo + confonde su repo pubblico (quale è quella vera?). | → **B3** cancella (+ tag) |
| **E9** | MEDIA | **Recupero password prematuro** con dati local-only (lockout = ri-signup gratis). | → **A5** rimanda a pre-pubblicazione |
| **E10** | — | Verificato dal codice: **soldi** = float + round-a-centesimi (`r100`) → difendibile, non landmine (decidere se migrare a interi). **Segreti**: nessuno hardcoded. **RLS**: esiste ma `select` pubblico → E5. | note |
| **E11** | meta | Il piano interno mascherava "mai eseguita" dietro il gate R6.V = razionalizzazione. | **owned** |

## LINEA v2 (proposta post red-team esterno) — "serio = sistema l'invisibile su ciò che ESISTE, non aggiungi superficie"
> Concilia lo steer dell'utente (features+restyle **ultimissimi**; "apriamola per vedere se va" ma
> **feedback dopo**; fare le cose importanti per un'app **seria**) con i finding esterni. "Serio" =
> qualità invisibile da senior (correttezza, sicurezza, verifica, test, doc), NON più feature.

- **V0 — ORA: accendere la luce** (device). `expo start`/Expo Go sul telefono: la UI si renderizza? nav, hydration store, login? (20 min, serve il tuo telefono.) Cancella la figuraccia n.1. *(feedback amici = dopo, come vuoi tu.)*
- **BLOCCO A — R6 reso serio (hardening):** A1 profili **RLS privati** [E5] · A2 **trigger a prova di footgun** + mapping errore stretto [E4,E6] · A3 **audit RLS** (2° account non legge/scrive il tuo) · A4 **deep link: verifica su device**, swap a lib se serve [E3] · A5 recupero password **rimandato** [E9] · A6 **Supabase CLI + README** (niente CI-migration) [E7].
- **BLOCCO B — igiene "serietà":** B1 **CI test+typecheck** su push (solo questo) · B2 **senior code review pass** (no `any`, no codice morto, no ramo demo-without-id) · B3 **cancella web congelata** (+tag) [E8] · B4 **stati di fallimento** (loading/empty/error/offline) · B5 **README+architettura+decision record+video 2min** (framing onesto "AI sotto mia direzione") · B6 **soldi**: decidere float+r100 vs interi-centesimi [E10].
- **CONGELATO fino a "validato dall'uso":** R7 sync, R8 ruoli, R9 realtime [E2].
- **ULTIMISSIMO (volontà utente):** feature nuove + **restyle grande**; poi pubblicazione/friends-beta con feedback strutturato.
