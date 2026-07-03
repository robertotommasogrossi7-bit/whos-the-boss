-- ════════════════════════════════════════════════════════════════════════
-- R6-B5 — HARDENING SQL post-audit · who's the boss · 2026-07-03
-- Migration FORWARD (le 5 precedenti sono già applicate → non si riscrivono).
-- Chiude: M14 (cancellazione account), B31+B35 (trigger updated_at), B32
-- (poker_movimenti davvero append-only), B33 (unique partita_id+giocatore_id),
-- B34 (RLS: initplan caching + TO authenticated). Vedi AUDIT_R6_R7.md.
-- ════════════════════════════════════════════════════════════════════════

-- ── M14 — Cancellazione account: FK giocatori→profiles senza ON DELETE ────
-- bloccavano il cascade da auth.users (requisito store Apple/Google: l'utente
-- deve poter cancellare l'account). ON DELETE SET NULL: il giocatore
-- claimato torna "ospite" (account_id/created_by_account_id NULL), lo
-- storico resta intatto — coerente col modello ospiti (A3, R7_SCHEMA).
alter table public.giocatori drop constraint if exists giocatori_account_id_fkey;
alter table public.giocatori
  add constraint giocatori_account_id_fkey
  foreign key (account_id) references public.profiles(id) on delete set null;

alter table public.giocatori drop constraint if exists giocatori_created_by_account_id_fkey;
alter table public.giocatori
  add constraint giocatori_created_by_account_id_fkey
  foreign key (created_by_account_id) references public.profiles(id) on delete set null;

-- ── B35 — set_updated_at: aggiunge search_path (unica funzione senza) ─────
-- ── B31 — non deve bumpare updated_at su un UPDATE no-op (echo nel sync) ──
-- Il fix di B31 sta nel TRIGGER, non nella funzione: un trigger BEFORE
-- INSERT-OR-UPDATE non può referenziare OLD in un WHEN (OLD non esiste
-- all'INSERT) → si separano in due trigger per tabella: INSERT
-- incondizionato (belt-and-suspenders: sovrascrive qualunque updated_at il
-- client provasse a passare) + UPDATE con WHEN (old.* IS DISTINCT FROM new.*).
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Helper: ricrea la coppia di trigger INSERT/UPDATE per una tabella con
-- updated_at. Le 4 tabelle-ponte (serata_partecipanti, sessione_gioco_
-- partecipanti, partita_gioco_vincitori, partita_gioco_partecipanti) NON
-- hanno updated_at (righe M:N, si sincronizzano a set pieno) → escluse.
do $$
declare
  t text;
begin
  foreach t in array array[
    'leghe', 'giocatori', 'giochi_lega',
    'partite_poker', 'partita_poker_giocatori', 'settlements',
    'serate', 'sessioni_gioco', 'partite_gioco'
    -- poker_movimenti ESCLUSA: niente UPDATE per lei, vedi B32 sotto.
  ]
  loop
    -- NB: il nome del trigger va costruito PRIMA di passarlo a %I (un `%I`
    -- seguito da testo letterale nella stringa di format NON concatena
    -- dentro le virgolette — produrrebbe un identificatore rotto tipo
    -- "leghe"_set_updated_at, non "leghe_set_updated_at").
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before insert on public.%I
         for each row execute function public.set_updated_at()',
      t || '_set_updated_at_ins', t);
    execute format(
      'create trigger %I before update on public.%I
         for each row when (old.* is distinct from new.*)
         execute function public.set_updated_at()',
      t || '_set_updated_at_upd', t);
  end loop;
end $$;

-- ── B32 — poker_movimenti: append-only VERO (non solo dichiarato) ─────────
-- Prima: policy "for all" copriva implicitamente anche UPDATE/DELETE.
-- Ora: SELECT + INSERT soltanto → nessuno (nemmeno il proprietario) può
-- modificare o cancellare un movimento. Un annullo = nuovo movimento
-- inverso (convenzione già documentata in R7.1b), mai un update/delete.
drop policy if exists movimenti_owner on public.poker_movimenti;
drop trigger if exists movimenti_set_updated_at on public.poker_movimenti;
-- niente trigger updated_at: la riga non si aggiorna mai dopo l'insert.

create policy movimenti_select on public.poker_movimenti for select
  to authenticated
  using (exists (
    select 1 from public.partita_poker_giocatori g
    join public.partite_poker pp on pp.id = g.partita_id
    where g.id = partita_giocatore_id and (select public.owns_lega(pp.lega_id))));

create policy movimenti_insert on public.poker_movimenti for insert
  to authenticated
  with check (exists (
    select 1 from public.partita_poker_giocatori g
    join public.partite_poker pp on pp.id = g.partita_id
    where g.id = partita_giocatore_id and (select public.owns_lega(pp.lega_id))));

-- ── B33 — stesso giocatore due volte nella stessa partita ─────────────────
create unique index if not exists ppg_partita_giocatore_uniq
  on public.partita_poker_giocatori(partita_id, giocatore_id)
  where deleted_at is null;

-- ── B34 — RLS performance + hardening ──────────────────────────────────────
-- (select auth.uid())/(select owns_lega(...)) = initplan caching (una sola
-- valutazione per query, non per riga — lint 0003, fino a ~100x su tabelle
-- grandi). TO authenticated = le policy non girano più per il ruolo anon.
-- owns_lega RESTA in schema public (SECURITY DEFINER, non deferred a schema
-- `private`): valutato e scartato — espone solo "possiedo questa lega?"
-- (booleano su un uuid già inaccessibile senza indovinarlo), nessun dato
-- sensibile; spostare schema avrebbe richiesto riscrivere ~15 policy per un
-- rischio marginale. Decisione esplicita, non dimenticanza (B34, R6-B5).
create or replace function public.owns_lega(p_lega_id uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.leghe l where l.id = p_lega_id and l.owner_id = (select auth.uid())
  );
$$;

-- profiles (auth.uid() diretto)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select
  to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert
  to authenticated with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update
  to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- leghe (auth.uid() diretto)
drop policy if exists leghe_owner on public.leghe;
create policy leghe_owner on public.leghe for all
  to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- tabelle a owns_lega(lega_id) diretto
do $$
declare
  t text;
begin
  foreach t in array array['giocatori', 'giochi_lega', 'partite_poker', 'serate', 'sessioni_gioco']
  loop
    -- stesso motivo del blocco sopra: il nome della policy si costruisce
    -- PRIMA di passarlo a %I, non concatenando testo dopo il placeholder.
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using ((select public.owns_lega(lega_id)))
         with check ((select public.owns_lega(lega_id)))',
      t || '_owner', t);
  end loop;
