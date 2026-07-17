# R7 — MODELLO DATI ↔ SCHEMA RELAZIONALE (mappa viva)

> **A cosa serve**: è la mappa COMPLETA tra il modello locale (TypeScript, in `packages/core/src/types`)
> e lo schema **relazionale** su Supabase per il **sync cross-device**. Obiettivo dichiarato: *non
> perdere niente* e restare **chiaro** (così se ne può parlare). Documento **VIVO**: si aggiorna a ogni
> passo di R7. Nessun codice parte finché questa mappa non è completa e condivisa.
>
> Deciso (2026-07-01): **relazionale normalizzato** (non JSONB-per-lega). Vedi `DECISIONI.md`.

## 1. Principi & confini di R7
- **Scope**: sincronizzare **i TUOI dati** (le tue leghe) sul **TUO account**, **multi-device**.
  La **condivisione tra account** + ruoli = **R8** (lì servono `lega_membri` e RLS per-membro).
- **Local-first PRESERVATO**: lo store locale (AsyncStorage) resta la sorgente di lavoro; un **layer di
  sync** fa push/pull. NON online-required (non riscriviamo le ~50 azioni; l'offline resta). *(Correzione
  di `BACKEND_SPEC` che diceva online-required "perché è una demo": non lo è più.)*
- **Conflitti** = **Last-Write-Wins per riga** su `updated_at` (dati di un solo utente → LWW basta).
- **NON si sincronizza in R7** (resta locale, arriva con **R9 realtime**): lo **stato LIVE** della
  sessione in corso (`Lega.sessioneAttiva`, `Lega.serate_bg`) — timer, seat, livelli. Si sincronizza
  solo ciò che è **salvato/storico** (le `Partita` chiuse, le `SessioneGioco`). Enorme riduzione di
  rischio: lo stato live ad alta frequenza è il pezzo difficile e per il multi-device serve il realtime.
