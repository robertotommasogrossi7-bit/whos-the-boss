-- ════════════════════════════════════════════════════════════════════════
-- R7.1b — SCHEMA POKER (storico salvato) · who's the boss · 2026-07-01
-- partite_poker → partita_poker_giocatori → poker_movimenti (append-only) + settlements.
-- Unità denaro: numeric(10,2) = EURO salvo dove indicato (chip nel commento).
-- ════════════════════════════════════════════════════════════════════════

-- ── partite_poker (← Lega.partite; immutabili una volta salvate) ──────────
create table if not exists public.partite_poker (
  id          uuid primary key default gen_random_uuid(),
  lega_id     uuid not null references public.leghe(id) on delete cascade deferrable initially deferred,
  local_id    int,
  buy_in      numeric(10,2),          -- euro
  data        date,
  ora_inizio  text,                   -- "HH:MM"
  ora_fine    text,
  modalita    text not null check (modalita in ('cash','torneo')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists partite_poker_lega_idx on public.partite_poker(lega_id);
create index if not exists partite_poker_data_idx on public.partite_poker(lega_id, data);
create trigger partite_poker_set_updated_at before insert or update on public.partite_poker
  for each row execute function public.set_updated_at();
alter table public.partite_poker enable row level security;
drop policy if exists partite_poker_owner on public.partite_poker;
create policy partite_poker_owner on public.partite_poker for all
  using (public.owns_lega(lega_id)) with check (public.owns_lega(lega_id));

-- ── partita_poker_giocatori (← Partita.giocatori) ────────────────────────
create table if not exists public.partita_poker_giocatori (
  id                uuid primary key default gen_random_uuid(),
  partita_id        uuid not null references public.partite_poker(id) on delete cascade deferrable initially deferred,
  giocatore_id      uuid not null references public.giocatori(id) deferrable initially deferred,
  entrate           numeric(10,2),   -- euro
  ricarica_fatta    numeric(10,2),   -- euro (somma rebuy; dettaglio in poker_movimenti)
  extra             numeric(10,2),   -- euro
  soldi_ricevuti    numeric(10,2),   -- euro
  fiches_finali     numeric(10,2),   -- UNITÀ = modalita: euro (cash) | chip (torneo)
  netto_finale      numeric(10,2),   -- euro
  premio            numeric(10,2),   -- euro
  vincitore         boolean not null default false,
  buy_in_pagato     boolean not null default false,
  extra_pagato      boolean not null default false,
  add_on_fatto      boolean not null default false,
  add_on_pagato     boolean not null default false,
  posizione_finale  int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index if not exists ppg_partita_idx on public.partita_poker_giocatori(partita_id);
create index if not exists ppg_giocatore_idx on public.partita_poker_giocatori(giocatore_id);
create trigger ppg_set_updated_at before insert or update on public.partita_poker_giocatori
  for each row execute function public.set_updated_at();
alter table public.partita_poker_giocatori enable row level security;
drop policy if exists ppg_owner on public.partita_poker_giocatori;
create policy ppg_owner on public.partita_poker_giocatori for all
  using (exists (select 1 from public.partite_poker pp where pp.id = partita_id and public.owns_lega(pp.lega_id)))
  with check (exists (select 1 from public.partite_poker pp where pp.id = partita_id and public.owns_lega(pp.lega_id)));

-- ── poker_movimenti (APPEND-ONLY: ricariche + pagamenti come EVENTI-riga) ──
--    Sostituisce i JSONB: constraint per-elemento, audit, niente clobber sotto sync.
--    Convenzione: solo INSERT (annullare = movimento inverso, non update/delete).
create table if not exists public.poker_movimenti (
  id                    uuid primary key default gen_random_uuid(),
  partita_giocatore_id  uuid not null references public.partita_poker_giocatori(id) on delete cascade deferrable initially deferred,
  tipo                  text not null check (tipo in ('ricarica','pagamento_effettuato','pagamento_ricevuto')),
  importo               numeric(10,2) not null check (importo >= 0),  -- euro
  pagata                boolean,                                      -- ricarica/effettuato: pagato? (null se n/a)
  contro_giocatore_id   uuid references public.giocatori(id) deferrable initially deferred, -- pagamento: il "to"/"from"
  ordine                int,                                          -- ordine originale nell'array
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists movimenti_pg_idx on public.poker_movimenti(partita_giocatore_id);
create trigger movimenti_set_updated_at before insert or update on public.poker_movimenti
  for each row execute function public.set_updated_at();
alter table public.poker_movimenti enable row level security;
drop policy if exists movimenti_owner on public.poker_movimenti;
create policy movimenti_owner on public.poker_movimenti for all
  using (exists (
    select 1 from public.partita_poker_giocatori g
    join public.partite_poker pp on pp.id = g.partita_id
    where g.id = partita_giocatore_id and public.owns_lega(pp.lega_id)))
  with check (exists (
    select 1 from public.partita_poker_giocatori g
    join public.partite_poker pp on pp.id = g.partita_id
    where g.id = partita_giocatore_id and public.owns_lega(pp.lega_id)));

-- ── settlements (← Partita.settlements = i DEBITI "chi paga chi") ─────────
create table if not exists public.settlements (
  id                 uuid primary key default gen_random_uuid(),
  partita_id         uuid not null references public.partite_poker(id) on delete cascade deferrable initially deferred,
  from_giocatore_id  uuid not null references public.giocatori(id) deferrable initially deferred,
  to_giocatore_id    uuid not null references public.giocatori(id) deferrable initially deferred,
  amount             numeric(10,2) not null,  -- euro
  pagato             boolean not null default false,
  ordine             int,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create index if not exists settlements_partita_idx on public.settlements(partita_id);
create trigger settlements_set_updated_at before insert or update on public.settlements
  for each row execute function public.set_updated_at();
alter table public.settlements enable row level security;
drop policy if exists settlements_owner on public.settlements;
create policy settlements_owner on public.settlements for all
  using (exists (select 1 from public.partite_poker pp where pp.id = partita_id and public.owns_lega(pp.lega_id)))
  with check (exists (select 1 from public.partite_poker pp where pp.id = partita_id and public.owns_lega(pp.lega_id)));
