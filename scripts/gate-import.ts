/* ════════════════════════════════════════════════════════════════════════
   GATE R7.3b — l'import one-shot contro un Postgres REALE (Supabase locale)
   ─────────────────────────────────────────────────────────────────────────
   Fratello di `gate-db.mjs` (che valida i mattoni del sync). Qui si valida
   l'operazione più pericolosa: il travaso iniziale dei dati locali nel cloud.
   Usa il payload builder VERO (`@whos-the-boss/core`), non un JSON finto: il
   punto è verificare il contratto builder ↔ RPC, che nessun unit test copre.

   Verifica (numeri dal red team, REDTEAM-R73-IMPORT.md):
     1. import ok → i conteggi della RPC combaciano con quelli del payload [I-R6]
     2. i dati sono davvero nel DB e leggibili (round-trip)
     3. doppio import → `already_imported`, nessun dato duplicato
     4. import CONCORRENTE (2 client insieme) → ne passa UNO SOLO       [I-R1]
     5. payload di versione ignota → rifiutato, non indovinato           [I-R7]
     6. transazione fallita → rollback totale E import ancora ritentabile
        (la guardia atomica non deve "consumare" l'import se poi si aborta)
     7. RLS: un altro account non vede i dati importati

   Uso: `pnpm exec tsx scripts/gate-import.ts` con Supabase locale acceso.
════════════════════════════════════════════════════════════════════════ */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import {
  battezzaDb, conteggiPayload, costruisciPayloadImport,
  haCambiamentiLocaliNonSincronizzati, orchestraImport, preflightImport,
  type Db, type DepsImport, type Lega,
} from '../packages/core/src/index';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON = process.env.SUPABASE_ANON_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

let passed = 0;
const ok = (msg: string) => { passed++; console.log(`  ✅ ${msg}`); };
const rnd = () => Math.random().toString(36).slice(2, 10);

interface Utente { client: SupabaseClient; userId: string }

async function nuovoUtente(tag: string): Promise<Utente> {
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signUp({ email: `imp_${tag}_${rnd()}@example.com`, password: 'password-123456' });
  assert(!error, `signUp ${tag}: ${error?.message}`);
  assert(data.session, `nessuna sessione per ${tag}`);
  return { client, userId: data.user!.id };
}

/** Un db locale realistico: poker (movimenti + debiti) + multigioco (serata,
    sessione, partita) + lega Personale. Tocca tutte le 13 tabelle e i 4 ponti. */
function dbFinto(): Db {
  const lega = (over: Partial<Lega>): Lega => ({
    id: 1, nome: 'Amici', foto: '', nomi: [], partite: [],
    sessioneAttiva: undefined, serate_bg: [], _nid: 3, _pid: 2, ...over,
  });
  return {
    _lid: 3, _currentLegaId: 1,
    leghe: [
      lega({
        id: 1, nome: 'Personale', personale: true,
        nomi: [{ id: 1, nome: 'Roberto' }],
      }),
      lega({
        id: 2, nome: 'Amici del giovedì',
        nomi: [{ id: 1, nome: 'Anna' }, { id: 2, nome: 'Bruno' }],
        // ⚠️ NIENTE `giochi`: l'app non popola MAI `lega.giochi` (i giochi
        // vengono dal catalogo globale; la UI custom è M5). Questa fixture
        // scriveva `giochi: [{ id: 'scopa', ... }]` a mano ed è per questo che
        // il gate passava 10/10 mentre l'app reale si bloccava sul preflight
        // (finding G1, R7_SCHEMA sez. Q): validava un mondo che non esiste.
        // Una fixture deve somigliare a ciò che lo store produce davvero.
        serate: [{ id: 1, data: '2026-07-17', partecipanti: [1, 2] }],
        sessioniGioco: [{
          id: 1, giocoId: 'scopa', data: '2026-07-17', stato: 'chiusa',
          ora_inizio: '21:00', ora_fine: '22:00', partecipanti: [1, 2], esitoPareggio: false, serataId: 1,
          partite: [{ id: 1, ora_inizio: '21:00', ora_fine: '21:30', vincitori: [1], pareggio: false, partecipanti: [1, 2] }],
        }],
        partite: [{
          id: 1, buy_in: 20, data: '2026-07-17', ora_inizio: '21:00', ora_fine: '23:30', modalita: 'cash',
          giocatori: [
            {
              id_nome: 1, entrate: 20, ricarica_fatta: 10, extra: 0, soldi_ricevuti: 15,
              fiches_finali: 45, netto_finale: 15, premio: 0, vincitore: true,
              buy_in_pagato: true, extra_pagato: false, posizione_finale: 1,
              add_on_fatto: false, add_on_pagato: false,
              ricariche: [{ importo: 10 }],
              pagamenti_effettuati: [], pagamenti_ricevuti: [{ from: 2, amount: 15 }],
            },
            {
              id_nome: 2, entrate: 20, ricarica_fatta: 0, extra: 0, soldi_ricevuti: 0,
              fiches_finali: 5, netto_finale: -15, premio: 0, vincitore: false,
              buy_in_pagato: true, extra_pagato: false, posizione_finale: 2,
              add_on_fatto: false, add_on_pagato: false,
              ricariche: [], pagamenti_effettuati: [{ to: 1, amount: 15 }], pagamenti_ricevuti: [],
            },
          ],
          settlements: [{ from: 2, to: 1, amount: 15, pagato: false }],
        }],
      }),
    ],
  };
}

