# RED TEAM — Import one-shot R7.3 (dossier autocontenuto, 2026-07-14)

> **Come si usa**: copia TUTTO (dal titolo qui sotto fino a "smetti di copiare") e incollalo in una
> chat **nuova e pulita** di Claude e, separatamente, di ChatGPT. Serve un parere *non contaminato*
> dal nostro contesto. Poi **verifica alla fonte** ogni fatto citato dai revisori prima di agire
> (sbagliano anche loro). I finding tornano qui come tabella `I-Rn` con severità e "dove si risolve".
> Nota: qui si attacca una **SPEC** (il codice non è ancora scritto) — è un red team di design.

---

## DOSSIER PER IL REVISORE — inizia a copiare da qui

Sei un ingegnere **senior backend / data** con esperienza di app **local-first** in produzione, di
migrazioni dati critiche e di Postgres/Supabase. Ti chiedo un red team **cinico e concreto** sul
DESIGN (mini-spec approvanda, codice non ancora scritto) dell'operazione più pericolosa del nostro
backend: l'**import one-shot** dei dati locali nel cloud. Non essere adulatorio: cerca ciò che
**perde dati di soldi veri in produzione**, non ciò che è elegante.

### Contesto minimo
App mobile React Native (Expo) **local-first** per segnare partite di poker e giochi di carte tra
amici (soldi veri: buy-in, debiti "chi paga chi"). Store Zustand persistito su AsyncStorage,
funziona offline. Backend Supabase (Postgres + RLS owner-only + Auth email/password). Utenza attesa
piccola (gruppi di amici); volumi dati minuscoli (KB–pochi MB per account). La logica è TypeScript
puro test-first (300+ unit test). Un **layer di sync** (mapping locale↔cloud per 13 tabelle
normalizzate + merge LWW per-riga + dirty-tracking a revision counter) esiste già come funzioni
pure, ed è passato un **gate d'integrazione** contro Supabase locale (Docker): RLS, upsert-by-uid,
`updated_at` server-authoritative verificati. Il **delta-sync agganciato all'app (R7.4) NON esiste
ancora**: arriva dopo l'import.

### Cosa deve fare R7.3 (l'oggetto del red team)
Al primo login di un account, **travasare TUTTO il database locale del telefono nel cloud, una
volta sola**. Import ≠ sync: codice separato, guardia separata (`profiles.imported_at`). Dopo
l'import l'app continua a lavorare in locale; le modifiche successive NON sincronizzano finché non
esiste R7.4 (dichiarato e accettato).

### Il design proposto (le decisioni da attaccare)
1. **Backup-first**: prima di tutto, export del JSON locale completo via Share nativo (l'utente ne
   conserva una copia fuori dall'app). Poi si procede.
2. **"Battesimo" client-side**: i dati storici (pre-refactor) non hanno `uid`; l'import assegna
   UUIDv7 client-generated a ogni entità che ne è priva, movimenti inclusi. Gli uid assegnati si
   **persistono in locale PRIMA di spedire** → un retry rispedisce gli STESSI uid (idempotenza).
3. **Riconciliazione soft**: verifica che i conti tornino (settlement a somma zero per partita,
   buy-in coerenti). Se non tornano (drift float storico): **importa comunque e flagga
   l'anomalia** — mai bloccare, mai correggere silenziosamente.
4. **Una sola RPC transazionale** `import_locale(payload jsonb)`: funzione Postgres chiamata via
   PostgREST (transazione automatica, all-or-nothing). Payload = UN solo JSONB con tutte le 13
   tabelle (volumi piccoli). FK `DEFERRABLE INITIALLY DEFERRED` → l'ordine di insert non conta
   dentro la transazione. La funzione: guardia `imported_at IS NOT NULL → raise 'already_imported'`
   come PRIMO atto; inserimenti; `SET imported_at = now()` come ULTIMO atto. Intenzione:
   **SECURITY INVOKER** così RLS e `auth.uid()` restano attivi dentro la funzione.
5. **Idempotent receiver**: se la rete muore DOPO il commit ma prima della risposta, il client
   ritenta e riceve `already_imported`; NON lo tratta come errore → fa un pull di verifica, se i
   dati ci sono segna "importato" anche in locale e prosegue.
6. **Timbro post-import**: un primo pull standard rilegge le righe dal server e imposta i campi di
   sync locali (`lastSyncedAt`, `syncedRev`) via merge LWW → tutto "pulito" per il futuro delta-sync.
7. **Storage locale per-account** (già esistente): la chiave AsyncStorage è namespaced per account;
   la guardia import è per-account sul server (`profiles.imported_at`).
8. Test previsti: unit sulle funzioni pure (battesimo idempotente, payload builder) + integration
   su Supabase locale via Docker (import→pull→confronto; doppio import respinto) + chaos (kill a
   metà → rollback; retry dopo commit; import interrotto).

### Cosa NON è ancora deciso/scritto (dichiarato)
- Il corpo esatto della RPC (plpgsql, parsing del JSONB per 13 tabelle).
- La UI/UX del flusso (quando proporre l'import, cosa mostrare durante/dopo).
- Gestione dell'account che fa login su un SECONDO device con dati locali DIVERSI quando
  l'import è già stato consumato dal primo device (oggi: la guardia lo respinge e basta).
- Dimensione massima payload / timeout della RPC (assunto irrilevante ai nostri volumi).

### Le domande a cui voglio risposte spietate
1. Dove **perde dati** questo disegno? Scenari concreti, passo-passo (crash, rete, doppio device,
   app chiusa a metà, utente impaziente che riprova).
2. La semantica **"un import per account, per sempre"**: quali casi reali rompe? (secondo telefono
   con dati locali diversi; reinstallazione dell'app; utente che fa logout/login). Qual è la
   semantica GIUSTA per un'app così?
3. Il **battesimo persist-before-push**: buchi? (crash tra battesimo e backup, tra persist e
   chiamata RPC; doppio battesimo).
4. La **RPC**: SECURITY INVOKER con RLS attiva è la scelta giusta o ci sono trappole (performance
   della RLS su insert bulk, `auth.uid()` dentro la funzione, injection via jsonb)? Meglio
   VOLATILE/STABLE, batching, `jsonb_populate_recordset` o insert espliciti?
5. Il **timbro post-import via pull**: race condition se l'utente edita localmente DURANTE
   l'import/pull? Il merge LWW per-riga (locale sporco vince) basta?
6. La **riconciliazione soft** (importa e flagga): giusto o rischioso per dati di soldi? Dove
   metteresti la linea "blocca invece di flaggare"?
7. Cosa manca **del tutto** che un senior si aspetterebbe in un import così?

Rispondi con: **verdetto** (TIENI / CAMBIA / BUTTA su pezzi specifici), poi una **lista di finding**
per severità (ALTA/MEDIA/BASSA), ognuno con: cosa rompe, scenario concreto, fix consigliato.
Niente allarmismo enterprise: app tra amici, non una banca — ma sui soldi non nascondere landmine.

## fine — smetti di copiare qui

---

## Registro finding R7.3 (da compilare al ritorno dei red team)

> Verdetti: **CONFERMATO** (problema reale del design) · **PREVENTIVO** (riguarda codice futuro,
> diventa requisito) · **CONFUTATO** (verificato falso) · **ACCETTATO** (tradeoff, si documenta).

| ID | Sev | Finding | Verdetto | Verifica | Dove si risolve |
|----|-----|---------|----------|----------|-----------------|
| — | — | *(in attesa dei red team)* | — | — | — |
