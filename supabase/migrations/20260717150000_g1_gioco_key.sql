-- ════════════════════════════════════════════════════════════════════════
-- G1 — `sessioni_gioco.gioco_key`: quale gioco è stato giocato
-- ─────────────────────────────────────────────────────────────────────────
-- Mini-spec: `_processo/R7_SCHEMA.md` sez. Q (opzione B, decisa con l'utente).
--
-- IL DIFETTO (trovato dal gate di R7.4a-1, provato eseguendo il codice):
-- `sessioni_gioco` non aveva NESSUNA colonna per il gioco — l'unico legame era
-- la FK `gioco_lega_id → giochi_lega`. Ma `giochi_lega` si popola solo da
-- `nuovoGiocoCustom`, che non ha chiamanti (la UI giochi custom è M5): l'app
-- pesca i giochi dal catalogo globale in `GIOCHI_PREIMPOSTATI`. Risultato:
-- `giochi_lega` sempre vuota → `gioco_lega_id` sempre null → **il cloud non
-- registrava mai quale gioco fosse stato giocato**, e `preflightImport` lo
-- bloccava come `fk_orfana` ("il gioco non è più configurato nella lega": un
-- messaggio falso, non lo è mai stato). L'import multigioco era irrealizzabile.
--
-- LA CAUSA: in locale `SessioneGioco.giocoId` (stringa) È l'identità del gioco,
-- e `lega.giochi` è un layer di override OPZIONALE sopra il catalogo — lo dice
-- `resolveGiocoLega()`: "cerca prima in lega.giochi, POI nel catalogo". Lo
-- schema R7.1 ha invertito il modello: ha buttato la parte obbligatoria
-- (giocoId) e ha tenuto solo quella opzionale (la FK all'override).
--
-- IL FIX: `gioco_key` rispecchia 1:1 `SessioneGioco.giocoId`. Stesso nome della
-- colonna omonima di `giochi_lega`, il cui commento diceva già l'intento vero:
-- "'magic' | 'scopa' | 'custom-<ts>' (referenziato da sessioni_gioco)".
-- `gioco_lega_id` resta (nullable): non è più l'identità, solo il collegamento
-- alla riga di override quando esisterà (M5) — ritrovabile anche via
-- (lega_id, gioco_key), visto che `GiocoLega.id === giocoId`.
--
-- Niente `not null`: le righe pre-#9 non hanno la colonna. Oggi sono ZERO
-- (l'import non è mai passato: è proprio questo il bug), ma il vincolo non
-- aggiungerebbe nulla e complicherebbe un eventuale replay.
-- ════════════════════════════════════════════════════════════════════════

alter table public.sessioni_gioco add column if not exists gioco_key text;

comment on column public.sessioni_gioco.gioco_key is
  'Identità del gioco giocato: la chiave locale SessioneGioco.giocoId (''scopa'' | ''custom-<ts>''). '
  'Fonte di verità; gioco_lega_id è solo il collegamento all''eventuale riga di override (M5).';

-- ── RPC `import_locale` — ricreata per includere gioco_key ────────────────
-- La #8 è già applicata sul cloud e `create or replace` esige tutto il corpo:
-- l'UNICA differenza rispetto alla #8 è il blocco 3.10 (sessioni_gioco), che
-- ora porta anche gioco_key. Tutto il resto è identico (guardia atomica I-R1,
-- parent-first I-R2, conteggi I-R6, versione I-R7).

create or replace function public.import_locale(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_conteggi  jsonb := '{}'::jsonb;
  v_n         int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- ── 1. GUARDIA ATOMICA (I-R1) — PRIMO atto, prima di qualsiasi lettura ──
  update public.profiles
     set imported_at = now()
   where id = v_uid
     and imported_at is null;
  if not found then
    raise exception 'already_imported' using
      errcode = 'P0001',
      hint = 'Questo account ha già importato i dati locali una volta.';
  end if;

  -- ── 2. Versione del payload (I-R7) — rifiuta, non indovinare ──
  if coalesce((payload->>'version')::int, 0) <> 1 then
    raise exception 'unsupported_payload_version: %', coalesce(payload->>'version', '(assente)')
      using errcode = 'P0001';
  end if;

  -- ══ 3. INSERT in ordine PARENT-FIRST (I-R2) ═══════════════════════════

  -- 3.1 leghe (radice: RLS owner_id = auth.uid())
  insert into public.leghe (id, owner_id, local_id, nome, foto, personale, mono_gioco_id, deleted_at)
  select x.id, x.owner_id, x.local_id, x.nome, x.foto, x.personale, x.mono_gioco_id, x.deleted_at
    from jsonb_to_recordset(coalesce(payload->'leghe', '[]'::jsonb)) as x(
      id uuid, owner_id uuid, local_id int, nome text, foto text,
      personale boolean, mono_gioco_id text, deleted_at timestamptz);
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('leghe', v_n);

  -- 3.2 giocatori (la tabella-perno) — FK lega
  insert into public.giocatori (id, lega_id, local_id, nome, account_id, created_by_account_id, deleted_at)
  select x.id, x.lega_id, x.local_id, x.nome, x.account_id, x.created_by_account_id, x.deleted_at
    from jsonb_to_recordset(coalesce(payload->'giocatori', '[]'::jsonb)) as x(
      id uuid, lega_id uuid, local_id int, nome text,
      account_id uuid, created_by_account_id uuid, deleted_at timestamptz);
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('giocatori', v_n);

  -- 3.3 giochi_lega — FK lega
  insert into public.giochi_lega (id, lega_id, gioco_key, nome, preimpostato, foto, accent, attivo, pareggio_come_vittoria, deleted_at)
  select x.id, x.lega_id, x.gioco_key, x.nome, x.preimpostato, x.foto, x.accent, x.attivo, x.pareggio_come_vittoria, x.deleted_at
    from jsonb_to_recordset(coalesce(payload->'giochi_lega', '[]'::jsonb)) as x(
      id uuid, lega_id uuid, gioco_key text, nome text, preimpostato boolean,
      foto text, accent text, attivo boolean, pareggio_come_vittoria boolean, deleted_at timestamptz);
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('giochi_lega', v_n);

  -- 3.4 partite_poker — FK lega
  insert into public.partite_poker (id, lega_id, local_id, buy_in, data, ora_inizio, ora_fine, modalita, deleted_at)
  select x.id, x.lega_id, x.local_id, x.buy_in, x.data, x.ora_inizio, x.ora_fine, x.modalita, x.deleted_at
    from jsonb_to_recordset(coalesce(payload->'partite_poker', '[]'::jsonb)) as x(
      id uuid, lega_id uuid, local_id int, buy_in numeric(10,2), data date,
      ora_inizio text, ora_fine text, modalita text, deleted_at timestamptz);
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('partite_poker', v_n);

  -- 3.5 partita_poker_giocatori — FK partita + giocatore
  insert into public.partita_poker_giocatori (
    id, partita_id, giocatore_id, entrate, ricarica_fatta, extra, soldi_ricevuti,
    fiches_finali, netto_finale, premio, vincitore, buy_in_pagato, extra_pagato,
    add_on_fatto, add_on_pagato, posizione_finale, deleted_at)
  select x.id, x.partita_id, x.giocatore_id, x.entrate, x.ricarica_fatta, x.extra, x.soldi_ricevuti,
         x.fiches_finali, x.netto_finale, x.premio, x.vincitore, x.buy_in_pagato, x.extra_pagato,
         x.add_on_fatto, x.add_on_pagato, x.posizione_finale, x.deleted_at
    from jsonb_to_recordset(coalesce(payload->'partita_poker_giocatori', '[]'::jsonb)) as x(
      id uuid, partita_id uuid, giocatore_id uuid, entrate numeric(10,2), ricarica_fatta numeric(10,2),
      extra numeric(10,2), soldi_ricevuti numeric(10,2), fiches_finali numeric(10,2),
      netto_finale numeric(10,2), premio numeric(10,2), vincitore boolean, buy_in_pagato boolean,
      extra_pagato boolean, add_on_fatto boolean, add_on_pagato boolean,
      posizione_finale int, deleted_at timestamptz);
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('partita_poker_giocatori', v_n);

  -- 3.6 poker_movimenti (ledger append-only) — FK partita_giocatore + controparte
  insert into public.poker_movimenti (id, partita_giocatore_id, tipo, importo, pagata, contro_giocatore_id, ordine)
  select x.id, x.partita_giocatore_id, x.tipo, x.importo, x.pagata, x.contro_giocatore_id, x.ordine
    from jsonb_to_recordset(coalesce(payload->'poker_movimenti', '[]'::jsonb)) as x(
      id uuid, partita_giocatore_id uuid, tipo text, importo numeric(10,2),
      pagata boolean, contro_giocatore_id uuid, ordine int);
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('poker_movimenti', v_n);

  -- 3.7 settlements — FK partita + giocatori
  insert into public.settlements (id, partita_id, from_giocatore_id, to_giocatore_id, amount, pagato, ordine, deleted_at)
  select x.id, x.partita_id, x.from_giocatore_id, x.to_giocatore_id, x.amount, x.pagato, x.ordine, x.deleted_at
    from jsonb_to_recordset(coalesce(payload->'settlements', '[]'::jsonb)) as x(
      id uuid, partita_id uuid, from_giocatore_id uuid, to_giocatore_id uuid,
      amount numeric(10,2), pagato boolean, ordine int, deleted_at timestamptz);
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('settlements', v_n);

  -- 3.8 serate — FK lega
  insert into public.serate (id, lega_id, local_id, data, deleted_at)
  select x.id, x.lega_id, x.local_id, x.data, x.deleted_at
    from jsonb_to_recordset(coalesce(payload->'serate', '[]'::jsonb)) as x(
      id uuid, lega_id uuid, local_id int, data date, deleted_at timestamptz);
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('serate', v_n);

  -- 3.9 serata_partecipanti (ponte) — FK serata + giocatore
  insert into public.serata_partecipanti (serata_id, giocatore_id)
  select x.serata_id, x.giocatore_id
    from jsonb_to_recordset(coalesce(payload->'serata_partecipanti', '[]'::jsonb)) as x(
      serata_id uuid, giocatore_id uuid);
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('serata_partecipanti', v_n);

  -- 3.10 sessioni_gioco — FK lega + gioco_lega + serata
  --      ⬅ G1: `gioco_key` = quale gioco (identità). `gioco_lega_id` resta il
  --      collegamento all'override, popolato solo quando quella riga esiste (M5).
  insert into public.sessioni_gioco (id, lega_id, local_id, gioco_key, gioco_lega_id, data, stato, ora_inizio, ora_fine, esito_pareggio, serata_id, deleted_at)
  select x.id, x.lega_id, x.local_id, x.gioco_key, x.gioco_lega_id, x.data, x.stato, x.ora_inizio, x.ora_fine, x.esito_pareggio, x.serata_id, x.deleted_at
    from jsonb_to_recordset(coalesce(payload->'sessioni_gioco', '[]'::jsonb)) as x(
      id uuid, lega_id uuid, local_id int, gioco_key text, gioco_lega_id uuid, data date, stato text,
      ora_inizio text, ora_fine text, esito_pareggio boolean, serata_id uuid, deleted_at timestamptz);
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('sessioni_gioco', v_n);

  -- 3.11 sessione_gioco_partecipanti (ponte)
  insert into public.sessione_gioco_partecipanti (sessione_gioco_id, giocatore_id)
  select x.sessione_gioco_id, x.giocatore_id
    from jsonb_to_recordset(coalesce(payload->'sessione_gioco_partecipanti', '[]'::jsonb)) as x(
      sessione_gioco_id uuid, giocatore_id uuid);
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('sessione_gioco_partecipanti', v_n);

  -- 3.12 partite_gioco — FK sessione
  insert into public.partite_gioco (id, sessione_gioco_id, local_id, ora_inizio, ora_fine, pareggio, nome_libero, ordine, deleted_at)
  select x.id, x.sessione_gioco_id, x.local_id, x.ora_inizio, x.ora_fine, x.pareggio, x.nome_libero, x.ordine, x.deleted_at
    from jsonb_to_recordset(coalesce(payload->'partite_gioco', '[]'::jsonb)) as x(
      id uuid, sessione_gioco_id uuid, local_id int, ora_inizio text, ora_fine text,
      pareggio boolean, nome_libero text, ordine int, deleted_at timestamptz);
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('partite_gioco', v_n);

  -- 3.13 partita_gioco_vincitori (ponte)
  insert into public.partita_gioco_vincitori (partita_gioco_id, giocatore_id)
  select x.partita_gioco_id, x.giocatore_id
    from jsonb_to_recordset(coalesce(payload->'partita_gioco_vincitori', '[]'::jsonb)) as x(
      partita_gioco_id uuid, giocatore_id uuid);
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('partita_gioco_vincitori', v_n);

  -- 3.14 partita_gioco_partecipanti (ponte)
  insert into public.partita_gioco_partecipanti (partita_gioco_id, giocatore_id)
  select x.partita_gioco_id, x.giocatore_id
    from jsonb_to_recordset(coalesce(payload->'partita_gioco_partecipanti', '[]'::jsonb)) as x(
      partita_gioco_id uuid, giocatore_id uuid);
  get diagnostics v_n = row_count;
  v_conteggi := v_conteggi || jsonb_build_object('partita_gioco_partecipanti', v_n);

  -- Conteggi per tabella: il client li confronta coi propri (I-R6).
  return v_conteggi;
end;
$$;

-- I-R8: senza questo, la chiamata muore con "permission denied for function".
grant execute on function public.import_locale(jsonb) to authenticated;