async function importedAt(u: Utente): Promise<string | null> {
  const { data } = await u.client.from('profiles').select('imported_at').eq('id', u.userId).single();
  return (data as { imported_at: string | null } | null)?.imported_at ?? null;
}

async function main() {
  console.log('\nGATE R7.3b — import one-shot contro Postgres reale\n');

  // ── 1+2. import ok, conteggi combacianti, dati davvero nel DB ──
  const A = await nuovoUtente('A');
  const db = battezzaDb(dbFinto());
  assert.deepEqual(preflightImport(db), [], 'il fixture deve essere strutturalmente sano');
  const payload = costruisciPayloadImport(db, A.userId);
  const attesi = conteggiPayload(payload);

  const { data: conteggi, error: e1 } = await A.client.rpc('import_locale', { payload });
  assert(!e1, `import fallito: ${e1?.message}`);
  ok('import eseguito (RPC transazionale, RLS attiva)');

  assert.deepEqual(conteggi, attesi, `conteggi diversi!\nRPC:     ${JSON.stringify(conteggi)}\nPayload: ${JSON.stringify(attesi)}`);
  ok(`conteggi RPC == conteggi payload su tutte le tabelle (I-R6) — ${Object.values(attesi).reduce((a, b) => a + b, 0)} righe`);

  const { data: leghe } = await A.client.from('leghe').select('id, nome, personale').order('nome');
  assert.equal(leghe?.length, 2, 'le leghe importate non si rileggono');
  assert.equal(leghe![0].nome, 'Amici del giovedì');
  const { data: mov } = await A.client.from('poker_movimenti').select('tipo, importo');
  assert.equal(mov?.length, 3, 'i movimenti del ledger non sono arrivati tutti');
  const { data: sett } = await A.client.from('settlements').select('amount, pagato');
  assert.equal(Number(sett![0].amount), 15, 'importo del debito alterato dal round-trip (numeric↔float)');
  ok('round-trip: leghe, movimenti e debiti rileggibili e integri (numeric↔float ok)');

  // G1: il cloud deve sapere A COSA si è giocato. Prima esisteva solo la FK a
  // giochi_lega (mai popolata) → il gioco si perdeva in silenzio.
  const { data: sg } = await A.client.from('sessioni_gioco').select('gioco_key, gioco_lega_id');
  assert.equal(sg?.length, 1, 'la sessione di gioco non si rilegge');
  assert.equal(sg![0].gioco_key, 'scopa', 'il cloud non sa quale gioco è stato giocato (G1)');
  assert.equal(sg![0].gioco_lega_id, null, 'nessun override in giochi_lega: è il caso normale finché non arriva M5');
  ok('G1: `gioco_key` arriva nel cloud anche senza riga di override (sez. Q)');

  assert.ok(await importedAt(A), 'imported_at non valorizzato dopo un import riuscito');
  ok('guardia `imported_at` valorizzata dall\'import riuscito');

  // ── 3. doppio import → already_imported, niente duplicati ──
  const { error: e2 } = await A.client.rpc('import_locale', { payload });
  assert(e2, 'BUG: il secondo import è passato!');
  assert.match(e2.message, /already_imported/, `errore inatteso: ${e2.message}`);
  const { data: legheDopo } = await A.client.from('leghe').select('id');
  assert.equal(legheDopo?.length, 2, 'il secondo import ha duplicato le righe!');
  ok('doppio import respinto (`already_imported`), zero duplicati');

  // ── 4. IMPORT CONCORRENTE (I-R1, il finding ALTA) ──
  const B = await nuovoUtente('B');
  const dbB = battezzaDb(dbFinto());
  const payloadB = costruisciPayloadImport(dbB, B.userId);
  // due client autenticati sullo STESSO account, chiamata simultanea
  const B2 = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: sessB } = await B.client.auth.getSession();
  await B2.auth.setSession(sessB.session!);
  const esiti = await Promise.all([
    B.client.rpc('import_locale', { payload: payloadB }),
    B2.rpc('import_locale', { payload: payloadB }),
  ]);
  const riusciti = esiti.filter((e) => !e.error).length;
  assert.equal(riusciti, 1, `BUG DI CONCORRENZA: ${riusciti} import passati su 2 (la guardia non è atomica)`);
  const { data: legheB } = await B.client.from('leghe').select('id');
  assert.equal(legheB?.length, 2, `import concorrente ha duplicato: ${legheB?.length} leghe invece di 2`);
  ok('import CONCORRENTE: ne passa uno solo, zero duplicati (I-R1 — guardia atomica)');

  // ── 5. versione payload ignota → rifiuto ──
  const C = await nuovoUtente('C');
  const payloadC = { ...costruisciPayloadImport(battezzaDb(dbFinto()), C.userId), version: 99 };
  const { error: e5 } = await C.client.rpc('import_locale', { payload: payloadC });
  assert(e5, 'BUG: payload di versione ignota accettato!');
  assert.match(e5.message, /unsupported_payload_version/, `errore inatteso: ${e5.message}`);
  assert.equal(await importedAt(C), null, 'la versione rifiutata NON deve consumare la guardia (rollback)');
  ok('payload di versione ignota rifiutato + guardia intatta (I-R7)');

  // ── 6. transazione fallita → rollback totale e import ancora ritentabile ──
  const D = await nuovoUtente('D');
  const payloadRotto = costruisciPayloadImport(battezzaDb(dbFinto()), D.userId);
  // FK volutamente rotta: un giocatore che punta a una lega inesistente
  payloadRotto.giocatori[0] = { ...payloadRotto.giocatori[0], lega_id: '00000000-0000-4000-8000-000000000000' };
  const { error: e6 } = await D.client.rpc('import_locale', { payload: payloadRotto });
  assert(e6, 'BUG: payload con FK rotta accettato!');
  const { data: legheD } = await D.client.from('leghe').select('id');
  assert.equal(legheD?.length ?? 0, 0, `rollback fallito: ${legheD?.length} leghe rimaste dopo un import abortito`);
  assert.equal(await importedAt(D), null, 'BUG: la guardia è rimasta consumata dopo un import fallito → import irripetibile!');
  ok('import fallito: rollback totale (zero righe) e guardia riazzerata → ritentabile');

  // riprova pulita dopo il fallimento: deve funzionare
  const { error: e6b } = await D.client.rpc('import_locale', { payload: costruisciPayloadImport(battezzaDb(dbFinto()), D.userId) });
  assert(!e6b, `il retry dopo un import fallito non funziona: ${e6b?.message}`);
  ok('retry dopo un import fallito: riesce (la guardia era stata liberata dal rollback)');

  // ── 7. RLS: i dati importati sono privati ──
  const E = await nuovoUtente('E');
  const { data: spiate } = await E.client.from('leghe').select('id');
  assert.equal(spiate?.length ?? 0, 0, `RLS BUCATA: un altro account vede ${spiate?.length} leghe importate!`);
  ok('RLS: i dati importati non sono visibili ad altri account');

  await chaos();
  console.log(`\n✅ GATE + CHAOS PASSATI — ${passed} check verdi contro Postgres reale.\n`);
}

