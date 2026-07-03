-- ════════════════════════════════════════════════════════════════════════
-- R7.1a — SCHEMA CORE (sync cross-device) · who's the boss · 2026-07-01
-- Nucleo + macchinario condiviso: leghe · giocatori · giochi_lega.
-- Convenzioni (ripetute da tutte le tabelle R7):
--   id uuid       = identità CLOUD (il client la genera alla creazione; default di sicurezza qui)
--   local_id int  = ponte col modello locale (NON è chiave di sync/upsert; puo' ripetersi tra device)
--   updated_at    = SERVER-authoritative (trigger set_updated_at), per il Last-Write-Wins sicuro
--   deleted_at    = soft-delete/tombstone ("disattivato", lo storico resta)
--   RLS           = solo-proprietario (vedi/tocchi solo le righe delle TUE leghe). Condivisione = R8.
-- FK DEFERRABLE INITIALLY DEFERRED → il sync puo' inserire in qualsiasi ordine dentro una transazione.
-- ════════════════════════════════════════════════════════════════════════

-- ── Macchinario condiviso ───────────────────────────────────────────────

-- updated_at scritto dal SERVER (mai il clock del client → niente perdita da clock-skew)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Guard d'import one-shot: si valorizza quando i dati locali sono stati importati (import ≠ sync)
alter table public.profiles add column if not exists imported_at timestamptz;

-- ── leghe ───────────────────────────────────────────────────────────────
create table if not exists public.leghe (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  local_id       int,
  nome           text not null,
  foto           text,               -- oggi dataURL; → Supabase Storage in R10
  personale      boolean not null default false,
  mono_gioco_id  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index if not exists leghe_owner_idx on public.leghe(owner_id);
-- una sola lega "Personale" per account (dedup semantico all'import)
create unique index if not exists leghe_personale_uniq on public.leghe(owner_id) where personale;

-- Helper RLS: "sono io il proprietario di questa lega?" (SECURITY DEFINER → bypassa la RLS di leghe)
create or replace function public.owns_lega(p_lega_id uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.leghe l where l.id = p_lega_id and l.owner_id = auth.uid()
  );
$$;

create trigger leghe_set_updated_at before insert or update on public.leghe
  for each row execute function public.set_updated_at();

alter table public.leghe enable row level security;
drop policy if exists leghe_owner on public.leghe;
create policy leghe_owner on public.leghe for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ── giocatori (la tabella-PERNO: risolve id_nome; ospiti = account_id null) ─
create table if not exists public.giocatori (
  id                     uuid primary key default gen_random_uuid(),
  lega_id                uuid not null references public.leghe(id) on delete cascade deferrable initially deferred,
  local_id               int,
  nome                   text not null,
  account_id             uuid references public.profiles(id),  -- null = OSPITE; valorizzato = membro reale (claim)
  created_by_account_id  uuid references public.profiles(id),  -- il GESTORE che ha creato l'ospite ("vive nel suo profilo")
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz
);
create index if not exists giocatori_lega_idx on public.giocatori(lega_id);
create index if not exists giocatori_account_idx on public.giocatori(account_id);
create index if not exists giocatori_creatore_idx on public.giocatori(created_by_account_id);

create trigger giocatori_set_updated_at before insert or update on public.giocatori
  for each row execute function public.set_updated_at();

alter table public.giocatori enable row level security;
drop policy if exists giocatori_owner on public.giocatori;
create policy giocatori_owner on public.giocatori for all
  using (public.owns_lega(lega_id)) with check (public.owns_lega(lega_id));

-- ── giochi_lega (per i PRESET salviamo solo gioco_key+attivo; il resto dal catalogo giochi.ts) ─
create table if not exists public.giochi_lega (
  id                      uuid primary key default gen_random_uuid(),
  lega_id                 uuid not null references public.leghe(id) on delete cascade deferrable initially deferred,
  gioco_key               text not null,          -- 'magic' | 'scopa' | 'custom-<ts>' (referenziato da sessioni_gioco)
  nome                    text,                    -- solo per i custom; preset → catalogo
  preimpostato            boolean not null default false,
  foto                    text,
  accent                  text,
  attivo                  boolean not null default true,
  pareggio_come_vittoria  boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz
);
create index if not exists giochi_lega_idx on public.giochi_lega(lega_id);

create trigger giochi_lega_set_updated_at before insert or update on public.giochi_lega
  for each row execute function public.set_updated_at();

alter table public.giochi_lega enable row level security;
drop policy if exists giochi_lega_owner on public.giochi_lega;
create policy giochi_lega_owner on public.giochi_lega for all
  using (public.owns_lega(lega_id)) with check (public.owns_lega(lega_id));
