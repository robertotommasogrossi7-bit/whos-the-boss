# POKER TRACKER — Mappa del progetto
> File di riferimento per sessioni future. Aggiornare dopo ogni modifica significativa.
> Entry point: `index.html` — CSS in `css/styles.css`, JS modulare in `js/*.js`

---

## Stack
- HTML + CSS vanilla + JS vanilla (no framework, no bundler)
- Persistenza: `localStorage` chiave `pokerTracker_v2`
- Nessun backend

---

## Struttura file

```
poker/
├── index.html                  ← solo HTML + <link> CSS + <script> tags
├── css/
│   └── styles.css              ← tutti gli stili
├── js/
│   ├── config.js               ← costanti + TUTTE le var globali di stato
│   ├── auth.js                 ← login, register, getUser/setUser, DOMContentLoaded init
│   ├── data.js                 ← dbGet/dbSave, saveLega, currentLega, migrations
│   ├── calc.js                 ← utils (esc, fmtData, euro, getNome…) + calcoli torneo
│   ├── ui.js                   ← toast, goScreen, navTo, refreshActiveAppTab
│   ├── leghe.js                ← goCircoli, renderListaLeghe, goApp, creaLega
│   ├── giocatori.js            ← aggiungiGiocatore, renderGiocatori, eliminaGiocatore
│   ├── session-hub.js          ← renderPartitaForm (dispatcher), renderSerataHub, apriSerataAttiva, annullaSessione
│   ├── session-setup.js        ← renderSetupHtml, renderTorneoConfig, avviaSessione
│   ├── session-cash.js         ← computeLive, renderLiveHtml, renderSubGiocatori/Attivi, toggle*
│   ├── session-tournament.js   ← timer, livelli, renderLiveTorneoHtml, renderSubOrologio/GiocatoriTorneo
│   ├── session-premi.js        ← renderSubPremi, torneoElimina, showPrizeModal, confirmaPremio
│   ├── settlement.js           ← apriChiusura(Torneo), renderChiusura(Torneo), confermaChiusura
│   ├── storico.js              ← renderStorico, toggleStoricoCard, toggleSettlementPaid, eliminaPartita
│   ├── classifica.js           ← renderClassifica
│   └── debiti.js               ← apriDebiti, chiudiDebiti, aggiornaFabDebiti, renderDebiti, saldaDebito
└── poker_tracker.html          ← (legacy gutted) file originale con marker comments
```

### Ordine `<script>` in index.html
```
config → auth → data → calc → ui → leghe → giocatori →
session-hub → session-setup → session-cash → session-tournament →
session-premi → settlement → storico → classifica → debiti
```
Tutti i file usano `'use strict';`. Le variabili `let`/`const` top-level sono globali condivise tra tutti gli `<script>` classici.

---

## Struttura localStorage (`pokerTracker_v2`)
```js
{
  leghe: [ ...Lega ],
  _lid: number,
  _currentLegaId: number
}
```

### Lega
```js
{
  id: number,
  nome: string,
  foto: string,              // dataURL
  nomi: [ {id, nome} ],      // rubrica giocatori
  partite: [ ...Partita ],
  sessioneAttiva: Sessione | undefined,  // serata "attiva" nel tab
  serate_bg: [ ...Sessione ],            // sessioni in background (hub multi-serata)
  _nid: number,              // auto-increment id giocatore
  _pid: number               // auto-increment id partita
}
```

### Sessione (partita in corso)
```js
{
  data, ora_inizio, ora_fine: string,
  modalita: 'cash' | 'torneo',
  buy_in: number,
  // TORNEO
  fiche_iniziali, num_giocatori_target, num_tavoli, durata_ore: number,
  livelli: [ {tipo:'gioco'|'pausa', sb, bb, ante, durata} ],
  late_reg: { fino_a_livello },
  add_on: { abilitato, fiche, prezzo },
  premi: [ {posizione, percentuale, importo} ],   // su monte TEORICO
  premi_consolidati: boolean,
  stato: 'pre'|'attivo'|'pausa'|'concluso',
  livello_corrente, inizio_livello_ms, trascorso_ms: number,
  // GIOCATORI
  giocatori: [ ...GiocatoreSessione ]
}
```

### GiocatoreSessione
```js
{
  id_nome: number,
  entrato, buy_in_pagato: boolean,
  extra_amt: number, extra_pagato: boolean,
  ricariche: [ {importo, pagata} ],      // cash
  rebuys: [ {importo, pagata} ],         // torneo
  soldi_ricevuti, fiches_finali: number, // cash
  seat: { tavolo, posto } | null,        // torneo
  add_on_fatto, add_on_pagato: boolean,  // torneo
  eliminato: boolean,
  posizione_finale: number | null,
  elim_ts_ms: number | null,
  prize_pagato: boolean                  // torneo: premio già consegnato
}
```

### Partita (salvata)
```js
{
  id, buy_in: number,
  data, ora_inizio, ora_fine, modalita: string,
  giocatori: [ ...GiocatorePartita ],
  settlements: [ {from, to, amount, pagato} ]
}
```