/* ════════════════════════════════════════════════════════════════════════
   CHAOS TEST (R7.3d) — l'orchestratore VERO contro il DB VERO, guasti veri.
   Gli unit test provano i rami con dipendenze finte; qui il server committa
   davvero e il client, davvero, non lo viene a sapere.
════════════════════════════════════════════════════════════════════════ */
function depsDi(u: Utente, dbIniziale: Db, over: Partial<DepsImport> = {}): { deps: DepsImport; db: () => Db } {
  let corrente = dbIniziale;
  const deps: DepsImport = {
    leggiDb: () => corrente,
    scriviDb: (d) => { corrente = d; },
    confermaPersist: async () => true,
    chiamaRpc: async (payload) => {
      const { data, error } = await u.client.rpc('import_locale', { payload });
      if (error) return { errore: error.message };
      return { conteggi: (data ?? {}) as Record<string, number> };
    },
    ownerId: u.userId,
    ...over,
  };
  return { deps, db: () => corrente };
}

async function chaos() {
  console.log('\n── CHAOS (R7.3d): guasti veri ──\n');

  // ── CHAOS 1: il server committa, la risposta si perde, l'utente ritenta ──
  const F = await nuovoUtente('F');
  const primo = depsDi(F, dbFinto(), {
    chiamaRpc: async (payload) => {
      await F.client.rpc('import_locale', { payload }); // il COMMIT avviene davvero
      return { errore: 'network request failed' };      // ...ma il client non lo sa
    },
  });
  const e1 = await orchestraImport(primo.deps);
  assert.equal(e1.stato, 'errore', 'il client deve vedere l\'errore di rete');
  ok('crash post-commit: il client vede un errore (il server invece HA importato)');

  const dopo = primo.db();
  assert.ok(haCambiamentiLocaliNonSincronizzati(dopo.leghe[0]), 'dopo un errore il locale deve restare da sincronizzare');
  ok('dopo l\'errore il locale resta "da sincronizzare" (nessuno stamp)');

  // retry con lo STESSO db: uid già battezzati e salvati (I-R5)
  const retry = depsDi(F, dopo);
  const e2 = await orchestraImport(retry.deps);
  assert.equal(e2.stato, 'gia_importato', `retry: atteso gia_importato, ricevuto ${e2.stato}`);
  ok('retry dopo la risposta persa: riconosciuto `gia_importato`, nessun secondo import');

  const { data: legheF } = await F.client.from('leghe').select('id');
  assert.equal(legheF?.length, 2, `DUPLICATI: ${legheF?.length} leghe invece di 2`);
  const { data: movF } = await F.client.from('poker_movimenti').select('id');
  assert.equal(movF?.length, 3, `DUPLICATI nei movimenti: ${movF?.length} invece di 3`);
  ok('zero duplicati sul server dopo il retry (gli uid stabili hanno retto)');

  assert.ok(haCambiamentiLocaliNonSincronizzati(retry.db().leghe[0]), 'su gia_importato il locale NON va marcato pulito');
  ok('su `gia_importato` il locale resta dirty: lo unira il delta-sync (I-R4)');

  // ── CHAOS 2: il disco non conferma → non si spedisce nulla ──
  const G = await nuovoUtente('G');
  const senzaDisco = depsDi(G, dbFinto(), { confermaPersist: async () => false });
  const e3 = await orchestraImport(senzaDisco.deps);
  assert.equal(e3.stato, 'errore', 'persist non confermato deve dare errore');
  const { data: legheG } = await G.client.from('leghe').select('id');
  assert.equal(legheG?.length ?? 0, 0, 'BUG: ha spedito uid non salvati sul telefono!');
  ok('disco che non conferma: NIENTE viene spedito (mai uid non salvati, I-R5)');

  // ── CHAOS 3: doppio tap sul pulsante ──
  const H = await nuovoUtente('H');
  const tap1 = depsDi(H, dbFinto());
  const tap2 = depsDi(H, dbFinto());
  const esiti = await Promise.all([orchestraImport(tap1.deps), orchestraImport(tap2.deps)]);
  const riusciti = esiti.filter((e) => e.stato === 'ok').length;
  assert.equal(riusciti, 1, `doppio tap: ${riusciti} import riusciti invece di 1`);
  const { data: legheH } = await H.client.from('leghe').select('id');
  assert.equal(legheH?.length, 2, `doppio tap ha duplicato: ${legheH?.length} leghe invece di 2`);
  ok('doppio tap sul pulsante: un solo import, zero duplicati');
}

main().catch((e) => { console.error(`\n❌ GATE/CHAOS FALLITO: ${e.message}\n`); process.exit(1); });
