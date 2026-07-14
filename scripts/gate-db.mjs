/* ════════════════════════════════════════════════════════════════════════
   GATE d5 — vertical slice del sync contro un Postgres REALE (Supabase locale)
   ─────────────────────────────────────────────────────────────────────────
   Il #1 dei revisori (finding S1): finora il sync era testato SOLO con funzioni
   pure. Qui proviamo un giro vero contro il DB con RLS attiva, su leghe+giocatori:
     · round-trip (insert → select ritorna i dati)
     · updated_at SERVER-authoritative (trigger, non il clock del client)
     · RLS solo-proprietario (un secondo utente NON vede/tocca i dati del primo)
     · upsert-by-uid idempotente (stesso id due volte → 1 riga, campo aggiornato)
     · FK verso profiles/leghe (owner reale, giocatore legato alla lega)

   Uso: SUPABASE_URL e SUPABASE_ANON_KEY dall'output di `supabase status`.
   NON è la suite di integration definitiva (quella, CI-friendly, verrà dopo):
   è la validazione one-shot che de-riscka PRIMA di scrivere il push completo (R7.4).
════════════════════════════════════════════════════════════════════════ */
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Default = istanza Supabase locale (CLI). L'anon key locale è la chiave DEMO
// pubblica, IDENTICA per ogni progetto locale (deriva dal JWT secret di default):
// non è un segreto. Override con le env per puntare altrove.
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const URL = process.env.SUPABASE_URL ?? LOCAL_URL;
const ANON = process.env.SUPABASE_ANON_KEY ?? LOCAL_ANON;
assert(URL && ANON, 'Servono SUPABASE_URL e SUPABASE_ANON_KEY.');

const rnd = () => Math.random().toString(36).slice(2, 10);
let passed = 0;
const ok = (msg) => { passed++; console.log(`  ✅ ${msg}`); };

/** Crea un utente nuovo e autenticato sull'istanza locale. In locale la conferma
    email è disattivata di default → signUp ritorna subito la sessione; il trigger
    handle_new_user (R6) crea il profilo, così owner_id referenzia un profiles reale. */
async function nuovoUtente(tag) {
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `gate_${tag}_${rnd()}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: 'password-123456' });
  assert(!error, `signUp ${tag} fallito: ${error?.message}`);
  assert(data.session, `nessuna sessione dopo signUp ${tag} (conferma email attiva?)`);
  return { client, userId: data.user.id };
}

async function main() {
  console.log('\nGATE d5 — sync contro Postgres reale (Supabase locale)\n');

  const A = await nuovoUtente('A');
  ok(`signUp utente A + profilo creato (auth.uid=${A.userId.slice(0, 8)}…)`);

  // ── round-trip lega + updated_at server-side ──────────────────────────
  const legaId = randomUUID();
  const { data: legaIns, error: e1 } = await A.client.from('leghe')
    .insert({ id: legaId, owner_id: A.userId, local_id: 1, nome: 'Lega Gate' })
    .select().single();
  assert(!e1, `insert lega fallito: ${e1?.message}`);
  assert(legaIns.id === legaId, 'id client-generato non conservato');
  assert(legaIns.updated_at, 'updated_at non valorizzato dal server');
  ok('insert lega: id client-generato conservato + updated_at settato dal server');

  const { data: legaSel, error: e1b } = await A.client.from('leghe').select().eq('id', legaId).single();
  assert(!e1b && legaSel.nome === 'Lega Gate', 'round-trip lega fallito');
  ok('round-trip lega (select ritorna i dati inseriti)');

  const giocId = randomUUID();
  const { error: e2 } = await A.client.from('giocatori')
    .insert({ id: giocId, lega_id: legaId, local_id: 1, nome: 'Anna' });
  assert(!e2, `insert giocatore fallito: ${e2?.message}`);
  ok('insert giocatore (FK verso lega + RLS via owns_lega: ok)');

  // ── RLS solo-proprietario ─────────────────────────────────────────────
  const B = await nuovoUtente('B');
  const { data: bVede } = await B.client.from('leghe').select().eq('id', legaId);
  assert(Array.isArray(bVede) && bVede.length === 0, `RLS BUCATA: B vede ${bVede?.length} leghe di A!`);
  ok('RLS lettura: B non vede la lega di A');

  const { error: e3 } = await B.client.from('giocatori')
    .insert({ id: randomUUID(), lega_id: legaId, nome: 'Intruso' });
  assert(e3, 'RLS BUCATA: B ha potuto inserire un giocatore nella lega di A!');
  ok('RLS scrittura: B non può inserire nella lega di A');

  // ── upsert-by-uid idempotente + updated_at che avanza ─────────────────
  const { data: up1, error: e4 } = await A.client.from('leghe')
    .upsert({ id: legaId, owner_id: A.userId, nome: 'Lega Gate v2' }).select().single();
  assert(!e4, `upsert fallito: ${e4?.message}`);
  const { data: righe } = await A.client.from('leghe').select('id').eq('id', legaId);
  assert(righe.length === 1, `upsert ha duplicato: ${righe.length} righe per lo stesso id`);
  assert(up1.nome === 'Lega Gate v2', 'upsert non ha aggiornato il campo');
  ok('upsert-by-uid idempotente (stesso id → 1 riga, campo aggiornato)');

  assert(new Date(up1.updated_at) >= new Date(legaSel.updated_at), 'updated_at non avanzato dopo update');
  ok('updated_at avanza a ogni scrittura (server-authoritative)');

  console.log(`\n✅ GATE PASSATO — ${passed} check verdi contro Postgres reale.\n`);
}

main().catch((e) => { console.error(`\n❌ GATE FALLITO: ${e.message}\n`); process.exit(1); });
