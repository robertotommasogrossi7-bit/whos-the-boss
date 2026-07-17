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

## Registro finding R7.3 (compilato 2026-07-17)

> **Come si è svolto** (variante decisa dall'utente, vedi DECISIONI 2026-07-17): ChatGPT esterno ha
> fatto la **meta-review del dossier** (suggerimenti accolti negli angoli d'attacco); il red team di
> design l'ha fatto un **agente Opus interno con accesso al codice reale** — finding già verificati
> su file:riga, non su descrizioni. Calibrazione vincolante: dati attuali usa-e-getta, niente
> gold-plating, solo difetti strutturali.
> Verdetti: **CONFERMATO** (problema reale del design) · **PREVENTIVO** (requisito per codice futuro)
> · **CONFUTATO** (verificato falso) · **ACCETTATO** (tradeoff documentato).

| ID | Sev | Finding | Verdetto | Fix (recepito nella spec finale, `R7_SCHEMA.md` sez. O) |
|----|-----|---------|----------|--------------------------------------------------------|
| **I-R1** | ALTA | Guardia `imported_at` check-then-set = **race TOCTOU**: due device passano entrambi → dati doppi | **CONFERMATO** (colonna nullable senza vincolo, `r7_core.sql:25`) | Guardia **atomica**: `UPDATE … SET imported_at=now() WHERE id=auth.uid() AND imported_at IS NULL` come PRIMO atto; `IF NOT FOUND → raise 'already_imported'`. Il rollback la annulla (all-or-nothing). |
| **I-R2** | MEDIA | "FK deferite → ordine libero" **falso per la RLS**: `WITH CHECK owns_lega()` gira all'INSERT, non al commit → figli-prima abortisce | **CONFERMATO** (`r6b5_hardening.sql:135-150` + `r7_core.sql:45-50`; RLS non deferibile) | Insert **rigorosamente parent-first** nel corpo RPC. La FK deferita copre solo i riferimenti incrociati. |
| **I-R3** | MEDIA | Stamp post-import indefinito: nessuna `*FromCloudRow` scrive `syncedRev` → o tutto resta "sporco" (ri-push doppio in R7.4) o stamp cieco perde edit concorrenti | **CONFERMATO** (`mapping*.ts`, `merge.ts:21`) | **Contratto R7.3→R7.4** (la cosa più importante emersa): `syncedRev` = revisione spedita, applicato **per-riga** solo alle righe importate; edit nella finestra restano dirty. Da testare come le invarianti. |
| **I-R4** | MEDIA | `already_imported` + "segna importato" **perde i dati del 2° device divergente** | **CONFERMATO** (design) | Su `already_imported` MAI marcare clean dati divergenti: il 2° device resta **dirty** (li unirà R7.4) + avviso una-tantum "account già con dati sul cloud, i tuoi verranno uniti". |
| **I-R5** | MEDIA | Battesimo senza persist **confermato** prima della RPC → dopo un crash gli uid locali divergono dal server → duplicati al primo sync | **CONFERMATO** (design + `uid.ts`) | Ordine ferreo testato: battezza (SOLO se uid manca, idempotente) → `await` persist confermato → RPC. |
| **I-R6** | MEDIA | "Pull di verifica" vaga: una tabella persa in silenzio (es. settlements) passerebbe inosservata | **CONFERMATO** (design) | La RPC **ritorna i conteggi inseriti per tabella**; il client li confronta coi conteggi del payload PRIMA di segnare importato. Qui vive anche il flag anomalie della riconciliazione. |
| **I-R7** | BASSA | Payload non versionato → dati locali vecchi + RPC nuova = mis-parse silenzioso | **CONFERMATO** (design) | `payload.version` (int); la RPC **rifiuta** versioni ignote. |
| **I-R8** | BASSA | `leghe_personale_uniq` o `execute` mancante sulla funzione → abort con errore criptico | **CONFERMATO** (`r7_core.sql:42`, `grants_authenticated.sql`) | Pre-flight strutturale client-side (1 sola personale, uid unici, FK interne complete) + `grant execute on function` esplicito. |

**Confutati/scartati dal revisore stesso** (a questa scala): trigger append-only che bloccherebbero l'import (**CONFUTATO**: è RLS, non trigger, e gli INSERT passano) · collisione uid con Math.random (~72 bit random: trascurabile) · performance RLS su bulk (initplan già ottimizzato, volumi KB-MB) · injection jsonb (basta `jsonb_to_recordset` tipato, niente SQL dinamico).

**Verdetto d'insieme sulle 8 decisioni del dossier**: 5 TIENI (backup non-gate · battesimo con vincolo I-R5 · riconciliazione soft potenziata da I-R6 · storage per-account · test plan ampliato) · 3 CAMBIA (guardia atomica I-R1 + ordine parent-first I-R2 · semantica already_imported I-R4 · stamp definito I-R3).
