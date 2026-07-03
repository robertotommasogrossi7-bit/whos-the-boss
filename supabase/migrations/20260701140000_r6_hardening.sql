-- ════════════════════════════════════════════════════════════════════════
-- R6 HARDENING (post red-team esterno) · who's the boss · 2026-07-01
-- Concessioni E4 (trigger footgun) + E5 (profili pubblici → privati).
-- Migration FORWARD (la 20260701120000 è già applicata → non si riscrive: si ALTERa).
-- ════════════════════════════════════════════════════════════════════════

-- E5 — Profili PRIVATI: via il SELECT pubblico (enumerazione anonima degli handle).
-- Ognuno legge solo il proprio profilo. L'availability resta garantita dalla RPC
-- username_available (SECURITY DEFINER → bypassa RLS) e l'unicità dall'unique index.
-- La ricerca-per-username (sharing/amicizie) arriverà con una RPC controllata (R8/R9).
drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- E4 — Trigger a prova di footgun: NON deve MAI far fallire un signup per uno
-- username mancante/non conforme (NOT NULL o CHECK violation). Se i metadata non
-- portano un handle valido, ne deriva uno dall'uuid (formato garantito, unico).
-- L'UNICO fallimento legittimo resta la collisione sull'unique index (= "handle
-- già preso", che il client mappa e il pre-check rende raro). Il percorso app
-- passa sempre un handle già validato (validaUsername), quindi il fallback scatta
-- solo per signup non-app (es. futuro OAuth / API dirette).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uname text := lower(nullif(trim(new.raw_user_meta_data->>'username'), ''));
begin
  if uname is null or uname !~ '^[a-z0-9._]{3,20}$' then
    uname := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, uname, nullif(new.raw_user_meta_data->>'display_name', ''));
  return new;
end;
$$;
