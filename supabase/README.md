# Supabase — backend di *who's the boss*

Migrazioni versionate del database (identità, ruoli, sync). Il progetto Supabase
vive nella dashboard (URL + anon key in `apps/mobile/.env`, gitignorato); qui sta
lo **schema come codice**, così è riproducibile e mostra il processo.

## Migrazioni — inventario numerato (7 file totali, applicare in ordine 1→7)

> ⚠️ **Fonte di verità sullo stato**: questa tabella. Se un'altra chat/nota dice qualcosa di diverso,
> fidati di QUESTA tabella (e ri-conferma con l'utente prima di dare per applicato un file nuovo).

| # | File | Fase | Cosa fa | Stato |
|---|------|------|---------|-------|
| 1 | `migrations/20260701120000_r6_profiles_username.sql` | R6 | Tabella `profiles` + **username univoco** (handle case-insensitive), RLS, trigger `handle_new_user`, RPC `username_available`, backfill account R2. | ✅ **APPLICATA** |
| 2 | `migrations/20260701140000_r6_hardening.sql` | R6 | Hardening post red-team: profili **PRIVATI**, trigger **a prova di footgun**. | ✅ **APPLICATA** |
| 3 | `migrations/20260701150000_r7_core.sql` | R7.1a | Nucleo sync: `set_updated_at()`, `owns_lega()`, `profiles.imported_at`; tabelle **leghe · giocatori · giochi_lega**. | ✅ **APPLICATA** |
| 4 | `migrations/20260701150100_r7_poker.sql` | R7.1b | Poker: `partite_poker · partita_poker_giocatori · poker_movimenti · settlements`. | ✅ **APPLICATA** |
| 5 | `migrations/20260701150200_r7_multigioco.sql` | R7.1c | Multigioco: `serate · sessioni_gioco · partite_gioco` + ponti. | ✅ **APPLICATA** |
| 6 | `migrations/20260703100000_r6b5_hardening.sql` | R6-B5 | Hardening post-audit: `ON DELETE SET NULL` (M14) · trigger `updated_at` split insert/update (B31+B35) · `poker_movimenti` **append-only vero** (B32) · `UNIQUE(partita_id,giocatore_id)` (B33) · RLS `(select ...)` + `TO authenticated` su ~17 policy (B34). + query di verifica M14 in fondo al file. | ✅ **APPLICATA** (confermato dall'utente 2026-07-11) |
| 7 | `migrations/20260714140000_grants_authenticated.sql` | R7.2d-5 | **GRANT DML espliciti** a `authenticated` (schema-as-code portabile). Scoperto dal **gate su DB reale**: senza, un DB ricreato da zero dà `permission denied for table` (i grant di default ci sono sul cloud, non in un ambiente pulito). Idempotente/additiva. | ✅ **APPLICATA** (locale: gate d5 · cloud: confermato dall'utente 2026-07-17) |

| 8 | `migrations/20260717120000_r73_import_rpc.sql` | R7.3b | **RPC `import_locale(payload jsonb)`**: travaso one-shot del db locale (13 tabelle + 4 ponti) in **una transazione** (PostgREST). `SECURITY INVOKER` (RLS attiva) · **guardia atomica** su `profiles.imported_at` (I-R1: due import concorrenti non passano entrambi) · payload **versionato** (I-R7) · insert **parent-first** (I-R2: la RLS non è deferibile) · ritorna i **conteggi per tabella** (I-R6) · `grant execute` (I-R8). | ⏳ **SCRITTA, non ancora applicata** (né locale né cloud): attende il gate d'integrazione (`pnpm gate:import`) su Supabase locale |

> ✅ Le migration **1→7 sono APPLICATE sul cloud** (1→6 il 2026-07-11; #7 il 2026-07-17): per esse
> cloud e repo sono allineati. La **#8 è nuova e non applicata da nessuna parte** — prima va verde il
> gate in locale, poi si applica al cloud (con conferma esplicita, come sempre).
> ✅ **Sync vero validato in locale** (gate `scripts/gate-db.mjs`, R7.2d-5): round-trip, RLS owner-only,
> upsert-by-uid, `updated_at` server-side — 8/8 verdi su Postgres reale ricreato da zero.

## Come applicarla

**Opzione A — Supabase CLI** (consigliata, "modo pulito"):
```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

**Opzione B — Dashboard**: SQL Editor → incolla il contenuto del file `.sql` → Run.

## Azioni una-tantum in dashboard (necessarie per R6)

1. **Applicare la migration** (sopra).
2. **Deep link conferma email (R2.4)** → *Authentication → URL Configuration → Redirect URLs*:
   aggiungere `whostheboss://**`. Lo `scheme` dell'app è già `whostheboss` (`apps/mobile/app.json`).
3. **Conferma email** resta **ON** (scelta 2026-06-13): dopo il signUp l'utente riceve la mail; il
   link riapre l'app via deep link e crea la sessione (gestito in `_layout`, R6.4).

> ⚠️ **Nota Expo Go (B29, audit 2026-07-03)**: il deep link **NON funziona in Expo Go** — lì lo scheme
> è `exp://…`, non `whostheboss://`, quindi resta fuori dalla allowlist e il link non riapre l'app.
> Non è un bug: per testare *questo* flusso serve un **dev build** (`npx expo run:android` o EAS dev
> build). Registrazione/unicità username invece si possono provare anche in Expo Go.

> Piano Free: il progetto va in pausa dopo ~1 settimana di inattività (si riattiva da dashboard).
> Vedi `_processo/BACKEND_SPEC.md`.

## ⏳ Azione utente pendente — sanare la migration history (R-mig, audit 2026-07-03)

Le prime 5 migration sono state applicate **incollandole nel SQL Editor**, non con la CLI: la
tabella `supabase_migrations.schema_migrations` (che la CLI usa per sapere cos'è già applicato)
**non le conosce**. Un futuro `supabase db push` proverebbe a ri-applicarle da zero e fallirebbe
(tabelle/policy già esistenti). Fix una-tantum, quando si installa la Supabase CLI:

```bash
supabase link --project-ref <PROJECT_REF>
supabase migration repair --status applied 20260701120000
supabase migration repair --status applied 20260701140000
supabase migration repair --status applied 20260701150000
supabase migration repair --status applied 20260701150100
supabase migration repair --status applied 20260701150200
supabase migration repair --status applied 20260703100000
```

Da quel momento in poi: **solo `supabase db push`** per le nuove migration (niente più copia-incolla
in dashboard), così la history resta sincronizzata.
