# Supabase — backend di *who's the boss*

Migrazioni versionate del database (identità, ruoli, sync). Il progetto Supabase
vive nella dashboard (URL + anon key in `apps/mobile/.env`, gitignorato); qui sta
lo **schema come codice**, così è riproducibile e mostra il processo.

## Migrazioni

| File | Fase | Cosa fa |
|------|------|---------|
| `migrations/20260701120000_r6_profiles_username.sql` | **R6** | Tabella `profiles` + **username univoco** (handle case-insensitive), RLS, trigger `handle_new_user`, RPC `username_available`, backfill account R2. |
| `migrations/20260701140000_r6_hardening.sql` | **R6** | Hardening post red-team: profili **PRIVATI** (via il select pubblico), trigger **a prova di footgun** (username mancante/non conforme → handle derivato, mai blocca il signup). **Va applicata dopo la prima.** |

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

> Piano Free: il progetto va in pausa dopo ~1 settimana di inattività (si riattiva da dashboard).
> Vedi `_processo/BACKEND_SPEC.md`.