end $$;

-- partita_poker_giocatori (owns_lega via join partite_poker)
drop policy if exists ppg_owner on public.partita_poker_giocatori;
create policy ppg_owner on public.partita_poker_giocatori for all
  to authenticated
  using (exists (select 1 from public.partite_poker pp where pp.id = partita_id and (select public.owns_lega(pp.lega_id))))
  with check (exists (select 1 from public.partite_poker pp where pp.id = partita_id and (select public.owns_lega(pp.lega_id))));

-- settlements (owns_lega via join partite_poker)
drop policy if exists settlements_owner on public.settlements;
create policy settlements_owner on public.settlements for all
  to authenticated
  using (exists (select 1 from public.partite_poker pp where pp.id = partita_id and (select public.owns_lega(pp.lega_id))))
  with check (exists (select 1 from public.partite_poker pp where pp.id = partita_id and (select public.owns_lega(pp.lega_id))));

-- serata_partecipanti (owns_lega via join serate)
drop policy if exists serata_part_owner on public.serata_partecipanti;
create policy serata_part_owner on public.serata_partecipanti for all
  to authenticated
  using (exists (select 1 from public.serate s where s.id = serata_id and (select public.owns_lega(s.lega_id))))
  with check (exists (select 1 from public.serate s where s.id = serata_id and (select public.owns_lega(s.lega_id))));

-- sessione_gioco_partecipanti (owns_lega via join sessioni_gioco)
drop policy if exists sg_part_owner on public.sessione_gioco_partecipanti;
create policy sg_part_owner on public.sessione_gioco_partecipanti for all
  to authenticated
  using (exists (select 1 from public.sessioni_gioco sg where sg.id = sessione_gioco_id and (select public.owns_lega(sg.lega_id))))
  with check (exists (select 1 from public.sessioni_gioco sg where sg.id = sessione_gioco_id and (select public.owns_lega(sg.lega_id))));

-- partite_gioco (owns_lega via join sessioni_gioco)
drop policy if exists partite_gioco_owner on public.partite_gioco;
create policy partite_gioco_owner on public.partite_gioco for all
  to authenticated
  using (exists (select 1 from public.sessioni_gioco sg where sg.id = sessione_gioco_id and (select public.owns_lega(sg.lega_id))))
  with check (exists (select 1 from public.sessioni_gioco sg where sg.id = sessione_gioco_id and (select public.owns_lega(sg.lega_id))));

-- partita_gioco_vincitori / partita_gioco_partecipanti (owns_lega via doppio join)
drop policy if exists pg_vinc_owner on public.partita_gioco_vincitori;
create policy pg_vinc_owner on public.partita_gioco_vincitori for all
  to authenticated
  using (exists (select 1 from public.partite_gioco pg join public.sessioni_gioco sg on sg.id = pg.sessione_gioco_id
                 where pg.id = partita_gioco_id and (select public.owns_lega(sg.lega_id))))
  with check (exists (select 1 from public.partite_gioco pg join public.sessioni_gioco sg on sg.id = pg.sessione_gioco_id
                 where pg.id = partita_gioco_id and (select public.owns_lega(sg.lega_id))));

drop policy if exists pg_part_owner on public.partita_gioco_partecipanti;
create policy pg_part_owner on public.partita_gioco_partecipanti for all
  to authenticated
  using (exists (select 1 from public.partite_gioco pg join public.sessioni_gioco sg on sg.id = pg.sessione_gioco_id
                 where pg.id = partita_gioco_id and (select public.owns_lega(sg.lega_id))))
  with check (exists (select 1 from public.partite_gioco pg join public.sessioni_gioco sg on sg.id = pg.sessione_gioco_id
                 where pg.id = partita_gioco_id and (select public.owns_lega(sg.lega_id))));

-- ════════════════════════════════════════════════════════════════════════
-- VERIFICA (facoltativa, da eseguire dopo — vedi supabase/README.md).
-- M14 assume i nomi-vincolo standard di Postgres (<tabella>_<colonna>_fkey,
-- generati quando non se ne specifica uno esplicito): se il nome REALE fosse
-- diverso, il DROP sopra sarebbe un no-op silenzioso e il vecchio vincolo
-- (senza ON DELETE) resterebbe attivo — la query sotto lo conferma o smentisce.
-- ════════════════════════════════════════════════════════════════════════
-- select conname, confdeltype  -- 'n' = SET NULL atteso; 'a' = NO ACTION (fix non applicato)
-- from pg_constraint
-- where conrelid = 'public.giocatori'::regclass and contype = 'f'
--   and conname in ('giocatori_account_id_fkey', 'giocatori_created_by_account_id_fkey');