- **Soldi**: colonne **`numeric(10,2)`** in Postgres (il client resta float+`r100`; la colonna è corretta).
- **ID**: ogni riga cloud ha un **`uuid`** + conserva il **`local_id`** (l'intero per-lega originale) →
  mapping locale↔cloud pulito e reversibile (le referenze `id_nome` si risolvono via `(lega, local_id)`).
- **Soft-delete**: ogni tabella ha `deleted_at` (tombstone) → le cancellazioni si propagano nel sync.

## 2. Panoramica in linguaggio semplice (la "storia")
Un **account** (`profiles`, già fatto in R6) possiede delle **leghe**. La lega "Personale" è una lega
come le altre (flag `personale`). Dentro una lega ci sono i **giocatori** (i membri reali hanno un
`account_id`, gli ospiti no) e i **giochi** configurati. Una lega registra due tipi di storico:
1. **Poker** → **partite** (`partite_poker`); ogni partita ha i suoi **giocatori** (con i numeri: entrate,
   fiche, netto…) e i suoi **debiti** ("chi paga chi", con flag pagato);
2. **Altri giochi** → **serate** che raggruppano **sessioni** (una per gioco), e ogni sessione ha le sue
   **partite** con i **vincitori**.
Le **statistiche/classifiche restano calcolate sul client** (funzioni pure già testate): il DB conserva
i dati, non li ricalcola.

## 3. Le tabelle (schema proposto)

### 3.1 Core — ✅ **APPLICATO** (R7.1a, `20260701150000_r7_core.sql`)
**`profiles`** *(già esiste, R6)* — 1:1 con `auth.users`. `id uuid PK`, `username`, `display_name`, `created_at`.

**`leghe`**
| colonna | tipo | note |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid → profiles(id) | il proprietario (R7). Membership/ruoli = R8 |
| local_id | int | `Lega.id` originale (mapping per-device) |
| nome | text | |
| foto | text | oggi dataURL base64 → **⚠️ grande**: migrare a Supabase Storage in R10 |
| personale | bool | true solo per la lega Personale |
| mono_gioco_id | text null | `Lega.monoGiocoId` |
| created_at / updated_at | timestamptz | |
| deleted_at | timestamptz null | tombstone |

**`giocatori`** *(← `Lega.nomi: NomeGiocatore[]`)* — la tabella-chiave per il remapping delle referenze.
| colonna | tipo | note |
|---|---|---|
| id | uuid PK | |
| lega_id | uuid → leghe(id) | |
| local_id | int | `NomeGiocatore.id` (l'`id_nome` usato ovunque come referenza) |
| nome | text | |
| account_id | uuid → profiles(id) null | **null = ospite**; valorizzato = membro reale ("sei tu" se == tuo account) |
| created_at / updated_at / deleted_at | timestamptz | |
| | | UNIQUE(lega_id, local_id) |

**`giochi_lega`** *(← `Lega.giochi: GiocoLega[]`)*
| colonna | tipo | note |
|---|---|---|
| id | uuid PK | |
| lega_id | uuid → leghe | |
| gioco_key | text | `GiocoLega.id` ('magic', 'custom-<ts>') — referenziato da sessioni_gioco |
| nome | text | |
| preimpostato | bool | |
| foto | text null | dataURL → Storage in R10 |
| accent | text null | |
| attivo | bool | |
| pareggio_come_vittoria | bool | |
| created_at / updated_at / deleted_at | | UNIQUE(lega_id, gioco_key) |

### 3.2 Poker (storico salvato) — ✅ **APPLICATO** (R7.1b, `20260701150100_r7_poker.sql`)
> Sezione riscritta il 2026-07-03 (R6-B4/M15) per rispecchiare l'SQL **davvero applicato** — la v1 sotto
> aveva ancora `ricariche`/`pagamenti_*` come JSONB su `partita_poker_giocatori`: quella colonna **non
> esiste**, i movimenti vivono nella tabella a parte `poker_movimenti` (decisione B1 della v2, sotto).

**`partite_poker`** *(← `Lega.partite: Partita[]`)*
| id uuid PK · lega_id → leghe · local_id int (`Partita.id`) · buy_in numeric(10,2) euro · data date · ora_inizio text · ora_fine text · modalita text ('cash'|'torneo') · created_at/updated_at/deleted_at |

**`partita_poker_giocatori`** *(← `Partita.giocatori: GiocatorePartita[]`)* — **niente colonne jsonb**:
| colonna | tipo | note |
|---|---|---|
| id | uuid PK | |
| partita_id | uuid → partite_poker | |
| giocatore_id | uuid → giocatori | (risolve `id_nome`) |
| entrate, ricarica_fatta, extra, soldi_ricevuti, netto_finale, premio | numeric(10,2) | euro |
| fiches_finali | numeric(10,2) | **dual-unit**: euro (cash) o chip (torneo) secondo `modalita` — non colonne separate (vedi B2 aggiornato) |
| vincitore, buy_in_pagato, extra_pagato, add_on_fatto, add_on_pagato | bool | |
| posizione_finale | int null | |

**`poker_movimenti`** *(← `Ricarica[]`/`pagamenti_effettuati`/`pagamenti_ricevuti` — ora APPEND-ONLY, non jsonb)*
| colonna | tipo | note |
|---|---|---|
| id | uuid PK | |
| partita_giocatore_id | uuid → partita_poker_giocatori | |
| tipo | text check | **`'ricarica' \| 'pagamento_effettuato' \| 'pagamento_ricevuto'`** (3 valori reali — non l'enum `{buyin,rebuy,addon,cashout}` ipotizzato in v2/B1) |
| importo | numeric(10,2) not null, check ≥0 | sempre euro (niente colonna `unita`: il chip vive solo in `fiches_finali`, non nei movimenti) |
| pagata | bool null | per `ricarica`/`pagamento_effettuato`: pagato? (null se n/a) |
| contro_giocatore_id | uuid → giocatori null | per `pagamento_*`: la controparte (il "to"/"from") |
| ordine | int null | ordine originale nell'array locale |
| created_at/updated_at | timestamptz | **niente `deleted_at`**: append-only vero, un annullo è un movimento inverso, non un delete |

**`settlements`** *(← `Partita.settlements: Settlement[]` = i DEBITI "chi paga chi")*
| id uuid PK · partita_id → partite_poker · from_giocatore_id → giocatori · to_giocatore_id → giocatori · amount numeric(10,2) euro · pagato bool · ordine int null |

### 3.3 Multigioco (storico salvato) — ✅ **APPLICATO** (R7.1c, `20260701150200_r7_multigioco.sql`)
**`serate`** *(← `Lega.serate: SerataMulti[]`)*
| id uuid PK · lega_id → leghe · local_id int · data date · created_at/updated_at/deleted_at |
| partecipanti → tabella-ponte `serata_partecipanti(serata_id, giocatore_id)` (vedi D3) |

**`sessioni_gioco`** *(← `Lega.sessioniGioco: SessioneGioco[]`)*
| id uuid PK · lega_id → leghe · local_id int · gioco_lega_id → giochi_lega · data date · stato text ('pre'|'attiva'|'chiusa') · ora_inizio · ora_fine · esito_pareggio bool · serata_id → serate null · created/updated/deleted_at |
| partecipanti → ponte `sessione_gioco_partecipanti(sessione_gioco_id, giocatore_id)` (D3) |

**`partite_gioco`** *(← `SessioneGioco.partite: PartitaGioco[]`)*
| id uuid PK · sessione_gioco_id → sessioni_gioco · local_id int · ora_inizio · ora_fine · pareggio bool · nome_libero text null |
| vincitori → ponte `partita_gioco_vincitori(partita_gioco_id, giocatore_id)` (D3) |
| partecipanti (override) → ponte `partita_gioco_partecipanti(...)` null (D3) |

### 3.4 Preferenze per-device (opzionale)
`giocoFiltro`, `gameBarVisible`, `gameBarPinned` sono **preferenze UI per-dispositivo**. Opzione:
tabella **`user_settings`** (account_id PK, jsonb) — oppure restano **solo locali**. → Decisione D5.

### 3.5 NON sincronizzato in R7 (elenco esplicito, per "non perdere niente")
- **Stato LIVE**: `Lega.sessioneAttiva` (`Sessione`) + `Lega.serate_bg` (`Sessione[]`) e tutto il loro
  contenuto (`GiocatoreSessione`, `Livello`, `Premio`, `AddOn`, `LateReg`, `Seat`, timer/seat/livelli).
  → **R9 realtime**. In R7 restano **solo locali**; quando una sessione si **chiude** diventa una
  `Partita` che **si sincronizza**. *(Da confermare in R7.1: ruolo esatto di `serate_bg`.)*
- **Derivati/UI non persistiti**: `SettlementState`, `CashSettlementResult`, `GiocatoreCalcolato`,
  `Trasferimento` — calcolati a runtime, mai salvati → non vanno in DB.
- **Contatori locali** `_nid/_pid/_sgid/_serataId/_lid`: servono al client; in cloud l'identità è l'`uuid`.
  Restano locali (il mapping usa `local_id`).
- **`Lega.adminIds`** (marcatore creatore=admin, R6): assorbito da `owner_id` ora; diventa `lega_membri` in R8.

## 4. Decisioni trasversali (❓ = serve il tuo parere)
- **D1 — Live non sincronizzato in R7** (recommend ✅). Confermi che va bene tenere lo stato live locale
  fino a chiusura (multi-device live = R9)?
- **D2 — Array-foglia (`ricariche`, `pagamenti_*`) = JSONB** invece di sotto-tabelle (recommend ✅):
  sono liste piccole, ordinate, senza referenze a giocatori → JSONB è pragmatico e non perde nulla.
  *(I `partecipanti`/`vincitori` invece SÌ tabelle-ponte, perché referenziano `giocatori` — integrità FK.)*
- **D3 — Partecipanti/vincitori = tabelle-ponte** (many-to-many verso `giocatori`) (recommend ✅).
- **D4 — Soldi = `numeric(10,2)`** in DB (recommend ✅).
- **D5 — Preferenze GameBar**: `user_settings` in cloud **oppure** solo-locali? (recommend: **solo-locali** ora.)
- **D6 — `foto` dataURL**: restano `text` per R7, migrazione a **Supabase Storage** in R10 (recommend ✅).
- **D7 — RLS R7 = solo-proprietario**: `leghe.owner_id = auth.uid()`; i figli ereditano via `lega_id`.
  Condivisione/ruoli = R8. (recommend ✅)
- **D8 — Import one-shot al primo login**: se il cloud è vuoto per l'account → **backup del JSON locale**,
  poi push di tutte le leghe, marcatore "importato" (idempotente, reversibile). (recommend ✅)

## 5. Sotto-fasi previste (dopo l'OK su questa mappa)
- **R7.1** — schema SQL (migration) + RLS solo-proprietario + questa mappa finalizzata + diagramma ER.
- **R7.2** — layer di sync (push/pull, LWW su `updated_at`, tombstone) — **test-first** sulle funzioni pure di mapping.
- **R7.3** — import one-shot dal locale (backup-first, idempotente).
- **R7.4** — aggancio allo store (sync su foreground/background + pull-to-refresh), senza toccare le azioni.
- **R7.V** — verifica (nel "grande test" finale): due device, stesso account, offline→online, cancellazioni.

## 6. Domande aperte per te
1. OK su **D1** (live locale in R7, realtime in R9)? È la scelta che riduce di più il rischio.
2. OK sul mix **D2/D3** (JSONB per gli array-foglia, tabelle-ponte per le referenze a giocatori)?
3. Le **preferenze GameBar** (D5): le vuoi cross-device o le lasciamo locali?

---

# v2 — Revisione post RED TEAM esterno + modello ospiti + fallback (2026-07-01)

> Red team esterno (data-engineer) su schema vs app: verdetto **CAMBIA** (scheletro sano, giunti
> portanti da rifare). Verificato sul codice: **leghe non cancellabili**, **partita salvata
> immutabile**, `eliminaGiocatore` blocca con storico poker (non multigioco). Sotto: cosa **adotto**,
> le decisioni sul **modello ospiti** (scelta utente) e i **fallback** difensivi richiesti.

## A. Identità & ID (i giunti portanti)
- **A1 — UUID come identità cloud, generato dal client alla creazione.** Ogni entità sincronizzata
  porta un **`uid` (uuid v4)** creato al momento della creazione su QUALSIASI device → due device non
  generano mai lo stesso uid ⇒ **la collisione multi-device del red team NON può avvenire**. Gli **id
  interi locali restano** (niente refactor delle 185 funzioni pure testate: lavorano sul modello int):
  fanno da **handle locale**; la traduzione **int↔uid** avviene SOLO al **confine di sync**. `local_id`
  = ponte d'import + alias locale, **mai chiave di upsert/sync** (la chiave è `uid`).
- **A2 — "sei tu" DERIVATO per-viewer, mai salvato.** Già così da R6.5: `èSeiTuRecord(rec, viewerAccountId)`
  = `account_id == auth.uid()`. In lega condivisa (R8) ci sono N "tu", uno per viewer → il flag stored
  sarebbe un dead-end; noi non lo salviamo. ✅ già a posto.
- **A3 — Modello OSPITI (decisione utente).** Ogni ospite (`giocatori.account_id = NULL`) ha un
  **`created_by_account_id`** = l'account **gestore** che l'ha creato ("vive nel profilo di chi lo crea").
  - Si può **creare un ospite anche in sessione in corso**; resta di proprietà del gestore.
  - Chi ha il potere di aggiungere persone in una lega può **aggiungere l'ospite alla lega** → la riga
    `giocatori` è nella lega **e** ha `created_by_account_id` del gestore (l'account gestore è la "base").
  - **Claim**: un account può **richiedere tutte le partite di un ospite** → col **consenso del gestore**
    (`created_by`) si valorizza `giocatori.account_id` sull'account richiedente. Flusso completo = **R8**.
  - **Cross-lega ospiti**: NON auto-collegati in R7 (restano righe per-lega). Il collegamento
    "stesso umano" arriva col **claim (R8)**. Le TUE stat cross-lega funzionano già (join su `account_id`).
    *(Consapevole: niente classifica cross-lega per gli ospiti finché non sono reclamati — accettato.)*
  - Gli hook (`created_by_account_id` + `account_id` nullable) rendono il person-layer/`lega_membri` di
    R8 **additivo, senza migrazione distruttiva** (come consiglia il red team per `lega_membri`).

## B. Soldi (il percorso più sensibile)
- **B1 — Movimenti = tabella append-only immutabile.** ✅ **APPLICATA** come `poker_movimenti` (R7.1b) —
  schema **reale** (diverso dalla bozza iniziale qui sotto, allineato in R6-B4/M15): `tipo` è
  `'ricarica'|'pagamento_effettuato'|'pagamento_ricevuto'` (3 valori, non l'enum a 5 ipotizzato), niente
  colonna `unita` (`importo` è sempre euro), presente `contro_giocatore_id` (controparte pagamento) e
  `ordine`. Al posto del JSONB `ricariche`/`pagamenti`. Motivi: constraint per-elemento (`importo≥0`),
  audit, riconciliazione, **zero conflitti** (eventi immutabili, mai mutati, niente `deleted_at`: un
  annullo è un movimento inverso). *(In R7 il rischio-concorrenza è comunque basso — partite salvate
  immutabili — ma i movimenti-riga sono giusti e pronti per R9.)* Dettaglio colonne: §3.2.
- **B2 — Unità DICHIARATE per colonna.** Soldi = `numeric(10,2)` **euro** (buy_in, versato, netto,
  premio, settlement.amount, movimenti). **Chip** (torneo): ⚠️ **deciso diversamente dalla bozza** — non
  colonne separate intere, ma **dual-unit** su `fiches_finali` (euro nel cash, chip nel torneo, secondo
  `modalita`), come già era nel modello locale (`GiocatorePartita.fiches_finali`). Pragmatico: lo schema
  persiste 1:1 il modello esistente invece di introdurre una colonna in più usata solo a metà. Ogni
  colonna numerica ha l'unità nel commento SQL.
- **B3 — Riconciliazione all'import (non copia cieca).** Verifica che i `settlements` di una partita
  **sommino a zero** e i buy-in tornino; se non torna (drift float del locale) → **importa comunque ma
  FLAGGA** l'anomalia (vedi Fallback F2), non bloccare né corrompere.
- **B4 — `settlements(from,to,amount,pagato)`** resta tabella (giusto). `pagato` mutabile sotto LWW è
  tollerabile (toggle booleano; conflitto solo se uno rimette `false`, raro).

## C. Sync & tempo (LWW sicuro)
- **C1 — `updated_at` SERVER-authoritative.** Trigger DB `BEFORE INSERT/UPDATE SET updated_at = now()`.
  **Mai** il wall-clock del device (clock skew = perdita silenziosa). Kill del landmine LWW.
- **C2 — Import e Sync = due percorsi separati.** Import = **one-shot**, guardato da
  `profiles.imported_at`, **transazionale lato server (RPC)** all-or-nothing, poi **disabilitato**. Sync
  incrementale = codice diverso. Non confonderli (un re-import cancellerebbe le edit server).
- **C3 — Ordine FK.** Vincoli **`DEFERRABLE INITIALLY DEFERRED`** + sync in **dependency-order**
  (giocatori → partite → figli). Import per-lega in **una transazione**.
- **C4 — Soft-delete & tombstone.** `deleted_at` = "disattivato". Regole: **cascade dei tombstone
  application-side nella stessa transazione** (una `serata` tombstonata tombstona figli); le **funzioni
  classifica/storico contano lo storico anche dei disattivati** (rank per partecipazione, non per lista
  attiva) e sono **ancestor-aware** (una `partita_gioco` con antenato tombstonato NON rientra).
  Precedenza **delete-wins** (tombstone vince sulla rename); rischio minimo perché il locale non
  cancella giocatori con storico poker.

## D. Fallback difensivi (richiesta utente: "non far rompere tutto al primo errore")
- **F1 — Referenza orfana** (uid/id_nome → giocatore mancante/disattivato): rendi **"Sconosciuto"**, mai
  crash. Le funzioni pure di lookup tollerano il null (già `?? '?'` in `getNome`): estenderlo ovunque.
- **F2 — Import che non riconcilia** (B3): importa + registra un **`sync_anomalies`** (o flag) + avviso
  soft; **non** bloccare, **non** droppare. Metti in **quarantena** l'irrisolvibile, non lo perdi.
- **F3 — Violazione FK in sync** (figlio prima del padre): **coda pending** + retry in dependency-order;
  l'item non si perde. (Con C3 è raro.)
- **F4 — Campi null/mancanti**: default sensati (soldi `0`, array `[]`, nome "Sconosciuto", enum ignoto → default sicuro, mai crash).
- **F5 — Import parziale**: transazionale (C2) → niente stato a metà.
- **F6 — Idempotenza**: upsert per `uid`; un doppio pull non duplica.

## E. Rischi che restano (dichiarati, non risolti in R7)
- Stato **live** senza backup cloud (device perso = sessione in corso persa) — R9.
- **Cross-lega ospiti** non collegato finché non c'è claim (R8).
- **Catalogo giochi globale** (es. "miglior giocatore di Briscola in assoluto"): `giochi_lega` è per-lega
  → per i **preset** salviamo solo `gioco_key`+`attivo` e deriviamo il resto dal catalogo (`giochi.ts`),
  riga piena solo per i **custom**; il catalogo globale cross-lega è un'evoluzione futura.

## F. Domande aperte v2 (poche, il resto l'ho deciso io come chiesto)
1. **Movimenti-riga (B1)** al posto del JSONB: è più lavoro ma è il "proper" e pronto per R9. **OK?**
   *(In R7 anche il JSONB sarebbe sicuro, viste le partite immutabili — ma non lo consiglio.)*
2. **Storico poker**: la card ri-espande i **singoli movimenti** (buy-in/rebuy/cash-out) o mostra solo
   **netto + settlement**? *(Da questo dipende quanto dettaglio DEVE sopravvivere; verifico io nel codice
   se preferisci, ma se lo sai a memoria fai prima.)*
3. Confermi il **modello ospiti** (A3) e la scelta di **UUID additivo** (A1, niente refactor del core)?

---

# R7.2 — layer di sync: verbale + mini-spec (2026-07-11)

> Kickoff della fase (audit `AUDIT_R6_R7.md`, sez. "Ricerca online" → 4 punti "da mettere a
> verbale a R7.2"). Decisioni confermate dall'utente 2026-07-11. **Nessun codice prima dell'OK
> su questa mini-spec** (dati persistiti = non banale, regola del metodo).

## G. Verbale delle 4 decisioni

- **G1 — Storage per-account, non per-device (M12).** Oggi AsyncStorage è un blob unico globale:
  due login sullo stesso device mescolerebbero i dati. **Deciso: namespace della chiave per
  `profiles.id`** (`whostheboss:<accountId>:db` invece della chiave singola attuale). Migrazione
  one-shot al primo login post-upgrade: se esiste il vecchio blob globale, si copia nella chiave
  namespaced del primo account che fa login (best-effort, dispositivo singolo-utente); altrimenti
  si parte vuoti e si popola dal pull cloud (R7.3 import).
- **G2 — LWW per-riga** (non per-campo come PowerSync). Confermato: coerente con R7_SCHEMA §C1
  (già deciso), un solo utente possiede i suoi dati → rischio di conflitto reale basso, non serve
  la granularità per-campo di un editor collaborativo.
- **G3 — UUIDv7** invece di v4 per gli `uid` client-side (A1). Ordinabile per tempo di creazione →
  indici B-tree Postgres compatti. Nessun altro impatto (libreria lato client, es. `uuidv7` o
  polyfill minimale — da scegliere in G-impl, nessuna dipendenza pesante).
- **G4 — Retention tombstone: mai purgare** (esplicito, non solo "di fatto"). Il "disattivato"
  applicativo (es. `eliminaGiocatore` quando c'è storico) resta un flag/stato di dominio, **distinto**
  dal tombstone di sync (`deleted_at` lato server) anche se nel client possono coincidere per ora.

## H. Scope di R7.2 (cosa fa, cosa NON fa)

Per `R7_SCHEMA.md` §5: R7.2 = **layer di sync come funzioni pure testabili** (push/pull, mapping,
merge LWW, tombstone). **NON** include: l'import one-shot iniziale (R7.3), l'aggancio allo store /
trigger foreground-background/pull-to-refresh (R7.4), la UI di stato sync. R7.2 si testa con stati
locali/cloud **fixture**, non serve un account reale né la UI.

## I. Design proposto

1. **Campo `uid` (UUIDv7) sulle entità sincronizzate** — `Lega`, `NomeGiocatore`, `GiocoLega`,
   `Partita`, `GiocatorePartita` (via id composito lega+partita+id_nome, non ha `id` proprio oggi →
   valutare se serve un `uid` anche lì o se basta risolvere tramite gli `uid` dei genitori),
   `Settlement`, `SerataMulti`, `SessioneGioco`, `PartitaGioco`. Campo **opzionale** (`uid?: string`)
   per restare compatibile col codice esistente; **generato alla CREAZIONE** (non retrofittato al
   sync), su qualsiasi device, così due device non generano mai lo stesso uid (A1, già deciso).
   Tocca i punti di creazione nello store (`nuova-lega`, `aggiungiGiocatore`, chiusura
   partita/sessione, ecc.) — cambio meccanico ma esteso, da fare con un helper unico `generaUid()`.
2. **Cursore locale di "sporco"** — ogni entità sincronizzata riceve anche `syncUpdatedAt?: string`
   (timestamp client, bump a ogni mutazione locale). **Usato SOLO per decidere cosa pushare**, MAI
   per il conflict-resolution (che resta server-authoritative, C1 già deciso) — per evitare
   l'ambiguità che l'audit aveva segnalato come rischio LWW.
3. **Modulo nuovo, puro**: `packages/core/src/sync/` — funzioni di **mapping** locale↔cloud per
   tabella (una per `giocatori`/`leghe`/`partite_poker`/…), una funzione di **merge LWW** (cloud
   row + local row + `lastPulledAt` → riga risultante + "chi vince"), gestione **tombstone** (riga
   cloud con `deleted_at` → applica tombstone locale, mai la cancella fisicamente). Zero dipendenze
   da Supabase client qui: input/output sono solo dati, così restano test-first come tutto il core.
4. **Storage per-account**: modifica in `packages/state` (dove oggi la chiave AsyncStorage/
   localStorage è fissa) — funzione pura per costruire la chiave da `accountId`, più la migrazione
   one-shot di G1 (anch'essa testabile in isolamento).

## L. Sotto-fasi proposte (micro-commit, test-first, come R6-B)

- **R7.2a** ✅ **FATTO** — `generaUid()` (UUIDv7, test-first) + campo `uid?`/`syncUpdatedAt?` su
  Lega/NomeGiocatore/GiocoLega/Partita/GiocatorePartita/Settlement/SerataMulti/SessioneGioco/
  PartitaGioco + agganciato a TUTTI i punti di creazione reali (non solo i costruttori puri core:
  `creaLegaPersonale`/`assicuraGiocatorePersonale`/`nuovoGiocoCustom`/`nuovaSessioneGioco`/
  `nuovaPartitaGioco` in core; `aggiungiGiocatore`/`addGiocatoreSessione`/`confermaChiusura`
  (cash+torneo)/`creaSerata` in `packages/state/src/store.ts`; creazione Lega+creatore in
  `apps/mobile/src/app/nuova-lega.tsx`). 234 test core (+3), state/mobile tsc + expo export verdi.
- **R7.2b** ✅ **FATTO** — storage per-account: chiave namespaced + migrazione one-shot
  (`accountStorage.ts`) + aggancio al boot (sez. M): `authUser`/`dbReady`/`clearDbLocale` nello
  store, `skipHydration`+`persist.setOptions({name})`+`persist.rehydrate()` (nativi zustand, niente
  wrapper custom), `authSlice.initAuth` notifica `setAuthUser` invece di applicare subito,
  orchestratore in `_layout.tsx` che copre boot E cambio-account a caldo. Verificato: 234 test core
  + 7 state, state/mobile tsc + expo export android verdi. **Limite**: il controllo visivo in Expo
  Go/browser NON è stato possibile in questo ambiente (il preview web di Expo si riavviava in loop
  senza mai completare il bundle, probabile incompatibilità nativa con `react-native-web`) — la
  prova dal vivo (login reale, dati ancora presenti) resta da fare su device/Expo Go, si può fare
  nel "grande test" finale o prima se comodo.
- **R7.2c** ✅ **FATTO** (2026-07-11) — modulo `packages/core/src/sync/`, solo funzioni pure,
  **tutte e 13 le tabelle mappate**:
  - **`merge.ts`** — `mergeLWW()` generico (riusabile per qualsiasi tabella, scritto una volta sola)
    + `haCambiamentiLocaliNonSincronizzati()`. Confronta SOLO due timestamp dello stesso device
    (`syncUpdatedAt` locale vs `lastSyncedAt` = ultimo `updated_at` server salvato in locale) — mai
    il clock di device diversi, coerente col divieto in sez. I.2. Nuovo campo `lastSyncedAt?` su
    tutte le 9 entità sincronizzate (accanto a `uid`/`syncUpdatedAt` di R7.2a) + `deletedAt?`
    (tombstone locale, mai purgato, G4) + `createdByAccountId?` solo su `NomeGiocatore` (rispecchia
    `giocatori.created_by_account_id`, reale in R7.1a ma non ancora scritto da nessuna UI — modello
    ospiti A3 resta un R8). 9 test.
  - **`mapping.ts`** (core) — `leghe`, `giocatori`, `giochi_lega`.
  - **`mappingPoker.ts`** — `partite_poker`, `partita_poker_giocatori`, `settlements` (coppie
    `xToCloudRow`/`xFromCloudRow` standard) + **`poker_movimenti`**: SOLO `movimentiFromCloudRows()`
    (pull, ricostruisce `ricariche`/`pagamenti_effettuati`/`pagamenti_ricevuti` da un elenco di righe
    ordinate per `ordine`) — **il push resta apposta non scritto qui**: essendo append-only e le
    liste locali senza un id stabile per-elemento, un push corretto deve sapere "cosa ho già
    mandato" (dedup), che è un problema di orchestrazione (R7.4), non di mapping puro. Documentato,
    non nascosto.
  - **`mappingMultigioco.ts`** — `serate`, `sessioni_gioco` (gioco_lega_id/serata_id risolti da chi
    chiama, non dal tipo locale — `SessioneGioco` ha solo la chiave stringa `giocoId`), `partite_gioco`
    (usa l'`id` locale come `ordine`: nessun campo dedicato da inventare).
  - **`mappingPonti.ts`** — `ponteToUids`/`ponteFromUids`: le 4 tabelle-ponte (`serata_partecipanti`,
    `sessione_gioco_partecipanti`, `partita_gioco_vincitori`, `partita_gioco_partecipanti`) sono
    strutturalmente identiche (coppia id-genitore/giocatore_id) — una sola coppia di funzioni
    generiche invece di 4 quasi-duplicate; il nome della colonna FK del genitore lo aggiunge chi
    orchestra il push, non serve al mapping.
  - Bug reale trovato dal typecheck durante lo sviluppo: `PagamentoEffettuato.pagato` vs
    `Ricarica.pagata` (nomi diversi per un campo simile, incoerenza preesistente nel modello) —
    corretto prima di committare.
  - **286 test core totali** (+52 dei moduli sync, +255 di prima), state/mobile tsc + expo export:
    tutti verdi.
  - **R7.2 (a+b+c) COMPLETO.**

---

# N — R7.2: fasi RIORDINATE dopo il red team (2026-07-12)

> Due red team esterni (Claude+GPT) → registro `S1…S20` in `_processo/REDTEAM-R72-SYNC.md`
> (verificati sul codice). 3 finding CONFERMATI sono su cose **già costruite** un po' male (S2, S4,
> S5) o su un tradeoff da mettere a verbale (S6, S7, S8); il #1 assoluto è **provare su DB reale
> prima di scrivere altro** (S1). Principio: **de-risk prima di aggiungere superficie** (come il red
> team R6). Quindi si inserisce un blocco **R7.2d** PRIMA di R7.3.

## R7.2d — hardening del sync prima di usarlo (NUOVO, prima di R7.3)
- **R7.2d-1 — Documento "invarianti di sync"** ✅ **FATTO** (2026-07-13, Fable):
  **`_processo/SYNC_INVARIANTI.md`** — 10 invarianti (I1-I10), ognuna con lo stato di imposizione
  reale (imposta oggi vs pendente→fase), + verbale V-S6/V-S7/V-S8/V-S14 (LWW per-riga con watchlist
  campi a rischio · delete-wins · semantica `updated_at` · piano GC tombstone con prerequisito
  cursore per-device). d2-d5 e R7.4 citano l'invariante che implementano nei commit; il gate d5
  verifica dal vivo I1/I2/I6/I7.
- **R7.2d-2 — Dirty tracking corretto** [S5] ✅ **FATTO (core) 2026-07-13** (ricerca: WatermelonDB
  `_status`/`_changed` + Legend-State pending-changes → confermano "stato locale, mai orologi"; fonti
  nel file di studio `_studio/01-...`):
  - `merge.ts` non confronta più due timestamp ma due **contatori** (`syncRev` locale vs `syncedRev`
    confermato dal server); `mergeLWW` impone anche **delete-wins** (I4). Property-based test (500
    input) sulle invarianti.
  - Tipi: `syncRev?`/`syncedRev?` sulle 9 entità; helper **`nuovoSync()`** (creazione, rev 1) e
    **`touchSync()`** (bump su mutazione) in `utils/uid.ts`, testati. `syncUpdatedAt` declassato a
    diagnostica.
  - ⏭️ **Cablaggio nello store SPOSTATO a R7.4** (deciso con l'utente 2026-07-13): finché il push non
    scrive `syncedRev`, il bump non cambia nulla di osservabile → si cabla insieme al push, dove è
    verificabile col round-trip reale, evitando 15+ edit a vuoto nello store dei soldi. Gli helper
    sono già pronti.
- **R7.2d-3 — uid sui movimenti** [S2] ✅ **FATTO (parte pura) 2026-07-13**: `uid?` su
  `Ricarica`/`Pagamento*` + **push mapping** `movimentiToCloudRows` (+ pull che ora conserva l'uid →
  round-trip testato). Chiude anche S10 (retry idempotenti via uid stabile). ⏭️ La **generazione**
  dell'uid alla creazione del movimento e l'`INSERT … ON CONFLICT (uid) DO NOTHING` = cablaggio store +
  orchestrazione → **R7.4** (come d2, stessa ragione). *[no ricerca — stesso pattern di R7.2a]*
- **R7.2d-4 — Mappa risoluzione id↔uid** [S4,S15] ✅ **FATTO 2026-07-13**: `sync/idMap.ts` —
  `costruisciIdUidMap` (generica, due direzioni) + `mappaGiocatori` (id_nome↔uid, la risoluzione più
  usata) + `idSenzaUid`. Costruita una volta a inizio sync (evita N lookup, S15). Comportamento
  creazione offline a catena (S4): entità senza uid fuori dalla mappa, l'ordine di push lo gestisce
  R7.4. Funzione pura, 7 test. *(L'aggancio della mappa ai mapping reali = R7.4.)*
- **R7.2d-5 — GATE: vertical slice su Postgres reale** [S1] ✅ **FATTO 2026-07-14** (Docker + Supabase
  CLI locale installati; DB ricreato da zero → tutte le migration → gate verde SENZA interventi manuali):
  `scripts/gate-db.mjs` prova un giro vero su `leghe`+`giocatori` con 2 utenti reali — **8/8 check**:
  round-trip, `updated_at` server-side, **RLS owner-only in lettura E scrittura**, upsert-by-uid
  idempotente, FK. **Il gate ha subito trovato un bug reale di portabilità** (i grant di default
  impliciti mancano in un DB pulito → `permission denied`): fix migration `20260714140000` (GRANT DML
  espliciti a `authenticated`). ⏳ **`numeric↔float` NON ancora coperto** dal gate (leghe/giocatori non
  hanno colonne soldi) → follow-up rapido su `partite_poker.buy_in` quando il poker entra nel sync (R7.4).
  npm: `db:start`/`db:reset`/`gate:db`.

## Poi (invariate come posizione, ora poggiano su R7.2d)
- **R7.3 — import one-shot** (backup-first, RPC transazionale, guardato da `profiles.imported_at`).
  Ancora l'operazione più pericolosa. *[mini-spec + ricerca (import transazionale) + **RED TEAM** +
  chaos test "import interrotto" · Opus xhigh]*
- **R7.4 — aggancio store**: qui confluiscono **S3** (push CAS via RPC), **S9** (1 transazione per
  lega), **S10** (retry idempotenti), **S11** (mutex anti-race), **S12** (orfani), **S13** (ordine
  ledger→settlement), **S15** (cache lookup), **S18** (compat versioni), **S20** (logout durante sync).
  **+ cablaggio dirty-tracking** (spostato da d2, 2026-07-13): `nuovoSync()` sui punti di creazione +
  `touchSync()` sulle mutazioni delle 9 entità, verificato col push reale. *[mini-spec + ricerca
  (delta-sync, retry/backoff) + chaos test · Opus xhigh]*
- **R8** — + **S16** (float→int-centesimi, decisione B6) + **S14** (GC tombstone).
- **H-block** — + **S19** (osservabilità sync + sync-log).

---

# M — R7.2b: mini-spec dettagliata dell'aggancio boot (ricerca + design, 2026-07-11)

> Durante R7.2b è emerso un ostacolo: lo storage per-account non è "aggiungi un wrapper", tocca
> l'**ordine di boot** (hydration → auth → claim identità), un percorso già indurito dall'audit
> (M13/B24/B27). Per il metodo (ricerca prima di scegliere, su feature E non solo grafica) ho
> cercato **come lo risolvono progetti reali** prima di ridisegnare. Nessun codice di boot toccato
> finché questa sezione non è approvata.

## M.1 — Ricerca (fonti, cosa cambia nella nostra scelta)

- **Zustand, docs ufficiali** (`persisting-store-data.md`): `skipHydration: true` + chiamata manuale
  a `persist.rehydrate()` è il meccanismo **documentato** per "controlled initialization: hydrate at
  a specific point in the application lifecycle" — esattamente il nostro caso (oggi lo usano per
  l'SSR, ma il problema — non sapere ancora COSA idratare finché non è pronto un altro pezzo
  d'app — è identico). C'è anche `persist.setOptions({ name })` per **cambiare la chiave a runtime**
  prima di ri-idratare, e `hasHydrated()`/`onFinishHydration()` per il gate UI.
  → **Cambio rispetto alla mia bozza precedente**: NON serve un `StateStorage` wrapper custom
  (`perAccountStorage` che avevo già scritto in `accountStorage.ts`) — uso l'API nativa
  `setOptions({name: chiaveStorage(...)})` + `rehydrate()`. Più semplice, meno codice mio da
  mantenere, comportamento "benedetto" dalla libreria. **Azione**: rimuovere `perAccountStorage`
  (diventa morto) quando implemento, tenere solo `chiaveStorage`+`migraBlobUnicoSeNecessario`.
  [Persisting store data](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) ·
  [Discussion #525 — persist per account](https://github.com/pmndrs/zustand/discussions/525)
- **WatermelonDB + Supabase + Expo** (stack quasi identico al nostro): il pattern più comune per
  "più account sullo stesso device" è **wipe totale del DB locale al logout**
  (`db.unsafeResetDatabase()`), non namespace-e-conserva. Più semplice, ma perde i dati offline
  dell'account ad ogni logout/login. **Decisione**: teniamo comunque namespace-e-conserva (già
  scelto in G1) — è più comodo per chi torna sullo stesso account, e il costo in più (una chiave
  per account invece di una sola) è basso. Lo confermo qui perché la ricerca mostrava un'alternativa
  più semplice e voglio che la scelta sia esplicita, non per inerzia.
  [Building an offline-first app with Expo, Supabase and WatermelonDB: Authentication](https://www.themorrow.digital/blog/building-an-offline-first-app-with-expo-supabase-and-watermelondb-authentication)
- **PowerSync** (sync bucket per-utente via JWT): conferma che la partizione "giusta" per-account è
  un problema che si risolve anche lato server (RLS `owner_id=auth.uid()`, già deciso D7) — lo
  storage locale PRE-sync (R7.2, prima ancora del vero push/pull) è un problema a parte, nostro,
  lato client, che questa fase risolve da sola.
  [PowerSync Philosophy](https://docs.powersync.com/intro/powersync-philosophy)

## M.2 — Design rivisto (sostituisce il punto 4 della sez. I)

**Niente wrapper.** Si usa `persist.setOptions({ name })` + `persist.rehydrate()`, nativi di zustand.
`accountStorage.ts` si riduce a due sole funzioni pure (già scritte, test-first):
`chiaveStorage(base, accountId)` e `migraBlobUnicoSeNecessario(storageRaw, storeKey, accountId)`.

**Split dell'identità in due**: oggi `applyUtente(user)` fa DUE cose insieme — (a) espone `utente`
al resto dell'app, (b) applica gli effetti sul db (`assicuraTuNelPersonale`/`assicuraTuNelleLeghe`,
claim dei record). Il problema: (b) deve girare **DOPO** che il db è stato ri-idratato dalla chiave
giusta, ma oggi (a)+(b) partono insieme, subito alla risposta di Supabase. Si separano:
- **`authUser`** (nuovo campo, non persistito): l'identità GREZZA appena risolta da Supabase,
  aggiornata ad OGNI evento (`getSession` iniziale + ogni `onAuthStateChange`).
- **`utente`** (invariato nel significato): l'identità "pronta" — resta uguale a oggi, letta da
  tutto il resto dell'app (LoginScreen gate, Profilo, ecc.), ma ora viene settata dall'orchestratore
  **solo dopo** che lo storage è quello giusto.
- **`applyUtente`** resta la funzione che fa (a)+(b) insieme (nessun cambio alla sua logica interna,
  già testata) — cambia SOLO **chi la chiama e quando**.
- **`dbReady`** (nuovo, non persistito, default `false`): true quando lo storage per l'account
  corrente è stato ri-idratato (o azzerato, se nessun account). Il gate UI diventa
  `authLoading || !dbReady` invece di solo `authLoading`.
- **`clearDbLocale`** (nuova azione store, banale): `set({ db: emptyDb() })` — usata quando
  `authUser` torna `null` (logout): niente storage da leggere, si azzera e basta.

`authSlice.ts` (`initAuth`) cambia UNA riga concettuale: dove oggi chiama
`get().applyUtente(toUser(...))` (sia nella risoluzione iniziale sia in `onAuthStateChange`), chiama
invece `get().setAuthUser(toUser(...))`. `setAuthLoading(false)` resta dov'è (solo alla risoluzione
iniziale, come oggi): continua a significare "il PRIMO controllo sessione è finito", non
"tutto pronto" — quello lo dice `dbReady`.

## M.3 — Sequenza di boot (nuovo orchestratore in `_layout.tsx`)

Due `useEffect` indipendenti invece dell'unico attuale:

1. **Avvio auth** (una volta sola, come oggi): `useEffect(() => { initAuth(); }, [initAuth])` — NON
   aspetta più l'idratazione (Supabase legge la propria sessione da un suo storage indipendente).
2. **Orchestratore storage** (nuovo), reagisce a `[authUser?.id, authLoading]`, con un `useRef` di
   dedup (stesso pattern di `useDeepLinkAuth`/B24, per non rifare tutto ad ogni token-refresh che
   ripropone lo stesso `authUser.id`):
   ```
   if (authLoading) return;                      // aspetta il primo giro di Supabase
   const accountId = authUser?.id ?? null;
   if (lastAccountRef.current === accountId) return;  // stesso account (token refresh) → no-op
   lastAccountRef.current = accountId;
   set dbReady=false
   se accountId è null (logout): clearDbLocale(); dbReady=true; FINE (LoginScreen non legge db)
   altrimenti:
     persist.setOptions({ name: chiaveStorage(STORE_KEY, accountId) })
     await migraBlobUnicoSeNecessario(mobileStorageAdapter, STORE_KEY, accountId)
     await persist.rehydrate()
     runMigrations()
     applyUtente(authUser)      // ORA il db è quello giusto: claim/ensure sicuri
     dbReady=true
   ```
   Guardia `cancelled` (stesso pattern già in uso nel repo) per lo switch rapido logout→login.

**Gate UI**: `authLoading || !dbReady ? Loader : !utente ? LoginScreen : Stack` (era solo
`authLoading ? ... : !utente ? ... : ...`).

## M.4 — Copre anche il cambio-account A CALDO (non solo il boot)

A differenza della bozza precedente (che si fermava al boot), questo disegno gestisce **con lo
stesso codice** anche logout→login-di-un-altro-account senza riavviare l'app, perché l'effect
reagisce a OGNI cambio di `authUser?.id`, non solo al primo. Coerente con quanto fanno
WatermelonDB/RxDB nella pratica (chiudono/ri-aprono il DB ad ogni cambio utente, non solo al boot).

## M.5 — Cosa resta un limite esplicito (dichiarato, non nascosto)

- Se l'app viene **uccisa a metà** della sequenza (es. durante `rehydrate()`), al riavvio si
  riparte da zero (gate `dbReady=false`) — nessuno stato a metà persistito, sicuro per costruzione.
- La migrazione one-shot **copia, non sposta**: se due account diversi fanno il primo login sullo
  stesso device PRIMA che uno dei due sincronizzi mai nulla (scenario raro, pre-R7.3), entrambi
  vedrebbero lo stesso blob legacy iniziale — accettato (già dichiarato in G1), si risolve da solo
  con R7.3 (import) e R8 (ogni account poi diverge sui propri dati cloud).
- Nessun vero test end-to-end del boot (serve un device/Expo Go, non solo Vitest) — si verifica nel
  "grande test" finale già pianificato (`DECISIONI.md`), qui si verificano solo le funzioni pure.

## M.6 — Piano di implementazione (micro-step, test-first)

1. `accountStorage.ts`: rimuovere `perAccountStorage` (morto dopo il pivot a `setOptions`) + il suo
   test; tenere `chiaveStorage`+`migraBlobUnicoSeNecessario` (già verdi).
2. `packages/state/store.ts`: nuovi campi `authUser`/`dbReady` (non persistiti, esclusi da
   `partialize` come `utente`/`authLoading` oggi) + azioni `setAuthUser`/`setDbReady`/`clearDbLocale`;
   `persist(...)` riceve `skipHydration: true`. Test sulle nuove azioni (pure, banali).
3. `authSlice.ts`: sostituire le 2 chiamate `applyUtente(toUser(...))` con `setAuthUser(toUser(...))`.
4. `useStore.ts`: esportare l'adapter storage grezzo (oggi inline) come `mobileStorageAdapter`, per
   passarlo a `migraBlobUnicoSeNecessario` da `_layout.tsx`.
5. `_layout.tsx`: nuovo orchestratore (sez. M.3), gate UI aggiornato con `dbReady`.
6. Verifica piena (test, tsc state, expo export, typecheck) + **prova manuale in Expo Go** (login
   con un account esistente, verificare che i dati ci siano ancora — è un cambio di boot, merita
   un occhio dal vivo oltre ai test, anche se il vero test end-to-end resta il "grande test" finale).
7. Commit + aggiornare checkbox qui + `AUDIT_R6_R7.md`/M12.

**Chiedo conferma su questa mini-spec (sez. M) prima di toccare `_layout.tsx`/`authSlice.ts`/`store.ts`.**

---

# O — R7.3: design FINALE import one-shot (post red-team, 2026-07-17)

> Mini-spec approvata + 8 correzioni dal red team (registro `REDTEAM-R73-IMPORT.md`, agente Opus
> su codice reale). Questa sezione è la **fonte unica** per l'implementazione. Calibrazione utente:
> dati attuali usa-e-getta, niente gold-plating; priorità ai test.

## O.1 — Flusso client
1. **Backup** (non-gate): export JSON completo via Share; se fallisce/annullato si può proseguire
   (il locale NON viene mai cancellato dall'import — è lui il vero backup).
2. **Battesimo idempotente** [I-R5]: assegna uid SOLO dove manca (movimenti inclusi) →
   **`await` persist locale confermato** → solo dopo, la RPC. Un retry rispedisce gli stessi uid.
3. **Pre-flight strutturale** [I-R8] (client, puro): esattamente 1 lega personale · uid unici ·
   ogni FK interna al payload ha il padre nel payload → errore leggibile PRIMA di spedire.
   + **Riconciliazione soft** (B3/F2): somme settlement/buy-in; anomalie → flag nel payload, mai blocco.
4. **RPC unica** `import_locale(payload jsonb)` (vedi O.2). Payload = 1 JSONB, 13 tabelle,
   **`version` int** [I-R7].
5. **Verifica conteggi** [I-R6]: la RPC ritorna righe-inserite-per-tabella; il client confronta coi
   conteggi del payload PRIMA di segnare l'import riuscito.
6. **Stamp per-riga** [I-R3]: `syncedRev = syncRev spedito` SOLO sulle righe importate;
   `lastSyncedAt` dal pull successivo. Edit avvenuti nella finestra restano dirty.

## O.2 — RPC `import_locale` (migration nuova)
- **SECURITY INVOKER** (RLS attiva, `auth.uid()` reale) + `grant execute … to authenticated` [I-R8].
- **PRIMO atto — guardia ATOMICA** [I-R1]: `UPDATE public.profiles SET imported_at = now()
  WHERE id = auth.uid() AND imported_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'already_imported';`
  (row-lock serializza i concorrenti; il rollback la annulla → all-or-nothing).
- `IF (payload->>'version')::int <> 1 THEN RAISE 'unsupported_payload_version'` [I-R7].
- Insert **parent-first obbligatorio** [I-R2]: profiles(già c'è) → leghe → giocatori + giochi_lega →
  partite_poker → partita_poker_giocatori → poker_movimenti + settlements → serate → sessioni_gioco →
  partite_gioco → ponti. (La RLS `WITH CHECK owns_lega()` gira all'INSERT: le FK deferite NON bastano.)
- Parsing: `jsonb_to_recordset` con colonne tipate per tabella (niente SQL dinamico).
- **Ritorno**: jsonb `{tabella: n_inserite, …, anomalie: […]}` [I-R6].

## O.3 — Contratto R7.3→R7.4 (il pezzo che mancava — da testare come le invarianti)
> **Per ogni riga importata, `syncedRev` = la revisione spedita; ogni edit nella finestra
> dell'import resta dirty; nessuna riga divergente di un altro device viene mai marcata pulita.**
- **`already_imported` sul 2° device (dati divergenti)** [I-R4]: MAI marcare clean; i dati locali
  restano dirty (li unirà il delta-sync R7.4 via upsert-by-uid) + avviso una-tantum all'utente
  ("questo account ha già dati sul cloud: i tuoi verranno uniti alla prossima sincronizzazione").
  L'import "semina" il cloud dal primo device; gli altri si uniscono, non importano.

## O.4 — Sotto-fasi (micro-commit, pause tra i pezzi)
- **R7.3a** — funzioni pure core: battesimo idempotente + pre-flight + payload builder v1 +
  conteggi attesi. Test-first. *(Opus high)*
- **R7.3b** ✅ **FATTO (2026-07-17)** — migration **#8** `import_locale` (`20260717120000_r73_import_rpc.sql`)
  + gate `scripts/gate-import.ts` (`pnpm gate:import`): **10/10 verde al primo colpo** su Postgres reale.
  Verificati dal vivo: conteggi RPC == payload (I-R6, 23 righe) · round-trip (numeric↔float integro) ·
  doppio import → `already_imported` senza duplicati · **import CONCORRENTE 2 client → ne passa UNO
  SOLO** (I-R1, la guardia atomica regge) · versione ignota rifiutata con guardia intatta (I-R7) ·
  **rollback totale + guardia riazzerata → import ritentabile** (il caso che avrebbe bloccato per
  sempre un account) · RLS sui dati importati. Il gate usa il **payload builder vero** di R7.3a →
  valida il contratto builder↔RPC, che nessun unit test copre.
- **R7.3c** — orchestrazione app: backup/Share → battesimo+persist → RPC → verifica conteggi →
  stamp per-riga + ramo `already_imported` (avviso, niente stamp). UI minima.
- **R7.3d** — chaos: crash post-commit pre-risposta (retry → already_imported → NO clean) ·
  uid-divergence dopo crash del persist [I-R5].
