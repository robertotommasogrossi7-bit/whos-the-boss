/* ════════════════════════════════════════════════════════════════════════
   GATE R7.4e — CHAOS: l'orchestratore VERO del sync contro Postgres REALE
   ─────────────────────────────────────────────────────────────────────────
   gate-push valida la RPC; gli unit di orchestraSync validano ordine e rami
   con deps finte. Qui si chiude il cerchio: `creaSync` con i fili VERI
   (select PostgREST per lo snapshot, RPC push_lega), due "device" simulati
   (stesso account, db locali separati) e i guasti veri di P.7/R7.4e:

     1. cloud vergine + dati locali → PRIMA SEMINA automatica dentro il ciclo
        (R7.4f: nessun pulsante; passa dall'import, mai dal push)
     2. secondo giro = no-op che SEMINA i pegni (contratto O.3/I-R3)
     3. edit → sync → il server ha la modifica
     4. device B nuovo → ADOZIONE automatica con backup; i dati passano
        integri per la materializzazione (soldi, ledger, gioco_key)
     4b. device C con dati veri → adozione solo dopo CONFERMA (DS9)
     5. edit su righe DIVERSE dai 2 device → convergenza, zero conflitti
     6. STESSA riga, scrittura interlacciata fra pull e push → `conflitto`
        al primo giro; il secondo risolve (LWW), tutti convergono
     7. crash post-commit a metà push → il retry si auto-guarisce senza
        duplicati nel ledger (pegno riseminato dal pull + UPDATE no-op B31)
     8. logout durante il ciclo → `scartato`, locale intatto, niente push
     9. doppio trigger simultaneo → un solo ciclo esegue (mutex S11)
    10. tombstone di una partita → si propaga al device B (delete-wins)

   Uso: `pnpm gate:sync` con Supabase locale acceso (db:start + db:reset).
════════════════════════════════════════════════════════════════════════ */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import {
  battezzaDb, costruisciPayloadPush, creaSync, haRigheDaPushare, orchestraImport,
  tombstonaPartita,
  type Db, type DepsImport, type DepsSync, type EsitoSync, type Lega,
  type PayloadPush, type SnapshotCloud,
} from '../packages/core/src/index';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON = process.env.SUPABASE_ANON_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

let passed = 0;
const ok = (msg: string) => { passed++; console.log(`  ✅ ${msg}`); };
const rnd = () => Math.random().toString(36).slice(2, 10);

const TABELLE = [
  'leghe', 'giocatori', 'giochi_lega',
  'partite_poker', 'partita_poker_giocatori', 'poker_movimenti', 'settlements',
  'serate', 'serata_partecipanti',
  'sessioni_gioco', 'sessione_gioco_partecipanti',
  'partite_gioco', 'partita_gioco_vincitori', 'partita_gioco_partecipanti',
] as const;

async function scaricaSnapshot(client: SupabaseClient): Promise<{ snapshot: SnapshotCloud } | { errore: string }> {
  const esiti = await Promise.all(TABELLE.map((t) => client.from(t).select('*')));
  const rotto = esiti.find((e) => e.error);
  if (rotto?.error) return { errore: rotto.error.message };
  const snapshot = Object.fromEntries(
    TABELLE.map((t, i) => [t, esiti[i].data ?? []]),
  ) as unknown as SnapshotCloud;
  return { snapshot };
}

/* Un "device": stesso account, db locale proprio. È il gemello di lib/sync.ts
   dell'app, con lo storage sostituito da una variabile. */
interface Device {
  deps: DepsSync;
  sync: (opz?: { adozioneConfermata?: boolean }) => Promise<EsitoSync>;
  db: () => Db;
  setDb: (d: Db) => void;
  contatori: { backup: number; push: number; import: number };
}