### GiocatorePartita
```js
{
  id_nome, entrate, ricarica_fatta, extra, soldi_ricevuti,
  fiches_finali, netto_finale, premio: number,
  vincitore, buy_in_pagato, extra_pagato: boolean,
  ricariche: [ {importo, pagata} ],
  pagamenti_effettuati: [ {to, amount} ],
  pagamenti_ricevuti:   [ {from, amount} ],
  posizione_finale: number | null,
  add_on_fatto, add_on_pagato: boolean
}
```

---

## Schermate (screens)
| ID | Funzione apertura | File |
|---|---|---|
| `screen-login` | (default) / `goLogin()` | auth.js |
| `screen-circoli` | `goCircoli()` | leghe.js |
| `screen-nuova-lega` | `goNuovaLega()` | leghe.js |
| `screen-lista-leghe` | `goListaLeghe()` | leghe.js |
| `screen-app` | `goApp(legaId)` | leghe.js |
| `screen-debiti` | `apriDebiti()` | debiti.js |
| `screen-chiusura` | `apriChiusura()` / `apriChiusuraTorneo()` | settlement.js |

### Bottom nav (screen-app) — `navTo(page, btn)` in ui.js
- Tab 0 `partecipanti`: `renderGiocatori()` (giocatori.js)
- Tab 1 `partita`: `renderPartitaForm()` (session-hub.js, dispatcher hub/live/setup)
- Tab 2 `storico`: `renderStorico()` (storico.js)
- Tab 3 `classifica`: `renderClassifica()` (classifica.js)

---

## Funzioni chiave — TORNEO

| Funzione | File | Scopo |
|---|---|---|
| `calcolaPremi(monte, n)` | calc.js | Array premi per posizione |
| `calcolaMontepremi(sess)` | calc.js | Monte TEORICO (pagati + non pagati) |
| `calcolaMontepremiIncassato(sess)` | calc.js | Solo contributi pagati |
| `calcolaPremiPagati(sess)` | calc.js | Somma premi `prize_pagato=true` |
| `renderLiveTorneoHtml(lega)` | session-tournament.js | Render torneo live (3 sub-tab) |
| `renderSubOrologio(s)` | session-tournament.js | Sub-tab timer + livelli |
| `renderSubGiocatoriTorneo(lega)` | session-tournament.js | Sub-tab player con azioni |
| `renderSubPremi(lega)` | session-premi.js | Sub-tab struttura premi |
| `torneoElimina(idNome)` | session-premi.js | Elimina + assegna pos + modal premio |
| `showPrizeModal(idNome, pos, importo)` | session-premi.js | Modal "In the money!" |
| `confirmaPremio(pagato)` | session-premi.js | Conferma modal: setta `prize_pagato` |
| `consolidaPremiSeNecessario(s)` | session-tournament.js | Chiude late reg + monte |
| `apriChiusuraTorneo()` | settlement.js | Prepara `_settlement` torneo |
| `renderChiusuraTorneo()` | settlement.js | Render chiusura torneo |

### Logica chiusura torneo (`apriChiusuraTorneo`)
- `losers`: `contributo_residuo > 0` (non hanno pagato tutto)
- `winners`: `premio_residuo > 0` (premio non ancora consegnato)
- Auto-allocazione greedy: debiti losers → crediti winners
- `_settlement.isTorneo = true`

---

## Funzioni chiave — SERATA HUB (multi-sessione)

| Funzione | File | Scopo |
|---|---|---|
| `renderPartitaForm()` | session-hub.js | Dispatcher su `_serataView`: hub / live / setup |
| `renderSerataHub(lega)` | session-hub.js | Card per ogni sessione + "Nuova serata" |
| `apriSerataAttiva(bgIdx)` | session-hub.js | Swap bg[idx] ↔ sessioneAttiva |
| `vaiSetupSerata()` | session-hub.js | Va al form di nuova serata |
| `annullaSessione()` | session-hub.js | Annulla la sessione attiva |
| `avviaSessione()` | session-setup.js | Crea nuova sessione (sposta attuale in bg) |

### Logica swap sessioni
- `_serataView = 'hub' | 'live' | 'setup'` controlla il dispatcher
- `apriSerataAttiva(bgIdx)`: swap bg[bgIdx] ↔ sessioneAttiva, poi `_serataView='live'`
- Dopo chiusura/annullo: promuove automaticamente `serate_bg[0]` a sessioneAttiva

---

## Funzioni chiave — CASH

| Funzione | File | Scopo |
|---|---|---|
| `computeLive(lega)` | session-cash.js | Calcola `{arr, leaderId}` (netto, mancante, …) |
| `renderLiveHtml(lega)` | session-cash.js | Render cash live (dispatch torneo → tournament.js) |
| `apriChiusura()` | settlement.js | Prepara `_settlement` cash |
| `renderChiusura()` | settlement.js | Dispatcher: `isTorneo` → tornei, else cash |
| `confermaChiusura()` | settlement.js | Salva partita, svuota sessioneAttiva |

### Modello settlement cash
- `losers` = `mancante > 0.005` (NON hanno pagato tutto in cassa)
- `winners` = `netto > 0.005`
- Chi ha pagato tutto ma perso chip → perdita assorbita dal piatto fisico (non debitore)

