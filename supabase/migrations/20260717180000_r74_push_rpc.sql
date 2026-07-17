-- ════════════════════════════════════════════════════════════════════════
-- R7.4c — RPC `push_lega`: delta-push di UNA lega, transazionale, con CAS
-- ─────────────────────────────────────────────────────────────────────────
-- Design: `_processo/R7_SCHEMA.md` sez. P.2 + emendamenti P.8.2 · il payload
-- lo costruisce `packages/core/src/sync/push.ts` (costruisciPayloadPush).
-- Sorella dell'import (`import_locale`, #8/#9) ma con tre differenze:
--   · INCREMENTALE: arrivano solo le righe dirty, non tutto il db;
--   · UPSERT CON CAS, non insert all-or-nothing: ogni riga già sincronizzata
--     porta un pegno `expected_updated_at` (= il lastSyncedAt locale) e viene
--     aggiornata SOLO se `updated_at` sul server combacia. Una riga che non
--     combacia → ABORT dell'intera transazione con errore 'conflict' (stile
--     WatermelonDB): il client ri-pulla, ri-merge e riprova al giro dopo.
--     Niente merge server-side, niente per-colonna;
--   · PER-LEGA (S9): una transazione per lega, non un one-shot per account.
--
-- Semantica per-riga (P.2):
--   · pegno NULL  → riga nuova → INSERT … ON CONFLICT (id) DO NOTHING:
--     l'eco di un retry non duplica e non fallisce (S10). L'arbiter è
--     ESPLICITO su (id): un conflitto su un ALTRO vincolo unico (es.
--     `leghe_personale_uniq`) deve sollevare, non essere inghiottito;
--   · pegno pieno → UPDATE … WHERE id = ? AND updated_at = pegno; 0 righe →
--     'conflict' (o la riga è cambiata sul server, o non è mia: la RLS rende
--     invisibili le righe altrui e l'effetto è lo stesso abort, mai un write);
--   · poker_movimenti → SOLO INSERT ON CONFLICT DO NOTHING (append-only, I5),
--     spinti PRIMA dei settlements, parent-first (I-R2/S13);
--   · ponti (partecipanti/vincitori) → arrivano solo col genitore dirty: per
--     un genitore NUOVO si inseriscono tutti; per uno già sul server sono
--     immutabili (i partecipanti si fissano alla creazione, i vincitori alla
--     chiusura della partita) → ON CONFLICT DO NOTHING copre l'eco senza
--     rischi. Il giorno in cui un ponte potrà RESTRINGERSI servirà un delete
--     mirato — oggi non esiste un flusso che lo faccia.
--
-- NOTA sull'eco degli UPDATE (B31, migration #6): il trigger `updated_at`
-- non scatta su un UPDATE no-op (WHEN old IS DISTINCT FROM new) → il re-push
-- di una riga identica col pegno giusto NON cambia `updated_at` e ritorna
-- quello corrente: il retry si auto-risolve, niente conflitto fantasma.
--
-- RITORNA (P.8.2 + I-R6):
--   { conteggi:  { <tabella>: righe applicate, … },
--     applicate: { <uid>: updated_at server, … } }
-- `applicate` copre le sole righe sincronizzate (non movimenti né ponti): il
-- client la passa ad `applicaStampPush` → `lastSyncedAt` = nuovo pegno, così
-- il push successivo passa il CAS senza dipendere da un pull intermedio.
-- Una riga nuova saltata da DO NOTHING (eco) NON compare in `applicate`:
-- resta dirty sul client e si riconcilia col normale ciclo pull→push.
--
-- SECURITY INVOKER: RLS attiva — sugli INSERT (with check owns_lega, per
-- questo l'ordine è parent-first: la RLS non è deferibile come le FK) e
-- sugli UPDATE (riga altrui invisibile → 'conflict').
-- `unique_violation` (es. seconda lega Personale) → errore PARLANTE col nome
-- del vincolo, mai un abort muto da ritentare all'infinito (P.8.2/S4-R2).
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.push_lega(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid        uuid := auth.uid();
  v_lega       uuid;
  v_conteggi   jsonb := '{}'::jsonb;
  v_applicate  jsonb := '{}'::jsonb;
  v_mappa      jsonb;
  v_n          int;
  v_ts         timestamptz;
  r            record;
  v_vincolo    text;
  v_dettaglio  text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- ── 1. Guardie ─────────────────────────────────────────────────────────
  -- 1.1 versione del payload (S18/P.8.2) — le ignote si rifiutano
  if coalesce((payload->>'version')::int, 0) <> 1 then
    raise exception 'unsupported_payload_version: %', coalesce(payload->>'version', '(assente)')
      using errcode = 'P0001';
  end if;

  -- 1.2 la lega di destinazione dev'essere MIA (visibile sotto RLS) oppure
  --     nascere in questo stesso push: fuori da questi casi meglio un errore
  --     parlante subito che una sfilza di violazioni RLS criptiche più sotto.
  v_lega := (payload->>'lega_uid')::uuid;
  if v_lega is null then
    raise exception 'lega_uid_mancante' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.leghe l where l.id = v_lega)
     and not exists (select 1
                       from jsonb_array_elements(coalesce(payload->'leghe', '[]'::jsonb)) e
                      where (e->>'id')::uuid = v_lega) then
    raise exception 'lega_non_trovata: %', v_lega using errcode = 'P0001',
      hint = 'La lega non esiste su questo account e il payload non la crea.';
  end if;

  -- ══ 2. Righe in ordine PARENT-FIRST (I-R2), CAS per tabella ═════════════
  -- Ogni tabella sincronizzata ha due rami: INSERT set-based delle righe
  -- nuove (pegno null) e UPDATE riga-per-riga di quelle col pegno (il loop
  -- serve a sapere QUALE riga fallisce il CAS). I genitori strutturali
  -- (lega_id, partita_id, …) non si aggiornano mai: una riga non cambia
  -- genitore; i collegamenti opzionali (serata_id, gioco_lega_id) sì.

  -- 2.1 leghe (radice; owner_id immutabile)
  with dati as (
    select * from jsonb_to_recordset(coalesce(payload->'leghe', '[]'::jsonb)) as x(
      id uuid, owner_id uuid, local_id int, nome text, foto text,
      personale boolean, mono_gioco_id text, deleted_at timestamptz,
      expected_updated_at timestamptz)
  ), ins as (
    insert into public.leghe (id, owner_id, local_id, nome, foto, personale, mono_gioco_id, deleted_at)
    select id, owner_id, local_id, nome, foto, personale, mono_gioco_id, deleted_at
      from dati where expected_updated_at is null
    on conflict (id) do nothing
    returning id, updated_at
  )
  select count(*)::int, coalesce(jsonb_object_agg(id::text, updated_at), '{}'::jsonb)
    into v_n, v_mappa from ins;
  v_applicate := v_applicate || v_mappa;

  for r in
    select * from jsonb_to_recordset(coalesce(payload->'leghe', '[]'::jsonb)) as x(
      id uuid, local_id int, nome text, foto text,
      personale boolean, mono_gioco_id text, deleted_at timestamptz,
      expected_updated_at timestamptz)
    where x.expected_updated_at is not null
  loop
    update public.leghe
       set local_id = r.local_id, nome = r.nome, foto = r.foto,
           personale = r.personale, mono_gioco_id = r.mono_gioco_id, deleted_at = r.deleted_at
     where id = r.id and updated_at = r.expected_updated_at
     returning updated_at into v_ts;
    if not found then
      raise exception 'conflict: leghe uid %', r.id using errcode = 'P0001',
        hint = 'updated_at sul server diverso dal pegno: serve un pull prima di ritentare il push.';
    end if;
    v_n := v_n + 1;
    v_applicate := v_applicate || jsonb_build_object(r.id::text, v_ts);
  end loop;
  v_conteggi := v_conteggi || jsonb_build_object('leghe', v_n);

  -- 2.2 giocatori (la tabella-perno) — FK lega
  with dati as (
    select * from jsonb_to_recordset(coalesce(payload->'giocatori', '[]'::jsonb)) as x(
      id uuid, lega_id uuid, local_id int, nome text,
      account_id uuid, created_by_account_id uuid, deleted_at timestamptz,
      expected_updated_at timestamptz)
  ), ins as (
    insert into public.giocatori (id, lega_id, local_id, nome, account_id, created_by_account_id, deleted_at)
    select id, lega_id, local_id, nome, account_id, created_by_account_id, deleted_at
      from dati where expected_updated_at is null
    on conflict (id) do nothing
    returning id, updated_at
  )
  select count(*)::int, coalesce(jsonb_object_agg(id::text, updated_at), '{}'::jsonb)
    into v_n, v_mappa from ins;
  v_applicate := v_applicate || v_mappa;

  for r in
    select * from jsonb_to_recordset(coalesce(payload->'giocatori', '[]'::jsonb)) as x(
      id uuid, local_id int, nome text,
      account_id uuid, created_by_account_id uuid, deleted_at timestamptz,
      expected_updated_at timestamptz)
    where x.expected_updated_at is not null
  loop
    update public.giocatori
       set local_id = r.local_id, nome = r.nome, account_id = r.account_id,
           created_by_account_id = r.created_by_account_id, deleted_at = r.deleted_at
     where id = r.id and updated_at = r.expected_updated_at
     returning updated_at into v_ts;
    if not found then
      raise exception 'conflict: giocatori uid %', r.id using errcode = 'P0001',
        hint = 'updated_at sul server diverso dal pegno: serve un pull prima di ritentare il push.';
    end if;
    v_n := v_n + 1;
    v_applicate := v_applicate || jsonb_build_object(r.id::text, v_ts);
  end loop;
  v_conteggi := v_conteggi || jsonb_build_object('giocatori', v_n);

  -- 2.3 giochi_lega — FK lega
  with dati as (
    select * from jsonb_to_recordset(coalesce(payload->'giochi_lega', '[]'::jsonb)) as x(
      id uuid, lega_id uuid, gioco_key text, nome text, preimpostato boolean,
      foto text, accent text, attivo boolean, pareggio_come_vittoria boolean,
      deleted_at timestamptz, expected_updated_at timestamptz)
  ), ins as (
    insert into public.giochi_lega (id, lega_id, gioco_key, nome, preimpostato, foto, accent, attivo, pareggio_come_vittoria, deleted_at)
    select id, lega_id, gioco_key, nome, preimpostato, foto, accent, attivo, pareggio_come_vittoria, deleted_at
      from dati where expected_updated_at is null
    on conflict (id) do nothing
    returning id, updated_at
  )
  select count(*)::int, coalesce(jsonb_object_agg(id::text, updated_at), '{}'::jsonb)
    into v_n, v_mappa from ins;
  v_applicate := v_applicate || v_mappa;

  for r in
    select * from jsonb_to_recordset(coalesce(payload->'giochi_lega', '[]'::jsonb)) as x(
      id uuid, gioco_key text, nome text, preimpostato boolean,
      foto text, accent text, attivo boolean, pareggio_come_vittoria boolean,
      deleted_at timestamptz, expected_updated_at timestamptz)
    where x.expected_updated_at is not null
  loop
    update public.giochi_lega
       set gioco_key = r.gioco_key, nome = r.nome, preimpostato = r.preimpostato,
           foto = r.foto, accent = r.accent, attivo = r.attivo,
           pareggio_come_vittoria = r.pareggio_come_vittoria, deleted_at = r.deleted_at
     where id = r.id and updated_at = r.expected_updated_at
     returning updated_at into v_ts;
    if not found then
      raise exception 'conflict: giochi_lega uid %', r.id using errcode = 'P0001',
        hint = 'updated_at sul server diverso dal pegno: serve un pull prima di ritentare il push.';
    end if;
    v_n := v_n + 1;
    v_applicate := v_applicate || jsonb_build_object(r.id::text, v_ts);
  end loop;
  v_conteggi := v_conteggi || jsonb_build_object('giochi_lega', v_n);

  -- 2.4 partite_poker — FK lega
  with dati as (
    select * from jsonb_to_recordset(coalesce(payload->'partite_poker', '[]'::jsonb)) as x(
      id uuid, lega_id uuid, local_id int, buy_in numeric(10,2), data date,
      ora_inizio text, ora_fine text, modalita text, deleted_at timestamptz,
      expected_updated_at timestamptz)
  ), ins as (
    insert into public.partite_poker (id, lega_id, local_id, buy_in, data, ora_inizio, ora_fine, modalita, deleted_at)
    select id, lega_id, local_id, buy_in, data, ora_inizio, ora_fine, modalita, deleted_at
      from dati where expected_updated_at is null
    on conflict (id) do nothing
    returning id, updated_at
  )
  select count(*)::int, coalesce(jsonb_object_agg(id::text, updated_at), '{}'::jsonb)
    into v_n, v_mappa from ins;
  v_applicate := v_applicate || v_mappa;

  for r in
    select * from jsonb_to_recordset(coalesce(payload->'partite_poker', '[]'::jsonb)) as x(
      id uuid, local_id int, buy_in numeric(10,2), data date,
      ora_inizio text, ora_fine text, modalita text, deleted_at timestamptz,
      expected_updated_at timestamptz)
    where x.expected_updated_at is not null
  loop
    update public.partite_poker
       set local_id = r.local_id, buy_in = r.buy_in, data = r.data,
           ora_inizio = r.ora_inizio, ora_fine = r.ora_fine, modalita = r.modalita,
           deleted_at = r.deleted_at
     where id = r.id and updated_at = r.expected_updated_at
     returning updated_at into v_ts;
    if not found then
      raise exception 'conflict: partite_poker uid %', r.id using errcode = 'P0001',
        hint = 'updated_at sul server diverso dal pegno: serve un pull prima di ritentare il push.';
    end if;
    v_n := v_n + 1;
    v_applicate := v_applicate || jsonb_build_object(r.id::text, v_ts);
  end loop;
  v_conteggi := v_conteggi || jsonb_build_object('partite_poker', v_n);

  -- 2.5 partita_poker_giocatori — FK partita + giocatore (entrambi immutabili)
  with dati as (
    select * from jsonb_to_recordset(coalesce(payload->'partita_poker_giocatori', '[]'::jsonb)) as x(
      id uuid, partita_id uuid, giocatore_id uuid, entrate numeric(10,2), ricarica_fatta numeric(10,2),
      extra numeric(10,2), soldi_ricevuti numeric(10,2), fiches_finali numeric(10,2),
      netto_finale numeric(10,2), premio numeric(10,2), vincitore boolean, buy_in_pagato boolean,
      extra_pagato boolean, add_on_fatto boolean, add_on_pagato boolean,
      posizione_finale int, deleted_at timestamptz, expected_updated_at timestamptz)
  ), ins as (
    insert into public.partita_poker_giocatori (
      id, partita_id, giocatore_id, entrate, ricarica_fatta, extra, soldi_ricevuti,
      fiches_finali, netto_finale, premio, vincitore, buy_in_pagato, extra_pagato,
      add_on_fatto, add_on_pagato, posizione_finale, deleted_at)
    select id, partita_id, giocatore_id, entrate, ricarica_fatta, extra, soldi_ricevuti,
           fiches_finali, netto_finale, premio, vincitore, buy_in_pagato, extra_pagato,
           add_on_fatto, add_on_pagato, posizione_finale, deleted_at
      from dati where expected_updated_at is null
    on conflict (id) do nothing
    returning id, updated_at
  )
  select count(*)::int, coalesce(jsonb_object_agg(id::text, updated_at), '{}'::jsonb)
    into v_n, v_mappa from ins;
  v_applicate := v_applicate || v_mappa;

  for r in
    select * from jsonb_to_recordset(coalesce(payload->'partita_poker_giocatori', '[]'::jsonb)) as x(
      id uuid, entrate numeric(10,2), ricarica_fatta numeric(10,2),
      extra numeric(10,2), soldi_ricevuti numeric(10,2), fiches_finali numeric(10,2),
      netto_finale numeric(10,2), premio numeric(10,2), vincitore boolean, buy_in_pagato boolean,
      extra_pagato boolean, add_on_fatto boolean, add_on_pagato boolean,
      posizione_finale int, deleted_at timestamptz, expected_updated_at timestamptz)
    where x.expected_updated_at is not null
  loop
    update public.partita_poker_giocatori
       set entrate = r.entrate, ricarica_fatta = r.ricarica_fatta, extra = r.extra,
           soldi_ricevuti = r.soldi_ricevuti, fiches_finali = r.fiches_finali,
           netto_finale = r.netto_finale, premio = r.premio, vincitore = r.vincitore,
           buy_in_pagato = r.buy_in_pagato, extra_pagato = r.extra_pagato,
           add_on_fatto = r.add_on_fatto, add_on_pagato = r.add_on_pagato,
           posizione_finale = r.posizione_finale, deleted_at = r.deleted_at
     where id = r.id and updated_at = r.expected_updated_at
     returning updated_at into v_ts;
    if not found then
      raise exception 'conflict: partita_poker_giocatori uid %', r.id using errcode = 'P0001',
        hint = 'updated_at sul server diverso dal pegno: serve un pull prima di ritentare il push.';
    end if;
    v_n := v_n + 1;
    v_applicate := v_applicate || jsonb_build_object(r.id::text, v_ts);
  end loop;
  v_conteggi := v_conteggi || jsonb_build_object('partita_poker_giocatori', v_n);

  -- 2.6 poker_movimenti (ledger append-only, I5) — SOLO INSERT, PRIMA dei
  --     settlements (S13). Niente pegno, niente `applicate`: un movimento non
  --     si aggiorna mai; l'eco di un retry cade su DO NOTHING.
  insert into public.poker_movimenti (id, partita_giocatore_id, tipo, importo, pagata, contro_giocatore_id, ordine)
  select x.id, x.partita_giocatore_id, x.tipo, x.importo, x.pagata, x.contro_giocatore_id, x.ordine
    from jsonb_to_recordset(coalesce(payload->'poker_movimenti', '[]'::jsonb)) as x(
      id uuid, partita_giocatore_id uuid, tipo text, importo numeric(10,2),
      pagata boolean, contro_giocatore_id uuid, ordine int)
  on conflict (id) do nothing;
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('poker_movimenti', v_n);

  -- 2.7 settlements — FK partita + giocatori (from/to immutabili)
  with dati as (
    select * from jsonb_to_recordset(coalesce(payload->'settlements', '[]'::jsonb)) as x(
      id uuid, partita_id uuid, from_giocatore_id uuid, to_giocatore_id uuid,
      amount numeric(10,2), pagato boolean, ordine int, deleted_at timestamptz,
      expected_updated_at timestamptz)
  ), ins as (
    insert into public.settlements (id, partita_id, from_giocatore_id, to_giocatore_id, amount, pagato, ordine, deleted_at)
    select id, partita_id, from_giocatore_id, to_giocatore_id, amount, pagato, ordine, deleted_at
      from dati where expected_updated_at is null
    on conflict (id) do nothing
    returning id, updated_at
  )
  select count(*)::int, coalesce(jsonb_object_agg(id::text, updated_at), '{}'::jsonb)
    into v_n, v_mappa from ins;
  v_applicate := v_applicate || v_mappa;

  for r in
    select * from jsonb_to_recordset(coalesce(payload->'settlements', '[]'::jsonb)) as x(
      id uuid, amount numeric(10,2), pagato boolean, ordine int, deleted_at timestamptz,
      expected_updated_at timestamptz)
    where x.expected_updated_at is not null
  loop
    update public.settlements
       set amount = r.amount, pagato = r.pagato, ordine = r.ordine, deleted_at = r.deleted_at
     where id = r.id and updated_at = r.expected_updated_at
     returning updated_at into v_ts;
    if not found then
      raise exception 'conflict: settlements uid %', r.id using errcode = 'P0001',
        hint = 'updated_at sul server diverso dal pegno: serve un pull prima di ritentare il push.';
    end if;
    v_n := v_n + 1;
    v_applicate := v_applicate || jsonb_build_object(r.id::text, v_ts);
  end loop;
  v_conteggi := v_conteggi || jsonb_build_object('settlements', v_n);

  -- 2.8 serate — FK lega
  with dati as (
    select * from jsonb_to_recordset(coalesce(payload->'serate', '[]'::jsonb)) as x(
      id uuid, lega_id uuid, local_id int, data date, deleted_at timestamptz,
      expected_updated_at timestamptz)
  ), ins as (
    insert into public.serate (id, lega_id, local_id, data, deleted_at)
    select id, lega_id, local_id, data, deleted_at
      from dati where expected_updated_at is null
    on conflict (id) do nothing
    returning id, updated_at
  )
  select count(*)::int, coalesce(jsonb_object_agg(id::text, updated_at), '{}'::jsonb)
    into v_n, v_mappa from ins;
  v_applicate := v_applicate || v_mappa;

  for r in
    select * from jsonb_to_recordset(coalesce(payload->'serate', '[]'::jsonb)) as x(
      id uuid, local_id int, data date, deleted_at timestamptz,
      expected_updated_at timestamptz)
    where x.expected_updated_at is not null
  loop
    update public.serate
       set local_id = r.local_id, data = r.data, deleted_at = r.deleted_at
     where id = r.id and updated_at = r.expected_updated_at
     returning updated_at into v_ts;
    if not found then
      raise exception 'conflict: serate uid %', r.id using errcode = 'P0001',
        hint = 'updated_at sul server diverso dal pegno: serve un pull prima di ritentare il push.';
    end if;
    v_n := v_n + 1;
    v_applicate := v_applicate || jsonb_build_object(r.id::text, v_ts);
  end loop;
  v_conteggi := v_conteggi || jsonb_build_object('serate', v_n);

  -- 2.9 serata_partecipanti (ponte: immutabile dopo la creazione del genitore)
  insert into public.serata_partecipanti (serata_id, giocatore_id)
  select x.serata_id, x.giocatore_id
    from jsonb_to_recordset(coalesce(payload->'serata_partecipanti', '[]'::jsonb)) as x(
      serata_id uuid, giocatore_id uuid)
  on conflict (serata_id, giocatore_id) do nothing;
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('serata_partecipanti', v_n);

  -- 2.10 sessioni_gioco — FK lega. `gioco_key` (G1) è l'identità del gioco:
  --      un campo DATI come gli altri, non un pegno; `gioco_lega_id` e
  --      `serata_id` sono collegamenti opzionali → si aggiornano.
  with dati as (
    select * from jsonb_to_recordset(coalesce(payload->'sessioni_gioco', '[]'::jsonb)) as x(
      id uuid, lega_id uuid, local_id int, gioco_key text, gioco_lega_id uuid, data date, stato text,
      ora_inizio text, ora_fine text, esito_pareggio boolean, serata_id uuid, deleted_at timestamptz,
      expected_updated_at timestamptz)
  ), ins as (
    insert into public.sessioni_gioco (id, lega_id, local_id, gioco_key, gioco_lega_id, data, stato, ora_inizio, ora_fine, esito_pareggio, serata_id, deleted_at)
    select id, lega_id, local_id, gioco_key, gioco_lega_id, data, stato, ora_inizio, ora_fine, esito_pareggio, serata_id, deleted_at
      from dati where expected_updated_at is null
    on conflict (id) do nothing
    returning id, updated_at
  )
  select count(*)::int, coalesce(jsonb_object_agg(id::text, updated_at), '{}'::jsonb)
    into v_n, v_mappa from ins;
  v_applicate := v_applicate || v_mappa;

  for r in
    select * from jsonb_to_recordset(coalesce(payload->'sessioni_gioco', '[]'::jsonb)) as x(
      id uuid, local_id int, gioco_key text, gioco_lega_id uuid, data date, stato text,
      ora_inizio text, ora_fine text, esito_pareggio boolean, serata_id uuid, deleted_at timestamptz,
      expected_updated_at timestamptz)
    where x.expected_updated_at is not null
  loop
    update public.sessioni_gioco
       set local_id = r.local_id, gioco_key = r.gioco_key, gioco_lega_id = r.gioco_lega_id,
           data = r.data, stato = r.stato, ora_inizio = r.ora_inizio, ora_fine = r.ora_fine,
           esito_pareggio = r.esito_pareggio, serata_id = r.serata_id, deleted_at = r.deleted_at
     where id = r.id and updated_at = r.expected_updated_at
     returning updated_at into v_ts;
    if not found then
      raise exception 'conflict: sessioni_gioco uid %', r.id using errcode = 'P0001',
        hint = 'updated_at sul server diverso dal pegno: serve un pull prima di ritentare il push.';
    end if;
    v_n := v_n + 1;
    v_applicate := v_applicate || jsonb_build_object(r.id::text, v_ts);
  end loop;
  v_conteggi := v_conteggi || jsonb_build_object('sessioni_gioco', v_n);

  -- 2.11 sessione_gioco_partecipanti (ponte)
  insert into public.sessione_gioco_partecipanti (sessione_gioco_id, giocatore_id)
  select x.sessione_gioco_id, x.giocatore_id
    from jsonb_to_recordset(coalesce(payload->'sessione_gioco_partecipanti', '[]'::jsonb)) as x(
      sessione_gioco_id uuid, giocatore_id uuid)
  on conflict (sessione_gioco_id, giocatore_id) do nothing;
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('sessione_gioco_partecipanti', v_n);

  -- 2.12 partite_gioco — FK sessione
  with dati as (
    select * from jsonb_to_recordset(coalesce(payload->'partite_gioco', '[]'::jsonb)) as x(
      id uuid, sessione_gioco_id uuid, local_id int, ora_inizio text, ora_fine text,
      pareggio boolean, nome_libero text, ordine int, deleted_at timestamptz,
      expected_updated_at timestamptz)
  ), ins as (
    insert into public.partite_gioco (id, sessione_gioco_id, local_id, ora_inizio, ora_fine, pareggio, nome_libero, ordine, deleted_at)
    select id, sessione_gioco_id, local_id, ora_inizio, ora_fine, pareggio, nome_libero, ordine, deleted_at
      from dati where expected_updated_at is null
    on conflict (id) do nothing
    returning id, updated_at
  )
  select count(*)::int, coalesce(jsonb_object_agg(id::text, updated_at), '{}'::jsonb)
    into v_n, v_mappa from ins;
  v_applicate := v_applicate || v_mappa;

  for r in
    select * from jsonb_to_recordset(coalesce(payload->'partite_gioco', '[]'::jsonb)) as x(
      id uuid, local_id int, ora_inizio text, ora_fine text,
      pareggio boolean, nome_libero text, ordine int, deleted_at timestamptz,
      expected_updated_at timestamptz)
    where x.expected_updated_at is not null
  loop
    update public.partite_gioco
       set local_id = r.local_id, ora_inizio = r.ora_inizio, ora_fine = r.ora_fine,
           pareggio = r.pareggio, nome_libero = r.nome_libero, ordine = r.ordine,
           deleted_at = r.deleted_at
     where id = r.id and updated_at = r.expected_updated_at
     returning updated_at into v_ts;
    if not found then
      raise exception 'conflict: partite_gioco uid %', r.id using errcode = 'P0001',
        hint = 'updated_at sul server diverso dal pegno: serve un pull prima di ritentare il push.';
    end if;
    v_n := v_n + 1;
    v_applicate := v_applicate || jsonb_build_object(r.id::text, v_ts);
  end loop;
  v_conteggi := v_conteggi || jsonb_build_object('partite_gioco', v_n);

  -- 2.13 partita_gioco_vincitori (ponte)
  insert into public.partita_gioco_vincitori (partita_gioco_id, giocatore_id)
  select x.partita_gioco_id, x.giocatore_id
    from jsonb_to_recordset(coalesce(payload->'partita_gioco_vincitori', '[]'::jsonb)) as x(
      partita_gioco_id uuid, giocatore_id uuid)
  on conflict (partita_gioco_id, giocatore_id) do nothing;
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('partita_gioco_vincitori', v_n);

  -- 2.14 partita_gioco_partecipanti (ponte)
  insert into public.partita_gioco_partecipanti (partita_gioco_id, giocatore_id)
  select x.partita_gioco_id, x.giocatore_id
    from jsonb_to_recordset(coalesce(payload->'partita_gioco_partecipanti', '[]'::jsonb)) as x(
      partita_gioco_id uuid, giocatore_id uuid)
  on conflict (partita_gioco_id, giocatore_id) do nothing;
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('partita_gioco_partecipanti', v_n);

  return jsonb_build_object('conteggi', v_conteggi, 'applicate', v_applicate);

exception
  -- P.8.2/S4-R2: un vincolo unico violato (la seconda lega Personale su
  -- `leghe_personale_uniq`, un doppione su `ppg_partita_giocatore_uniq`) deve
  -- parlare: un retry identico non può MAI riuscire, il client deve saperlo.
  -- Il 'conflict' del CAS ha errcode P0001 e NON passa di qui: risale intatto.
  when unique_violation then
    get stacked diagnostics v_vincolo = constraint_name, v_dettaglio = pg_exception_detail;
    raise exception 'unique_violation: %', coalesce(v_vincolo, '(vincolo sconosciuto)')
      using errcode = 'P0001',
        detail = coalesce(v_dettaglio, ''),
        hint = case coalesce(v_vincolo, '')
          when 'leghe_personale_uniq' then
            'Questo account ha già una lega Personale sul cloud: la seconda non può entrare. Serve l''adozione del cloud (DS9), non un retry.'
          when 'ppg_partita_giocatore_uniq' then
            'Questo giocatore risulta già in questa partita sul cloud (probabile doppione creato da un altro device).'
          else
            'Una riga del push viola un vincolo unico del database: un retry identico non può riuscire.'
        end;
end;
$$;

-- Senza questo, la chiamata muore con "permission denied for function" (I-R8).
grant execute on function public.push_lega(jsonb) to authenticated;