function creaDevice(client: SupabaseClient, userId: string, iniziale: Db): Device {
  let db = iniziale;
  const contatori = { backup: 0, push: 0, import: 0 };
  const deps: DepsSync = {
    leggiDb: () => db,
    scriviDb: (d) => { db = d; },
    accountAttuale: () => userId,
    scaricaSnapshot: () => scaricaSnapshot(client),
    chiamaRpcPush: async (payload: PayloadPush) => {
      contatori.push++;
      const { data, error } = await client.rpc('push_lega', { payload });
      if (error) return { errore: error.message };
      return data as { conteggi: Record<string, number>; applicate: Record<string, string> };
    },
    salvaBackupPreAdozione: async () => { contatori.backup++; },
    // La prima semina, come in app (R7.4f): l'orchestratore dell'import VERO
    // agganciato alla RPC vera — nessun pulsante, la chiama il ciclo di sync.
    eseguiImport: () => {
      contatori.import++;
      const depsImport: DepsImport = {
        leggiDb: () => db,
        scriviDb: (d) => { db = d; },
        confermaPersist: async () => true,
        chiamaRpc: async (payload) => {
          const { data, error } = await client.rpc('import_locale', { payload });
          if (error) return { errore: error.message };
          return { conteggi: (data ?? {}) as Record<string, number> };
        },
        ownerId: userId,
      };
      return orchestraImport(depsImport);
    },
  };
  return { deps, sync: creaSync(deps), db: () => db, setDb: (d) => { db = d; }, contatori };
}

