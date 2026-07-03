-- ════════════════════════════════════════════════════════════════════════
-- R7.1c — SCHEMA MULTIGIOCO (storico salvato) · who's the boss · 2026-07-01
-- serate → sessioni_gioco → partite_gioco. Partecipanti/vincitori = tabelle-ponte
-- verso giocatori (M:N reale). I ponti si sincronizzano "a set pieno per padre"
-- (niente soft-delete sul ponte: un partecipante rimosso = riga tolta).
-- ════════════════════════════════════════════════════════════════════════

-- ── serate (← Lega.serate) ───────────────────────────────────────────────
create table if not exists public.serate (
  id          uuid primary key default gen_random_uuid(),
  lega_id     uuid not null references public.leghe(id) on delete cascade deferrable initially deferred,
  local_id    int,
  data        date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists serate_lega_idx on public.serate(lega_id);
create trigger serate_set_updated_at before insert or update on public.serate
  for each row execute function public.set_updated_at();
alter table public.serate enable row level security;
drop policy if exists serate_owner on public.serate;
create policy serate_owner on public.serate for all
  using (public.owns_lega(lega_id)) with check (public.owns_lega(lega_id));

create table if not exists public.serata_partecipanti (
  serata_id     uuid not null references public.serate(id) on delete cascade deferrable initially deferred,
  giocatore_id  uuid not null references public.giocatori(id) deferrable initially deferred,
  created_at    timestamptz not null default now(),
  primary key (serata_id, giocatore_id)
);
alter table public.serata_partecipanti enable row level security;
drop policy if exists serata_part_owner on public.serata_partecipanti;
create policy serata_part_owner on public.serata_partecipanti for all
  using (exists (select 1 from public.serate s where s.id = serata_id and public.owns_lega(s.lega_id)))
  with check (exists (select 1 from public.serate s where s.id = serata_id and public.owns_lega(s.lega_id)));

-- ── sessioni_gioco (← Lega.sessioniGioco) ────────────────────────────────
create table if not exists public.sessioni_gioco (
  id             uuid primary key default gen_random_uuid(),
  lega_id        uuid not null references public.leghe(id) on delete cascade deferrable initially deferred,
  local_id       int,
  gioco_lega_id  uuid references public.giochi_lega(id) deferrable initially deferred,
  data           date,
  stato          text check (stato in ('pre','attiva','chiusa')),
  ora_inizio     text,
  ora_fine       text,
  esito_pareggio boolean not null default false,
  serata_id      uuid references public.serate(id) deferrable initially deferred,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index if not exists sessioni_gioco_lega_idx on public.sessioni_gioco(lega_id);
create index if not exists sessioni_gioco_serata_idx on public.sessioni_gioco(serata_id);
create trigger sessioni_gioco_set_updated_at before insert or update on public.sessioni_gioco
  for each row execute function public.set_updated_at();
alter table public.sessioni_gioco enable row level security;
drop policy if exists sessioni_gioco_owner on public.sessioni_gioco;
create policy sessioni_gioco_owner on public.sessioni_gioco for all
  using (public.owns_lega(lega_id)) with check (public.owns_lega(lega_id));

create table if not exists public.sessione_gioco_partecipanti (
  sessione_gioco_id  uuid not null references public.sessioni_gioco(id) on delete cascade deferrable initially deferred,
  giocatore_id       uuid not null references public.giocatori(id) deferrable initially deferred,
  created_at         timestamptz not null default now(),
  primary key (sessione_gioco_id, giocatore_id)
);
alter table public.sessione_gioco_partecipanti enable row level security;
drop policy if exists sg_part_owner on public.sessione_gioco_partecipanti;
create policy sg_part_owner on public.sessione_gioco_partecipanti for all
  using (exists (select 1 from public.sessioni_gioco sg where sg.id = sessione_gioco_id and public.owns_lega(sg.lega_id)))
  with check (exists (select 1 from public.sessioni_gioco sg where sg.id = sessione_gioco_id and public.owns_lega(sg.lega_id)));

-- ── partite_gioco (← SessioneGioco.partite) ──────────────────────────────
create table if not exists public.partite_gioco (
  id                 uuid primary key default gen_random_uuid(),
  sessione_gioco_id  uuid not null references public.sessioni_gioco(id) on delete cascade deferrable initially deferred,
  local_id           int,
  ora_inizio         text,
  ora_fine           text,
  pareggio           boolean not null default false,
  nome_libero        text,
  ordine             int,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create index if not exists partite_gioco_sess_idx on public.partite_gioco(sessione_gioco_id);
create trigger partite_gioco_set_updated_at before insert or update on public.partite_gioco
  for each row execute function public.set_updated_at();
alter table public.partite_gioco enable row level security;
drop policy if exists partite_gioco_owner on public.partite_gioco;
create policy partite_gioco_owner on public.partite_gioco for all
  using (exists (select 1 from public.sessioni_gioco sg where sg.id = sessione_gioco_id and public.owns_lega(sg.lega_id)))
  with check (exists (select 1 from public.sessioni_gioco sg where sg.id = sessione_gioco_id and public.owns_lega(sg.lega_id)));

-- ponte vincitori (← PartitaGioco.vincitori)
create table if not exists public.partita_gioco_vincitori (
  partita_gioco_id  uuid not null references public.partite_gioco(id) on delete cascade deferrable initially deferred,
  giocatore_id      uuid not null references public.giocatori(id) deferrable initially deferred,
  created_at        timestamptz not null default now(),
  primary key (partita_gioco_id, giocatore_id)
);
alter table public.partita_gioco_vincitori enable row level security;
drop policy if exists pg_vinc_owner on public.partita_gioco_vincitori;
create policy pg_vinc_owner on public.partita_gioco_vincitori for all
  using (exists (select 1 from public.partite_gioco pg join public.sessioni_gioco sg on sg.id = pg.sessione_gioco_id
                 where pg.id = partita_gioco_id and public.owns_lega(sg.lega_id)))
  with check (exists (select 1 from public.partite_gioco pg join public.sessioni_gioco sg on sg.id = pg.sessione_gioco_id
                 where pg.id = partita_gioco_id and public.owns_lega(sg.lega_id)));

-- ponte partecipanti-override della singola partita (← PartitaGioco.partecipanti, opzionale)
create table if not exists public.partita_gioco_partecipanti (
  partita_gioco_id  uuid not null references public.partite_gioco(id) on delete cascade deferrable initially deferred,
  giocatore_id      uuid not null references public.giocatori(id) deferrable initially deferred,
  created_at        timestamptz not null default now(),
  primary key (partita_gioco_id, giocatore_id)
);
alter table public.partita_gioco_partecipanti enable row level security;
drop policy if exists pg_part_owner on public.partita_gioco_partecipanti;
create policy pg_part_owner on public.partita_gioco_partecipanti for all
  using (exists (select 1 from public.partite_gioco pg join public.sessioni_gioco sg on sg.id = pg.sessione_gioco_id
                 where pg.id = partita_gioco_id and public.owns_lega(sg.lega_id)))
  with check (exists (select 1 from public.partite_gioco pg join public.sessioni_gioco sg on sg.id = pg.sessione_gioco_id
                 where pg.id = partita_gioco_id and public.owns_lega(sg.lega_id)));
