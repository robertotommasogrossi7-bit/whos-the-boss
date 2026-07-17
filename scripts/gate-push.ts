/* ════════════════════════════════════════════════════════════════════════
   GATE R7.4c — il delta-push CAS contro un Postgres REALE (Supabase locale)
   ─────────────────────────────────────────────────────────────────────────
   Gemello di `gate-import.ts` per la RPC `push_lega` (migration #10). Usa il
   payload builder VERO (`costruisciPayloadPush`) + lo stamp VERO
   (`applicaStampPush`): il punto è validare il contratto builder ↔ RPC ↔
   stamp, che nessun unit test copre.

   Verifica (P.2 + P.8.2, R7_SCHEMA.md):
     1. INSERT righe nuove → rilette dal DB, conteggi RPC == payload [I-R6],
        `applicate` copre tutte le righe sincronizzate → stamp → zero delta
     2. UPDATE col pegno giusto → applicato, ritorna l'updated_at NUOVO
     3. CONFLITTO CAS (pegno stale) → l'INTERA tx abortisce con 'conflict':
        anche le righe già applicate prima del conflitto sono rollbackate
        + dopo il refresh del pegno (pull simulato) il re-push passa (LWW)
     4. doppio push identico (eco di un retry) → zero duplicati, zero clobber
     5. doppio push di un movimento → un solo record (append-only I5)
     6. seconda lega Personale → `unique_violation` PARLANTE col nome del
        vincolo, mai abort muto [P.8.2/S4-R2]
     7. versione payload ignota → rifiutata [S18]
     8. RLS: non si pusha in leghe altrui (guardia parlante, insert bloccato,
        CAS su riga invisibile → 'conflict' anche col pegno corretto)

   Uso: `pnpm gate:push` con Supabase locale acceso (db:start + db:reset,
   la reset applica anche la #10).
════════════════════════════════════════════════════════════════════════ */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import {
  applicaStampPush, battezzaDb, costruisciPayloadPush, generaUid, haRigheDaPushare,
  revisioniPush, type Db, type Lega, type PayloadPush,
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
  const { data, error } = await client.auth.signUp({ email: `push_${tag}_${rnd()}@example.com`, password: 'password-123456' });
  assert(!error, `signUp ${tag}: ${error?.message}`);
  assert(data.session, `nessuna sessione per ${tag}`);
  return { client, userId: data.user!.id };
}

interface EsitoPush { conteggi: Record<string, number>; applicate: Record<string, string> }

async function push(u: Utente, payload: unknown) {
  const { data, error } = await u.client.rpc('push_lega', { payload });
  return { data: data as EsitoPush | null, error };
}

/** Un edit locale come lo farebbe lo store: campi nuovi + syncRev bumpata. */
const dirty = <T extends { syncRev?: number }>(e: T, over: Partial<T> = {}): T =>
  ({ ...e, ...over, syncRev: (e.syncRev ?? 0) + 1 });

/** Stesso db realistico del gate-import: poker (movimenti + debiti) +
    multigioco (serata, sessione, partita) + lega Personale. Battezzato,
    OGNI riga è dirty senza pegno → il primo push è tutto-INSERT (come i
    dati creati offline su un device nuovo). */
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

function conteggiAttesi(p: PayloadPush): Record<string, number> {
  return {
    leghe: p.leghe.length, giocatori: p.giocatori.length, giochi_lega: p.giochi_lega.length,
    partite_poker: p.partite_poker.length, partita_poker_giocatori: p.partita_poker_giocatori.length,
    poker_movimenti: p.poker_movimenti.length, settlements: p.settlements.length,
    serate: p.serate.length, serata_partecipanti: p.serata_partecipanti.length,
    sessioni_gioco: p.sessioni_gioco.length, sessione_gioco_partecipanti: p.sessione_gioco_partecipanti.length,
    partite_gioco: p.partite_gioco.length, partita_gioco_vincitori: p.partita_gioco_vincitori.length,
    partita_gioco_partecipanti: p.partita_gioco_partecipanti.length,
  };
}