/* ── Fixture: lo stesso db realistico dei gate precedenti ── */
function dbFinto(): Db {
  const lega = (over: Partial<Lega>): Lega => ({
    id: 1, nome: 'Amici', foto: '', nomi: [], partite: [],
    sessioneAttiva: undefined, serate_bg: [], _nid: 3, _pid: 2, ...over,
  });
  return {
    _lid: 3, _currentLegaId: 1,
    leghe: [
      lega({ id: 1, nome: 'Personale', personale: true, nomi: [{ id: 1, nome: 'Roberto' }] }),
      lega({
        id: 2, nome: 'Amici del giovedì',
        nomi: [{ id: 1, nome: 'Anna' }, { id: 2, nome: 'Bruno' }],
        serate: [{ id: 1, data: '2026-07-18', partecipanti: [1, 2] }],
        sessioniGioco: [{
          id: 1, giocoId: 'scopa', data: '2026-07-18', stato: 'chiusa',
          ora_inizio: '21:00', ora_fine: '22:00', partecipanti: [1, 2], esitoPareggio: false, serataId: 1,
          partite: [{ id: 1, ora_inizio: '21:00', ora_fine: '21:30', vincitori: [1], pareggio: false, partecipanti: [1, 2] }],
        }],
        partite: [{
          id: 1, buy_in: 20, data: '2026-07-18', ora_inizio: '21:00', ora_fine: '23:30', modalita: 'cash',
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

/** Il Personale auto-creato al primo avvio (telefono nuovo). */
function dbTelefonoNuovo(): Db {
  return battezzaDb({
    _lid: 2, _currentLegaId: 1,
    leghe: [{
      id: 1, nome: 'Personale', personale: true, foto: '',
      nomi: [{ id: 1, nome: 'Roberto' }], partite: [],
      sessioneAttiva: undefined, serate_bg: [], _nid: 2, _pid: 1,
    }],
  });
}

/* ── Helper di edit (come farebbe lo store: campi nuovi + syncRev+1) ── */
const touch = <T extends { syncRev?: number }>(e: T, over: Partial<T> = {}): T =>
  ({ ...e, ...over, syncRev: (e.syncRev ?? 0) + 1 });

function rinominaPerUid(db: Db, uid: string, nome: string): Db {
  return {
    ...db,
    leghe: db.leghe.map((l) => ({
      ...l,
      nomi: l.nomi.map((n) => (n.uid === uid ? touch(n, { nome }) : n)),
    })),
  };
}
function saldaPerUid(db: Db, uid: string): Db {
  return {
    ...db,
    leghe: db.leghe.map((l) => ({
      ...l,
      partite: l.partite.map((p) => ({
        ...p,
        settlements: p.settlements.map((s) => (s.uid === uid ? touch(s, { pagato: true }) : s)),
      })),
    })),
  };
}

const nomeDi = (db: Db, uid: string): string | undefined =>
  db.leghe.flatMap((l) => l.nomi).find((n) => n.uid === uid)?.nome;

function tuttoPulito(dev: Device, userId: string): boolean {
  return dev.db().leghe.every((l) => !l.uid || !haRigheDaPushare(costruisciPayloadPush(l, userId)));
}

async function main() {
  console.log('\nGATE R7.4e — chaos: orchestratore vero contro Postgres reale\n');

  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: reg, error: eReg } = await client.auth.signUp({
    email: `sync_${rnd()}@example.com`, password: 'password-123456',
  });
  assert(!eReg && reg.session, `signUp: ${eReg?.message}`);
  const userId = reg.user!.id;

  // ── 1. cloud vergine: la PRIMA SEMINA parte da sola, dentro il ciclo (R7.4f) ──
  const A = creaDevice(client, userId, battezzaDb(dbFinto()));
  const s1 = await A.sync();
  assert.equal(s1.stato, 'ok', `prima semina fallita: ${JSON.stringify(s1)}`);
  assert.ok(s1.stato === 'ok' && s1.importato, 'il primo giro deve dichiarare la semina');
  assert.equal(A.contatori.import, 1, 'la semina passa dall\'import…');
  assert.equal(A.contatori.push, 0, '…mai dalla RPC push');
  const { data: legheSeminate } = await client.from('leghe').select('id');
  assert.equal(legheSeminate?.length, 2, 'i dati locali non sono arrivati sul cloud');
  ok('cloud vergine + dati locali → semina AUTOMATICA nel ciclo, senza pulsanti (R7.4f)');

  // ── 2. secondo giro: no-op che semina i pegni del CAS (O.3/I-R3) ──
  const s2 = await A.sync();
  assert.deepEqual(s2, { stato: 'ok', pushate: 0 }, `atteso no-op, ricevuto ${JSON.stringify(s2)}`);
  assert.equal(A.contatori.import, 1, 'la semina NON si ripete');
  assert.equal(A.contatori.push, 0, 'niente delta dopo la semina → la RPC push non va chiamata');
  const amiciA = A.db().leghe.find((l) => !l.personale)!;
  assert.ok(amiciA.lastSyncedAt, 'il primo pull deve SEMINARE il pegno (regola del pegno)');
  assert.ok(amiciA.nomi.every((n) => n.lastSyncedAt), 'pegno seminato su tutte le righe');
  ok('secondo giro dopo la semina: no-op (zero push) che semina i pegni del CAS (O.3/I-R3)');

  const uidAmici = amiciA.uid!;
  const uidAnna = amiciA.nomi.find((n) => n.nome === 'Anna')!.uid!;
  const uidBruno = amiciA.nomi.find((n) => n.nome === 'Bruno')!.uid!;
  const uidSett = amiciA.partite[0].settlements[0].uid!;

  // ── 3. edit → sync → il server ce l'ha ──
  A.setDb(rinominaPerUid(A.db(), uidAnna, 'Anna Bis'));
  const s3 = await A.sync();
  assert.equal(s3.stato, 'ok');
  assert.ok(s3.stato === 'ok' && s3.pushate >= 1);
  const { data: annaSrv } = await client.from('giocatori').select('nome').eq('id', uidAnna).single();
  assert.equal(annaSrv!.nome, 'Anna Bis');
  assert.ok(tuttoPulito(A, userId), 'dopo il push confermato non resta delta');
  ok('edit → sync: la modifica è sul server e il locale torna pulito');

  // ── 4. device B "telefono nuovo": adozione AUTOMATICA, dati integri ──
  const B = creaDevice(client, userId, dbTelefonoNuovo());
  const s4 = await B.sync();
  assert.deepEqual(s4, { stato: 'ok', pushate: 0, adottato: true });
  assert.equal(B.contatori.backup, 1, 'il backup pre-adozione va salvato comunque');
  const amiciB = B.db().leghe.find((l) => !l.personale)!;
  assert.equal(nomeDi(B.db(), uidAnna), 'Anna Bis', 'B deve vedere la rinomina già fatta da A');
  const gp1 = amiciB.partite[0].giocatori.find((g) => g.ricariche.length > 0)!;
  assert.equal(gp1.ricariche[0].importo, 10, 'ledger ricostruito (ricarica)');
  assert.equal(gp1.pagamenti_ricevuti[0]?.amount, 15, 'ledger ricostruito (pagamento)');
  assert.equal(amiciB.partite[0].settlements[0].amount, 15, 'soldi integri attraverso la materializzazione');
  assert.equal(amiciB.sessioniGioco?.[0]?.giocoId, 'scopa', 'gioco_key → giocoId (G1)');
  assert.ok(tuttoPulito(B, userId), 'le righe adottate nascono pulite');
  ok('device B nuovo: adozione automatica con backup, soldi+ledger+gioco integri');

  // ── 4b. device C con dati VERI: adozione solo dopo conferma (DS9) ──
  const C = creaDevice(client, userId, battezzaDb(dbFinto()));
  assert.equal((await C.sync()).stato, 'adozione_richiesta');
  assert.equal(C.contatori.backup, 0, 'senza conferma non si tocca niente');
  const s4b = await C.sync({ adozioneConfermata: true });
  assert.deepEqual(s4b, { stato: 'ok', pushate: 0, adottato: true });
  assert.equal(C.db().leghe.find((l) => !l.personale)?.uid, uidAmici, 'C ha adottato il cloud');
  ok('device C con dati: si ferma su `adozione_richiesta`, adotta solo dopo la conferma');

  // ── 5. righe DIVERSE sui 2 device → convergenza senza conflitti ──
  A.setDb(rinominaPerUid(A.db(), uidBruno, 'Bruno B.'));
  B.setDb(saldaPerUid(B.db(), uidSett));
  assert.equal((await A.sync()).stato, 'ok');   // A spinge Bruno
  assert.equal((await B.sync()).stato, 'ok');   // B prende Bruno, spinge il debito
  assert.equal((await A.sync()).stato, 'ok');   // A prende il debito
  assert.equal(nomeDi(B.db(), uidBruno), 'Bruno B.');
  const settA = A.db().leghe.flatMap((l) => l.partite).flatMap((p) => p.settlements).find((s) => s.uid === uidSett)!;
  assert.equal(settA.pagato, true, 'il debito saldato su B deve arrivare ad A');
  assert.ok(tuttoPulito(A, userId) && tuttoPulito(B, userId));
  ok('edit su righe diverse: 3 giri e i due device convergono, zero conflitti');

  // ── 6. STESSA riga, scrittura interlacciata → conflitto, poi LWW ──
  B.setDb(rinominaPerUid(B.db(), uidAnna, 'Anna vince'));
  const syncInterlacciato = creaSync({
    ...B.deps,
    scaricaSnapshot: async () => {
      const snap = await scaricaSnapshot(client); // B fotografa il cloud...
      // ...e PRIMA che B arrivi al push, A scrive la stessa riga (race vera)
      A.setDb(rinominaPerUid(A.db(), uidAnna, 'Anna A2'));
      assert.equal((await A.sync()).stato, 'ok');
      return snap;
    },
  });
  assert.deepEqual(await syncInterlacciato(), { stato: 'conflitto' },
    'il pegno di B è stale: il CAS DEVE far abortire il push');
  const { data: annaDopoRace } = await client.from('giocatori').select('nome').eq('id', uidAnna).single();
  assert.equal(annaDopoRace!.nome, 'Anna A2', 'sul conflitto non deve entrare NIENTE di B');
  assert.equal((await B.sync()).stato, 'ok', 'il giro dopo risolve (pegno rinfrescato dal pull)');
  const { data: annaFinale } = await client.from('giocatori').select('nome').eq('id', uidAnna).single();
  assert.equal(annaFinale!.nome, 'Anna vince', 'LWW: il dirty locale di B sovrascrive');
  assert.equal((await A.sync()).stato, 'ok');
  assert.equal(nomeDi(A.db(), uidAnna), 'Anna vince', 'A converge sulla versione vincente');
  ok('stessa riga in race: `conflitto` al primo giro, il secondo risolve, tutti convergono (LWW)');

  // ── 7. crash post-commit a metà push → retry senza duplicati ──
  const gpUid = amiciA.partite[0].giocatori[0].uid!;
  A.setDb({
    ...A.db(),
    leghe: A.db().leghe.map((l) => ({
      ...l,
      partite: l.partite.map((p) => ({
        ...p,
        giocatori: p.giocatori.map((g) => (g.uid === gpUid ? touch(g, { fiches_finali: 99 }) : g)),
      })),
    })),
  });
  const syncCrash = creaSync({
    ...A.deps,
    chiamaRpcPush: async (payload) => {
      await client.rpc('push_lega', { payload }); // il COMMIT avviene davvero
      return { errore: 'network request failed' }; // ...ma il client non lo sa
    },
  });
  assert.equal((await syncCrash()).stato, 'errore');
  const legaDirty = A.db().leghe.find((l) => l.uid === uidAmici)!;
  assert.ok(haRigheDaPushare(costruisciPayloadPush(legaDirty, userId)), 'dopo il crash il locale resta dirty');
  assert.equal((await A.sync()).stato, 'ok', 'il retry deve auto-guarire (pegno dal pull + UPDATE no-op B31)');
  assert.ok(tuttoPulito(A, userId), 'dopo il retry tutto confermato');
  const { data: movTot } = await client.from('poker_movimenti').select('id');
  assert.equal(movTot?.length, 3, `DUPLICATI nel ledger dopo il retry: ${movTot?.length} invece di 3`);
  const { data: gpSrv } = await client.from('partita_poker_giocatori').select('fiches_finali').eq('id', gpUid).single();
  assert.equal(Number(gpSrv!.fiches_finali), 99, 'l\'edit del crash è comunque arrivato (commit reale)');
  ok('crash post-commit: locale dirty, retry auto-guarito, ZERO duplicati nel ledger');

  // ── 8. logout durante il ciclo → scartato, niente scritto ──
  B.setDb(rinominaPerUid(B.db(), uidBruno, 'Bruno HACK'));
  let vivo = true;
  const syncLogout = creaSync({
    ...B.deps,
    accountAttuale: () => (vivo ? userId : null),
    scaricaSnapshot: async () => { const s = await scaricaSnapshot(client); vivo = false; return s; },
  });
  const pushPrima = B.contatori.push;
  assert.deepEqual(await syncLogout(), { stato: 'scartato' });
  assert.equal(B.contatori.push, pushPrima, 'niente push dopo il logout');
  const { data: brunoSrv } = await client.from('giocatori').select('nome').eq('id', uidBruno).single();
  assert.equal(brunoSrv!.nome, 'Bruno B.', 'il server non deve vedere l\'edit del ciclo scartato');
  vivo = true;
  assert.equal((await B.sync()).stato, 'ok'); // rientrato: l'edit parte al giro dopo
  ok('logout durante il ciclo: risultati scartati, il server resta com\'era (S20)');

  // ── 9. doppio trigger simultaneo → un solo ciclo (mutex S11) ──
  A.setDb(rinominaPerUid(A.db(), uidBruno, 'Bruno C.'));
  const [t1, t2] = await Promise.all([A.sync(), A.sync()]);
  const saltati = [t1, t2].filter((e) => e.stato === 'saltato' && e.motivo === 'in_corso');
  assert.equal(saltati.length, 1, `mutex: atteso 1 salto, ${JSON.stringify([t1, t2])}`);
  const { data: brunoC } = await client.from('giocatori').select('nome').eq('id', uidBruno).single();
  assert.equal(brunoC!.nome, 'Bruno C.');
  ok('doppio trigger simultaneo: un ciclo esegue, l\'altro si salta (S11)');

  // ── 10. tombstone di una partita → delete-wins sull'altro device ──
  const now = new Date().toISOString();
  A.setDb({
    ...A.db(),
    leghe: A.db().leghe.map((l) => (l.uid === uidAmici
      ? { ...l, partite: l.partite.map((p) => tombstonaPartita(p, now)) }
      : l)),
  });
  assert.equal((await A.sync()).stato, 'ok');
  assert.equal((await B.sync()).stato, 'ok');
  const partitaB = B.db().leghe.find((l) => l.uid === uidAmici)!.partite[0];
  assert.ok(partitaB.deletedAt, 'la partita cancellata su A deve morire anche su B');
  assert.ok(partitaB.settlements.every((s) => s.deletedAt), 'cascade: anche i debiti figli');
  ok('tombstone: la cancellazione (con cascade sui soldi) si propaga al device B');

  console.log(`\n✅ GATE CHAOS PASSATO — ${passed} check verdi contro Postgres reale.\n`);
}

main().catch((e) => { console.error(`\n❌ GATE CHAOS FALLITO: ${e.message}\n`); process.exit(1); });