---

## Funzioni chiave — STORICO / DEBITI / CLASSIFICA

| Funzione | File | Scopo |
|---|---|---|
| `renderStorico()` | storico.js | Lista partite con filtro date + accordion |
| `toggleStoricoCard(id)` | storico.js | Apri/chiudi card; stato in `_storicoOpen` |
| `toggleSettlementPaid(pid, idx)` | storico.js | Toggle pagato singolo settlement |
| `eliminaPartita(id)` | storico.js | Elimina partita dal db |
| `renderClassifica()` | classifica.js | Ranking netto con filtro date + medaglie |
| `migratePartita(p)` | data.js | Retrocompatibilità: deriva settlements |
| `migrateSessione(s)` | data.js | Retrocompatibilità: deriva ricariche v2 |
| `apriDebiti()` | debiti.js | Screen debiti pendenti |
| `chiudiDebiti()` | debiti.js | Torna all'app + refresh |
| `aggiornaFabDebiti()` | debiti.js | Badge FAB con conteggio |
| `saldaDebito(pid, idx)` | debiti.js | Marca singolo settlement pagato |
| `saldaTuttiDi(debtorId)` | debiti.js | Marca tutti i debiti di un giocatore |

---

## Funzioni UI generali

| Funzione | File | Scopo |
|---|---|---|
| `goScreen(id)` | ui.js | Naviga tra schermate top-level |
| `navTo(page, btn)` / `navToById(page)` | ui.js | Naviga tra tab di screen-app |
| `refreshActiveAppTab()` | ui.js | Re-render tab attivo |
| `toast(msg)` | ui.js | Notifica in basso |
| `currentLega()` | data.js | Lega attiva da `_currentLegaId` |
| `saveLega(lega)` | data.js | Persiste lega su localStorage |
| `getNome(lega, id)` | calc.js | Nome stringa da id_nome |
| `euro(n)` / `euroSigned(n)` | calc.js | Format numero come "25,00" / "+25,00" |
| `fmtData(s)` | calc.js | "YYYY-MM-DD" → "DD/MM/YYYY" |
| `esc(s)` | calc.js | Escape HTML |

---

## Variabili globali (TUTTE in `config.js`)
```js
// Costanti
const USER_KEY  = 'pokerTrackerUser_v2';
const STORE_KEY = 'pokerTracker_v2';

// UI generale
let _toastTmr      = null;
let _formRendered  = false;  // guard: evita reset form a ogni re-render

// Nuova lega
let _nlFoto = '';

// Serata hub / setup
let _serataView    = 'hub';        // 'hub' | 'live' | 'setup'
let _setupPartIds  = new Set();
let _setupModalita = 'cash';
let _setupTorneo   = null;

// Live session
let _liveSubTab = 'giocatori';     // 'orologio' | 'giocatori' | 'attivi' | 'premi'

// Torneo
let _timerInterval    = null;
let _pendingPrizeNome = null;

// Settlement
let _settlement = null;

// Storico
let _storicoFrom = '';
let _storicoTo   = '';
let _storicoOpen = new Set();

// Classifica
let _classificaFrom = '';
let _classificaTo   = '';
```

> Tutte le variabili sono accessibili globalmente tra i file (script classici condividono scope top-level).

---

## Struttura blind levels (torneo)
- Generati da `suggerisciTorneo(num_giocatori, durata_ore)` in session-setup.js
- Stack iniziale ~100 BB
- Progressione ~1.5× con antes da livello 6+
- Pausa ogni 4 livelli
- Late reg ≈ 30% del torneo
- Helper: `roundChipVal(v)` arrotonda a valori chip "puliti"

---

## Storia / cronologia significativa

### maggio 2026 — split modulare (questa sessione)
- File monolitico `poker_tracker.html` (~4500 righe) suddiviso in:
  - `index.html` (HTML structure only)
  - `css/styles.css`
  - 16 file JS in `js/` con responsabilità separate
- Tutte le var globali centralizzate in `config.js`
- `'use strict'` in ogni file JS
- Ordine `<script>` rispetta le dipendenze
- Nessuna logica modificata: tutte le funzioni mantengono nome, parametri e comportamento originali
- File legacy `poker_tracker.html` mantenuto con commenti marker `// → js/nome.js` per audit

### Ultime modifiche pre-split
- `calcolaMontepremi` include contributi NON pagati (calcolo premi equo)
- `prize_pagato` su GiocatoreSessione + modal premio in-tournament
- `renderSubPremi`: barra Incassato / Pagato / Da incassare
- `apriChiusuraTorneo` + `renderChiusuraTorneo`: modello separato da cash
- `confermaChiusura`: torneo usa `contributo_residuo` per validazione
- FAB debiti globale con badge contatore
- Settlement cash fix: `losers = mancante > 0` (non `netto < 0`)
- Serata hub multi-sessione: `serate_bg[]`, `apriSerataAttiva`, `_serataView`
- Storico accordion: `toggleStoricoCard`, `_storicoOpen` (Set)
- Filtri date su storico e classifica
- `_formRendered` guard contro reset modalità setup
