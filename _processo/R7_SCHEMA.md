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

- **R7.2a** — `generaUid()` (UUIDv7) + campo `uid`/`syncUpdatedAt` sui tipi + agganciato ai punti di
  creazione. Solo core, test-first.
- **R7.2b** — storage per-account: chiave namespaced + migrazione one-shot. `packages/state`, test-first.
- **R7.2c** — modulo `sync/`: mapping locale↔cloud (tabella per tabella) + merge LWW + tombstone.
  Solo funzioni pure, core, test-first — **il grosso della fase**.

**Chiedo conferma su questa mini-spec prima di iniziare R7.2a.**
