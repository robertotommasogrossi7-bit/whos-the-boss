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
  battezzaDb, conteggiPayload, costruisciPayloadImport, preflightImport,
  type Db, type Lega,
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
        giochi: [{ id: 'scopa', nome: 'Scopa', preimpostato: true, attivo: true, pareggioComeVittoria: true }],
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

  console.log(`\n✅ GATE IMPORT PASSATO — ${passed} check verdi contro Postgres reale.\n`);
}

main().catch((e) => { console.error(`\n❌ GATE IMPORT FALLITO: ${e.message}\n`); process.exit(1); });