const stampa = (lega: Lega, spedite: Map<string, number>, esito: EsitoPush): Lega =>
  applicaStampPush(lega, spedite, new Map(Object.entries(esito.applicate)));

async function main() {
  console.log('\nGATE R7.4c — push CAS contro Postgres reale\n');

  // ── 1. primo push = tutto INSERT: conteggi, round-trip, stamp ──
  const A = await nuovoUtente('A');
  const db = battezzaDb(dbFinto());
  const [personale, amici] = db.leghe;

  const { error: eP } = await push(A, costruisciPayloadPush(personale, A.userId));
  assert(!eP, `push Personale fallito: ${eP?.message}`);

  const payloadAmici = costruisciPayloadPush(amici, A.userId);
  const spediteAmici = revisioniPush(amici);
  const { data: esito1, error: e1 } = await push(A, payloadAmici);
  assert(!e1, `push Amici fallito: ${e1?.message}`);
  ok('push eseguito (RPC transazionale per-lega, RLS attiva)');

  assert.deepEqual(esito1!.conteggi, conteggiAttesi(payloadAmici),
    `conteggi diversi!\nRPC:     ${JSON.stringify(esito1!.conteggi)}\nPayload: ${JSON.stringify(conteggiAttesi(payloadAmici))}`);
  ok(`conteggi RPC == conteggi payload su tutte le tabelle (I-R6) — ${Object.values(esito1!.conteggi).reduce((a, b) => a + b, 0)} righe`);

  // `applicate` copre ESATTAMENTE le righe sincronizzate (non movimenti/ponti)
  const attesiSync = payloadAmici.leghe.length + payloadAmici.giocatori.length
    + payloadAmici.partite_poker.length + payloadAmici.partita_poker_giocatori.length
    + payloadAmici.settlements.length + payloadAmici.serate.length
    + payloadAmici.sessioni_gioco.length + payloadAmici.partite_gioco.length;
  assert.equal(Object.keys(esito1!.applicate).length, attesiSync, 'applicate non copre tutte le righe sincronizzate');
  assert.ok(esito1!.applicate[amici.uid!], 'manca l\'updated_at della lega stessa');
  ok(`\`applicate\` ritorna l'updated_at di tutte le ${attesiSync} righe sincronizzate (P.8.2)`);

  const { data: leghe } = await A.client.from('leghe').select('nome').order('nome');
  assert.equal(leghe?.length, 2, 'le leghe pushate non si rileggono');
  const { data: mov } = await A.client.from('poker_movimenti').select('id');
  assert.equal(mov?.length, 3, 'i movimenti del ledger non sono arrivati tutti');
  const { data: sett } = await A.client.from('settlements').select('amount');
  assert.equal(Number(sett![0].amount), 15, 'importo del debito alterato dal round-trip');
  const { data: sg } = await A.client.from('sessioni_gioco').select('gioco_key');
  assert.equal(sg![0].gioco_key, 'scopa', 'gioco_key non arrivato (G1)');
  ok('round-trip: leghe, movimenti, debiti e gioco_key rileggibili e integri');

  let legaSync = stampa(amici, spediteAmici, esito1!);
  assert.equal(haRigheDaPushare(costruisciPayloadPush(legaSync, A.userId)), false,
    'dopo lo stamp non deve restare delta');
  ok('stamp: syncedRev + lastSyncedAt applicati → zero delta al giro dopo (O.3)');

  // ── 2. UPDATE col pegno giusto ──
  const legaEdit: Lega = {
    ...legaSync,
    nomi: legaSync.nomi.map((n) => (n.id === 1 ? dirty(n, { nome: 'Anna Bis' }) : n)),
    partite: legaSync.partite.map((pt) => ({
      ...pt,
      settlements: pt.settlements.map((s) => dirty(s, { pagato: true })),
    })),
  };
  const payload2 = costruisciPayloadPush(legaEdit, A.userId);
  assert.equal(payload2.giocatori.length, 1, 'doveva entrare solo il giocatore editato');
  assert.equal(payload2.settlements.length, 1, 'doveva entrare solo il settlement editato');
  const annaUid = payload2.giocatori[0].id;
  const pegnoAnna = payload2.giocatori[0].expected_updated_at;
  assert.ok(pegnoAnna, 'la riga già sincronizzata deve portare il pegno');

  const spedite2 = revisioniPush(legaEdit);
  const { data: esito2, error: e2 } = await push(A, payload2);
  assert(!e2, `update col pegno giusto fallito: ${e2?.message}`);
  assert.equal(esito2!.conteggi.giocatori, 1);
  assert.equal(esito2!.conteggi.settlements, 1);
  assert.ok(esito2!.applicate[annaUid] && esito2!.applicate[annaUid] !== pegnoAnna,
    'la RPC deve ritornare l\'updated_at NUOVO, non il pegno vecchio');
  const { data: annaDb } = await A.client.from('giocatori').select('nome').eq('id', annaUid).single();
  assert.equal(annaDb!.nome, 'Anna Bis', 'la rinomina non è arrivata sul server');
  const { data: settDb } = await A.client.from('settlements').select('pagato');
  assert.equal(settDb![0].pagato, true, 'il debito saldato non è arrivato sul server');
  ok('UPDATE col pegno giusto: applicato, updated_at nuovo ritornato (soldi inclusi)');

  legaSync = stampa(legaEdit, spedite2, esito2!);
  assert.equal(haRigheDaPushare(costruisciPayloadPush(legaSync, A.userId)), false);

  // ── 3. CONFLITTO CAS: pegno stale → abort dell'INTERA transazione ──
  // "device B" tocca Anna direttamente sul server → updated_at cambia
  const { error: eB } = await A.client.from('giocatori').update({ nome: 'Anna DeviceB' }).eq('id', annaUid);
  assert(!eB, `update device B fallito: ${eB?.message}`);

  // edit locale: la LEGA rinominata (pegno giusto, tabella applicata PRIMA)
  // + Anna rinominata (pegno ormai stale, che fa abortire tutto)
  const legaConf: Lega = dirty(
    { ...legaSync, nomi: legaSync.nomi.map((n) => (n.id === 1 ? dirty(n, { nome: 'Anna C.' }) : n)) },
    { nome: 'Amici RINOMINATA' },
  );
  const { error: e3 } = await push(A, costruisciPayloadPush(legaConf, A.userId));
  assert(e3, 'BUG: il push col pegno stale è passato!');
  assert.match(e3!.message, /conflict/, `errore inatteso: ${e3!.message}`);
  assert.match(e3!.message, /giocatori/, 'l\'errore deve dire QUALE tabella ha confligto');
  const { data: legaDb } = await A.client.from('leghe').select('nome').eq('id', legaSync.uid!).single();
  assert.equal(legaDb!.nome, 'Amici del giovedì',
    'ROLLBACK MANCATO: la rinomina della lega (applicata prima del conflitto) è rimasta!');
  const { data: annaB } = await A.client.from('giocatori').select('nome').eq('id', annaUid).single();
  assert.equal(annaB!.nome, 'Anna DeviceB', 'la versione del device B doveva restare intatta');
  ok('conflitto CAS: tx abortita TUTTA (niente scritture parziali), errore \'conflict\' parlante');

  // il protocollo WatermelonDB: pull (qui simulato col refresh del pegno) → re-push
  const { data: annaSrv } = await A.client.from('giocatori').select('updated_at').eq('id', annaUid).single();
  const legaRetry: Lega = {
    ...legaConf,
    nomi: legaConf.nomi.map((n) => (n.id === 1 ? { ...n, lastSyncedAt: annaSrv!.updated_at as string } : n)),
  };
  const spediteRetry = revisioniPush(legaRetry);
  const { data: esitoR, error: eR } = await push(A, costruisciPayloadPush(legaRetry, A.userId));
  assert(!eR, `re-push dopo il refresh del pegno fallito: ${eR?.message}`);
  const { data: annaFinale } = await A.client.from('giocatori').select('nome').eq('id', annaUid).single();
  assert.equal(annaFinale!.nome, 'Anna C.', 'il dirty locale doveva sovrascrivere (LWW dichiarato)');
  ok('dopo il refresh del pegno (pull simulato) il re-push passa: LWW dichiarato = LWW reale (P.3)');

  legaSync = stampa(legaRetry, spediteRetry, esitoR!);
  assert.equal(haRigheDaPushare(costruisciPayloadPush(legaSync, A.userId)), false);

  // ── 4. doppio push identico (eco di un retry): zero duplicati, zero clobber ──
  const { data: esitoEco, error: eEco } = await push(A, payloadAmici);
  assert(!eEco, `l'eco del primo push doveva passare senza errori: ${eEco?.message}`);
  assert.equal(Object.values(esitoEco!.conteggi).reduce((a, b) => a + b, 0), 0,
    `l'eco ha applicato righe: ${JSON.stringify(esitoEco!.conteggi)}`);
  assert.deepEqual(esitoEco!.applicate, {}, 'l\'eco non deve confermare nulla');
  const { data: legheEco } = await A.client.from('leghe').select('id');
  assert.equal(legheEco?.length, 2, 'l\'eco ha duplicato le leghe!');
  const { data: annaEco } = await A.client.from('giocatori').select('nome').eq('id', annaUid).single();
  assert.equal(annaEco!.nome, 'Anna C.', 'CLOBBER: l\'eco (dati vecchi) ha sovrascritto un edit successivo!');
  ok('doppio push identico: zero duplicati e zero clobber (DO NOTHING, S10)');

  // ── 5. doppio push di un movimento: append-only, un solo record ──
  const legaGp: Lega = {
    ...legaSync,
    partite: legaSync.partite.map((pt) => ({
      ...pt,
      giocatori: pt.giocatori.map((g) => (g.id_nome === 1 ? dirty(g, { fiches_finali: 50 }) : g)),
    })),
  };
  const payloadGp = costruisciPayloadPush(legaGp, A.userId);
  assert.equal(payloadGp.poker_movimenti.length, 2, 'i movimenti devono seguire la gp dirty');
  const spediteGp = revisioniPush(legaGp);
  const { data: esitoGp, error: eGp } = await push(A, payloadGp);
  assert(!eGp, `push della gp editata fallito: ${eGp?.message}`);
  assert.equal(esitoGp!.conteggi.partita_poker_giocatori, 1, 'l\'edit della gp doveva applicarsi');
  assert.equal(esitoGp!.conteggi.poker_movimenti, 0, 'i movimenti ri-spediti NON dovevano inserirsi di nuovo');
  const { data: movDopo } = await A.client.from('poker_movimenti').select('id');
  assert.equal(movDopo?.length, 3, `DUPLICATI nel ledger: ${movDopo?.length} movimenti invece di 3`);
  ok('doppio push di un movimento: un solo record (append-only I5, ledger prima dei settlement)');
  legaSync = stampa(legaGp, spediteGp, esitoGp!);

  // ── 6. seconda lega Personale → unique_violation PARLANTE ──
  const dbP2 = battezzaDb({
    _lid: 4, _currentLegaId: 3,
    leghe: [{
      id: 3, nome: 'Personale bis', personale: true, foto: '',
      nomi: [{ id: 1, nome: 'Roberto 2' }], partite: [],
      sessioneAttiva: undefined, serate_bg: [], _nid: 2, _pid: 1,
    }],
  });
  const { error: eU } = await push(A, costruisciPayloadPush(dbP2.leghe[0], A.userId));
  assert(eU, 'BUG: la seconda lega Personale è entrata!');
  assert.match(eU!.message, /unique_violation/, `errore inatteso: ${eU!.message}`);
  assert.match(eU!.message, /leghe_personale_uniq/, 'l\'errore deve dire QUALE vincolo è violato');
  assert.match((eU as unknown as { hint?: string }).hint ?? '', /Personale/, 'l\'hint deve spiegare il caso in italiano');
  const { data: pers } = await A.client.from('leghe').select('id').eq('personale', true);
  assert.equal(pers?.length, 1, 'la seconda Personale è entrata nel DB!');
  ok('seconda lega Personale: errore PARLANTE (vincolo + hint), mai abort muto (P.8.2/S4-R2)');

  // ── 7. versione payload ignota → rifiutata ──
  const { error: eV } = await push(A, { ...payloadAmici, version: 99 });
  assert(eV, 'BUG: payload di versione ignota accettato!');
  assert.match(eV!.message, /unsupported_payload_version/, `errore inatteso: ${eV!.message}`);
  ok('payload di versione ignota rifiutato (S18)');

  // ── 8. RLS: non si pusha in leghe altrui ──
  const E = await nuovoUtente('E');
  const amiciUid = legaSync.uid!;
  const legaFinta: Lega = {
    id: 1, nome: 'Intrusa', foto: '', _nid: 1, _pid: 2,
    nomi: [], sessioneAttiva: undefined, serate_bg: [],
    partite: [{
      id: 1, buy_in: 10, data: '2026-07-17', ora_inizio: '21:00', ora_fine: '22:00', modalita: 'cash',
      giocatori: [], settlements: [], uid: generaUid(), syncRev: 1,
    }],
    uid: amiciUid, syncRev: 1, syncedRev: 1, // lega "già sincronizzata" → non entra nel payload
  };
  // 8a: la lega non è di E e il payload non la crea → guardia parlante, zero scritture
  const { error: e8a } = await push(E, costruisciPayloadPush(legaFinta, E.userId));
  assert(e8a, 'BUG: push in una lega altrui passato!');
  assert.match(e8a!.message, /lega_non_trovata/, `errore inatteso: ${e8a!.message}`);

  // 8b: E "dichiara" la lega nel payload (l'INSERT cade su DO NOTHING perché
  // l'id è di A) → il figlio muore sulla RLS, transazione abortita
  const { error: e8b } = await push(E, costruisciPayloadPush({ ...legaFinta, syncedRev: 0 }, E.userId));
  assert(e8b, 'BUG: push in una lega altrui passato aggirando la guardia!');
  assert.match(e8b!.message, /row-level security/, `errore inatteso: ${e8b!.message}`);
  const { data: partiteA } = await A.client.from('partite_poker').select('id');
  assert.equal(partiteA?.length, 1, 'RLS BUCATA: la partita intrusa è entrata nella lega di A!');

  // 8c: CAS su una riga altrui col pegno CORRETTO (attaccante onnisciente):
  // la RLS la rende invisibile → 0 righe → 'conflict', mai un write
  const { data: annaOra } = await A.client.from('giocatori').select('updated_at').eq('id', annaUid).single();
  const legaFinta3: Lega = {
    ...legaFinta, partite: [], syncedRev: 0,
    nomi: [{ id: 1, nome: 'HACK', uid: annaUid, syncRev: 2, syncedRev: 1, lastSyncedAt: annaOra!.updated_at as string }],
  };
  const { error: e8c } = await push(E, costruisciPayloadPush(legaFinta3, E.userId));
  assert(e8c, 'BUG: update cross-account passato!');
  assert.match(e8c!.message, /conflict/, `errore inatteso: ${e8c!.message}`);
  const { data: annaIntatta } = await A.client.from('giocatori').select('nome').eq('id', annaUid).single();
  assert.equal(annaIntatta!.nome, 'Anna C.', 'RLS BUCATA: un altro account ha modificato un giocatore di A!');
  ok('RLS: lega altrui → guardia parlante · insert intruso bloccato · CAS cross-account respinto');

  console.log(`\n✅ GATE PASSATO — ${passed} check verdi contro Postgres reale.\n`);
}

main().catch((e) => { console.error(`\n❌ GATE FALLITO: ${e.message}\n`); process.exit(1); });
