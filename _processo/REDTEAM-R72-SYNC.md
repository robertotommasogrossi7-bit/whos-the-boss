# RED TEAM — Layer di sync R7.2 (dossier autocontenuto, 2026-07-11)

> **Come si usa**: copia TUTTO questo file (dal titolo qui sotto in giù) e incollalo in una chat
> **nuova e pulita** di Claude e, separatamente, di ChatGPT. Serve un parere *non contaminato* dal
> nostro contesto. Poi **verifica alla fonte** ogni fatto citato dai revisori prima di agire (anche
> loro sbagliano). I finding tornano qui come tabella `R-Sn` con severità e "dove si risolve".

---

## DOSSIER PER IL REVISORE — inizia a copiare da qui

Sei un ingegnere **senior backend / data** con esperienza di app **local-first** in produzione e di
sistemi di sincronizzazione (CRDT, LWW, Litestream/PowerSync/WatermelonDB/Legend-State, replica
offline). Ti chiedo un red team **cinico e concreto** su un layer di sincronizzazione appena scritto.
Non essere adulatorio: cerca ciò che **rompe in produzione**, non ciò che è carino.

### Cos'è l'app (contesto minimo)
App mobile **React Native (Expo)** per segnare partite di poker e altri giochi di carte tra amici
(cash/torneo, settlement "chi paga chi", classifiche, serate multi-gioco). È **local-first**: lo
store gira sul telefono (Zustand persistito su AsyncStorage) e **funziona offline**. Backend
**Supabase** (Postgres + RLS + Auth email/password). Utenza reale attesa: **piccola** (gruppi di
amici), non milioni. La logica dei soldi è in TypeScript puro, test-first.

### Cosa deve fare R7 (sync)
Sincronizzare **i dati di UN utente sui SUOI device** (multi-device dello stesso account). La
**condivisione tra account diversi** e i ruoli sono una fase successiva (R8). Si sincronizza solo lo
**storico salvato** (partite chiuse, sessioni); lo **stato live** della serata in corso resta locale
fino al realtime (R9).

### Cosa è stato costruito finora
- **R7.1 — schema relazionale** (già applicato su Postgres reale): **13 tabelle normalizzate**.
  Gerarchia: `leghe` → (`giocatori`, `giochi_lega`, `partite_poker`, `serate`, `sessioni_gioco`).
  Poker: `partite_poker` → `partita_poker_giocatori` → `poker_movimenti` (ledger **append-only**) +
  `settlements`. Multigioco: `serate`/`sessioni_gioco` → `partite_gioco` + **4 tabelle-ponte M:N**
  verso `giocatori` (partecipanti/vincitori). RLS **solo-proprietario** (`owner_id = auth.uid()` via
  helper `owns_lega()` SECURITY DEFINER). FK `DEFERRABLE INITIALLY DEFERRED`.
- **R7.2 — layer di sync (funzioni pure TypeScript, `packages/core/src/sync/`)**: mapping
  locale↔cloud per tutte le 13 tabelle (`xToCloudRow`/`xFromCloudRow`), più un `mergeLWW()` generico.
  Testato SOLO con test unitari su funzioni pure (286 test verdi), **mai** contro un Postgres reale.

### Le DECISIONI chiave da attaccare (il "verbale")
1. **Identità cloud = UUIDv7 generato dal CLIENT alla creazione.** L'id intero locale (per-device)
   resta come "handle" ma **non è mai la chiave di sync** (potrebbe ripetersi tra device). La chiave
   di upsert è l'`uid`. Tesi: due device non generano mai lo stesso uid → niente collisione.
2. **Conflitti = Last-Write-Wins PER RIGA** su `updated_at` **server-authoritative** (trigger DB
   `now()`, mai il clock del client). In pull il cloud vince, TRANNE se la riga locale ha un edit non
   ancora confermato dal server (confronto fra due timestamp **dello stesso device**:
   `syncUpdatedAt` locale vs `lastSyncedAt` = ultimo `updated_at` server salvato in locale).
3. **`poker_movimenti` è append-only**: solo INSERT, mai UPDATE/DELETE (annullare = movimento
   inverso). **Il PUSH di questa tabella NON è stato scritto**: le liste locali (ricariche/pagamenti)
   non hanno un id stabile per-elemento, quindi un push corretto richiede un dedup "cosa ho già
   mandato" — dichiarato come lavoro di **orchestrazione (R7.4)**, non di mapping.
4. **Tombstone (`deleted_at`) mai purgati** (soft-delete永久). L'"disattivato" applicativo è distinto
   dal tombstone di sync.
5. **Import ≠ Sync**: l'import iniziale del JSON locale nel cloud (backup-first, transazionale via
   RPC, guardato da `profiles.imported_at`) è una fase separata (R7.3), codice diverso dal delta-sync.
