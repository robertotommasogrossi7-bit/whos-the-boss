-- ════════════════════════════════════════════════════════════════════════
-- R6.1 — Identità reale: tabella `profiles` + username UNIVOCO
-- who's the boss · 2026-07-01
--
-- Manda in pensione il kludge "sei tu" calcolato dal nome: l'username diventa
-- un handle UNIVOCO e stabile (stile Discord/Instagram), garantito dal DB.
-- Modello two-tier: `username` = handle univoco (identità/ricerca/amici) +
-- `display_name` = nome visualizzato libero (opzionale).
--
-- Ricerca a monte: pattern canonico Supabase (profiles 1:1 con auth.users,
-- popolata da trigger SECURITY DEFINER su auth.users; univocità = UNIQUE a
-- livello DB + pre-check applicativo per la UX). Vedi _processo/DECISIONI.md.
-- ════════════════════════════════════════════════════════════════════════

-- 1) Tabella profiles (1:1 con auth.users; cade con l'account)
create table if not exists public.profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  username     text        not null,
  display_name text,
  created_at   timestamptz not null default now()
);

-- 2) Univocità case-insensitive dell'handle (unique index su lower(username)):
--    "Mario" e "mario" collidono. Niente citext → nessuna extension richiesta.
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

-- 3) Formato handle: minuscole, cifre, punto, underscore; 3–20 char.
--    Rete di sicurezza lato DB; la validazione "gentile" (no punti ai bordi,
--    messaggi) vive in core/validaUsername (R6.2).
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-z0-9._]{3,20}$');

-- 4) RLS
alter table public.profiles enable row level security;

-- Lettura pubblica: gli handle sono pubblici come su ogni social (serve per
-- l'availability e per le amicizie R9). Le email NON stanno qui (sono in
-- auth.users, non esposte).
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select
  using (true);

-- Scrittura: ognuno solo la propria riga.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 5) Trigger: alla nascita di un auth.users crea il profilo dai metadata
--    (l'app passa `username`/`display_name` in signUp → options.data).
--    SECURITY DEFINER + search_path='' (best practice: tutto schema-qualified).
--    L'INSERT gira nella stessa transazione del signUp: se l'handle è già preso
--    l'unique index fa fallire (e roll-back) → niente auth.user orfano. Il
--    pre-check applicativo rende la collisione un caso di gara raro; l'errore
--    viene mappato a "Username già in uso" lato client (R6.3).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    lower(new.raw_user_meta_data->>'username'),
    nullif(new.raw_user_meta_data->>'display_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6) RPC availability: pre-check disponibilità handle in registrazione (anon).
create or replace function public.username_available(candidate text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(candidate)
  );
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- 7) Backfill degli account già esistenti (R2): crea il profilo mancante SOLO
--    per gli handle che già rispettano il formato. Quelli "sporchi" (spazi/
--    accenti/maiuscole non riducibili) restano senza profilo → l'app li manda a
--    "completa il profilo" al login (R6.3). `on conflict do nothing` = safe su
--    collisioni di handle tra vecchi account demo. Non fa mai fallire la migration.
insert into public.profiles (id, username)
select u.id, lower(u.raw_user_meta_data->>'username')
from auth.users u
where u.raw_user_meta_data->>'username' is not null
  and lower(u.raw_user_meta_data->>'username') ~ '^[a-z0-9._]{3,20}$'
  and not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;
