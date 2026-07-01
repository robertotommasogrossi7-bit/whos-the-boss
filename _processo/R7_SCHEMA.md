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

### 3.1 Core
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

### 3.2 Poker (storico salvato)
**`partite_poker`** *(← `Lega.partite: Partita[]`)*
| id uuid PK · lega_id → leghe · local_id int (`Partita.id`) · buy_in numeric(10,2) · data date · ora_inizio text · ora_fine text · modalita text ('cash'|'torneo') · created_at/updated_at/deleted_at |

**`partita_poker_giocatori`** *(← `Partita.giocatori: GiocatorePartita[]`)*
| colonna | tipo | note |
|---|---|---|
| id | uuid PK | |
| partita_id | uuid → partite_poker | |
| giocatore_id | uuid → giocatori | (risolve `id_nome`) |
| entrate, ricarica_fatta, extra, soldi_ricevuti, fiches_finali, netto_finale, premio | numeric(10,2) | i numeri dei soldi |
| vincitore, buy_in_pagato, extra_pagato, add_on_fatto, add_on_pagato | bool | |
| posizione_finale | int null | |
| ricariche | **jsonb** | `Ricarica[] {importo,pagata?}` — array-foglia (vedi Decisione D2) |
| pagamenti_effettuati | jsonb | `{to,amount,pagato?}[]` (D2) |
| pagamenti_ricevuti | jsonb | `{from,amount}[]` (D2) |

**`settlements`** *(← `Partita.settlements: Settlement[]` = i DEBITI "chi paga chi")*
| id uuid PK · partita_id → partite_poker · from_giocatore_id → giocatori · to_giocatore_id → giocatori · amount numeric(10,2) · pagato bool |

### 3.3 Multigioco (storico salvato)
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