6. **La tabella di traduzione id_locale↔uid NON esiste ancora**: tutti i mapper prendono callback
   `risolviIdNome`/`risolviUid` come dipendenze — l'implementazione reale è R7.4.
7. **Soldi**: `float` sul client con arrotondamento a centesimi (`r100`), colonna `numeric(10,2)` nel
   DB. Nessuna migrazione a interi-centesimi.
8. **Storage locale per-account**: chiave AsyncStorage namespaced per `accountId`, con migrazione
   one-shot dal vecchio blob unico; gestito al boot e al cambio-account.

### Cosa NON è stato fatto (dichiarato)
- Nessun **round-trip reale** app↔Postgres: solo test su funzioni pure. (Scelta di studio: "costruire
  tutto, un test gigante su device alla fine".)
- Nessuna gestione ancora di: rete instabile a metà sync, offline lungo, retry/backoff, ordinamento
  push in dipendenza FK, idempotenza dei retry. (Previsti in R7.4.)

### Le domande a cui voglio risposte spietate
1. **LWW-per-riga** per un'app local-first single-user-multi-device: dove ti rompe concretamente?
   Casi reali (edit offline su due telefoni, riga figlia orfana, cancellazione vs modifica concorrente).
2. Il **buco del push append-only** (`poker_movimenti`): qual è il modo CORRETTO di fare il dedup
   senza id per-elemento? (uid per-movimento generato dal client? hash del contenuto? sequence?)
3. **Ordine di sync e FK deferite**: rischi di stati parziali, deadlock, o righe figlie che arrivano
   prima del padre? La transazione per-lega basta?
4. **"Mai testato contro DB reale finora"**: quanto è grave davvero, e quali classi di bug nasconde
   tipicamente un layer di sync validato solo con unit test puri?
5. **Star schema / analitica**: confermi o smonti che sia FUORI scope ora (store OLTP normalizzato)?
   Se un giorno servono analitiche (andamento giocatore nel tempo, cross-lega), è meglio viste
   materializzate, tabelle aggregate, o un OLAP separato — a QUESTA scala?
6. Cosa si aspetterebbe un senior che **manca del tutto** e che non abbiamo nemmeno nominato?

Rispondi con: **verdetto** (TIENI / CAMBIA / BUTTA su pezzi specifici), poi una **lista di finding**
ordinati per severità (ALTA/MEDIA/BASSA), ognuno con: cosa rompe, scenario concreto, fix consigliato.
Niente allarmismo enterprise: siamo un'app tra amici, non una banca — ma non nascondere i landmine.

## fine — smetti di copiare qui

---

## Registro finding R7.2 (verificati sul codice reale, 2026-07-12)

> Due red team (Claude + ChatGPT, chat pulite) → deduplicati in `S1…S20`. Verdetto:
> **CONFERMATO** = problema reale su codice che ESISTE · **PREVENTIVO** = riguarda il push/sync
> non ancora scritto (requisito, non bug) · **ACCETTATO** = tradeoff noto, si documenta.
> Verificato alla fonte come da metodo (non a memoria). "Dove" = fase riordinata (vedi sotto e `R7_SCHEMA.md`).

| ID | Sev | Finding | Verdetto | Verifica | Dove si risolve |
|----|-----|---------|----------|----------|-----------------|
| **S1** | ALTA | Sync mai provata contro **Postgres reale** (solo test su funzioni pure) | **CONFERMATO** | solo vitest puri, zero integrazione | ✅ **R7.2d-5 FATTO** — gate `scripts/gate-db.mjs` su Supabase locale, 8/8 verdi; ha scovato il bug grant (fix migration #7) |
| **S2** | ALTA | `poker_movimenti` **senza uid stabile** → push non idempotente | **CONFERMATO** | `Ricarica`/`Pagamento*` senza `uid`; push non scritto | ✅ **R7.2d-3** (parte pura fatta): `uid?` sui movimenti + `movimentiToCloudRows`; generazione uid alla creazione → R7.4 |
| **S3** | ALTA | Push **senza CAS** (controllo concorrenza) → "LWW" = "vince chi pusha per ultimo" | **PREVENTIVO** | in `sync/` nessun codice di push (solo pull in `mergeLWW`) | **R7.4** — push CAS via RPC (mini-spec) |
| **S4** | ALTA | Mappa `id_locale↔uid` non esiste, mal classificata "R7.4" | **CONFERMATO** | i mapper prendono callback `risolvi*` = stub | ✅ **R7.2d-4 FATTO** (`sync/idMap.ts`); aggancio ai mapping reali → R7.4 |
| **S5** | ALTA | Dirty-flag confronta **clock client vs clock server** → perdita silenziosa se l'orologio è storto | **CONFERMATO** | `syncUpdatedAt`=`new Date()` client, `lastSyncedAt`=server | **R7.2d-2** — flag/counter locale |
| **S6** | ALTA | **LWW per-riga** → clobber silenzioso di campi diversi editati offline su 2 device | **CONFERMATO (by design)** | `mergeLWW` opera sull'intera riga | **R7.2d-1** — accettato+documentato; merge-per-colonna per campi a rischio |
| **S7** | MEDIA | Nessuna regola esplicita **tombstone-vs-edit** (delete può "resuscitare") | **CONFERMATO** | `merge.ts` ignora `deletedAt` | **R7.2d-1** — regola delete-wins |
| **S8** | MEDIA | `updated_at` = "quando il server ha ricevuto", NON "quando l'utente ha editato" | **CONFERMATO** | semantica del trigger server | **R7.2d-1** — documentare |
| **S9** | MEDIA | FK DEFERRABLE **inutile** se il push non è una singola transazione | **PREVENTIVO** | push non scritto | **R7.4** — push per-lega in 1 transazione |
| **S10** | MEDIA | Retry non idempotenti senza chiave stabile | **PREVENTIVO** (ora anche i movimenti hanno uid, d3 → S2 chiuso lato mapping) | — | **R7.4** — uid riusato, mai rigenerato nel push |
| **S11** | MEDIA | Race tra 2 cicli di sync sullo stesso device (background + timer) | **PREVENTIVO** | — | **R7.4** — mutex "sync in corso? skip" |
| **S12** | MEDIA | Figlio orfano sotto padre tombstonato (creato offline su altro device) | **PREVENTIVO** | — | **R7.4** — flag revisione al pull |
| **S13** | MEDIA | `settlements` (derivati) sincronizzati prima dei `movimenti` sorgente | **PREVENTIVO** | — | **R7.4** — ordine ledger→settlement, o ricalcolo client |
| **S14** | MEDIA | Tombstone **mai purgati** → crescita infinita del pull | **ACCETTATO** (G4) ma serve un piano | decisione G4 esplicita | **R7.2d-1** (piano) + **R8/R10** (GC) |
| **S15** | MEDIA | N lookup per record: manca cache `Map<uid,id>` a inizio sync | **PREVENTIVO** (perf) | — | ✅ mappa pronta (R7.2d-4 `idMap.ts`); uso a inizio sync → R7.4 |
| **S16** | BASSA | Float accumula errore su tante somme | **ACCETTATO** (float+r100) | — | **R8** — rivalutare int-centesimi (B6) |
| **S17** | BASSA | Ordinamento UI su uid con clock storto | **BASSO — già a posto** | ordiniamo per `ordine`/`id`, non per uid | nessuno (tenere la regola) |
| **S18** | BASSA | Compat schema tra versioni app diverse in giro | **PREVENTIVO** | — | **R7.4/H** — test minimo |
| **S19** | BASSA | Zero osservabilità sync lato utente + nessun sync-log per diagnosi | **UX/ops** | — | **H-block** — badge "sync N min fa" + log |
| **S20** | BASSA | Logout durante sync: B non deve vedere cache di A | **PARZ. MITIGATO** | `clearDbLocale`+gate `dbReady`; finestra teorica | **R7.4** — coperto da mutex S11 |

### Deliverable trasversali chiesti da ENTRAMBI i revisori
- **Documento "invarianti di sync" (1 pagina)** — le regole assolute (ogni record ha uid immutabile;
  delete = tombstone; push idempotente; il server non modifica il payload tranne `updated_at`; mai
  UPDATE sul ledger; import una volta sola). → **R7.2d-1**.
- **Property-based test su `mergeLWW`** (idempotenza `merge(a,a)=a`, nessuna perdita di uid). → **R7.2d-2**.
- **Chaos test** (pochi, veri: kill app durante sync · rete giù · retry doppio · 2 device offline ·
  login/logout durante sync · import interrotto). → **R7.3/R7.4**.
- **Sync log** (push/pull/righe/conflitti/retry/durata). → **H-block** (S19).

### Convergenza dei due revisori (le 3 cose che contano)
1. **S1** — provare su DB reale PRIMA di scrivere altro (il #1 assoluto per entrambi).
2. **S2** — uid sui movimenti (fix pulito, chiude anche S10).
3. **S3+S5** — il conflitto vero non è "quale timestamp", è che push e dirty-flag oggi non sono
   sicuri: push senza CAS (S3) + dirty su clock (S5). Sono le due cose che rendono il "LWW dichiarato"
   diverso dal "LWW reale".
Entrambi confermano: **star schema fuori scope** e impianto "sopra la media / pulito".
