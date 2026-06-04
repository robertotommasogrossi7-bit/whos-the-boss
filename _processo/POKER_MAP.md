# POKER TRACKER — Mappa del codice (React)

> Mappa di navigazione della versione React in `poker-react/`. Aggiornare
> dopo modifiche significative. **Sorgente di verità per i tipi è
> `poker-react/src/types/index.ts`** — qui ne riassumo solo lo schema.

---

## Stack

- **Build**: Vite 6
- **UI**: React 19 + TypeScript 5.8 (strict)
- **State**: Zustand 5 (middleware `persist` su `localStorage`)
- **Routing**: React Router 7
- **Stile**: CSS plain (Tailwind pianificato, non ancora)
- **Test**: Vitest
- **Persistenza**: `localStorage` chiave `pokerTracker_v2` (compat col formato
  della vecchia versione vanilla — vedi `vanillaCompatStorage`)

Comandi (in `poker-react/`):
```
npm run dev     # server dev, porta 5173
npm run lint    # ESLint flat config
npm test        # Vitest
npx tsc -b      # build TS
```

---

## Entry point e routing

`src/main.tsx` monta `<App />`. `src/App.tsx` dichiara le route:

| Route                           | Componente            | Note |
|---------------------------------|-----------------------|------|
| `/login`                        | `LoginScreen`         | auth |
| `/circoli`                      | `CircoliHome`         | richiede auth |
| `/nuova-lega`                   | `NuovaLega`           |  |
| `/leghe`                        | `ListaLeghe`          |  |
| `/app/:legaId`                  | `AppLayout` (annida)  | layout principale |
| `/app/:legaId/serata`           | `TabSerata`           | tab serata |
| `/app/:legaId/partecipanti`     | `TabPartecipanti`     | tab partecipanti |
| `/app/:legaId/storico`          | `TabStorico`          | tab storico |
| `/app/:legaId/classifica`       | `TabClassifica`       | tab classifica |
| `/debiti`                       | `DebitiScreen`        | debiti aperti |

`AppLayout` contiene la `BottomNav` + l'`<Outlet />` per i tab e
l'`<PartitaOverlay />` a tutto schermo. La `FabPartiteAttive` (badge
basso-sx) è renderizzata fuori dall'overlay.

---

## Struttura cartelle

```
poker-react/src/
├── main.tsx                    ← bootstrap React
├── App.tsx                     ← routing
├── types/index.ts              ← TUTTI i tipi dominio
├── store/useStore.ts           ← Zustand store + persist adapter vanilla-compat
├── hooks/
│   ├── useCurrentLega.ts       ← selector lega corrente
│   ├── useComputeLive.ts       ← calcola dovuto/mancante/netto cash (puro + memo)
│   └── useTimer.ts             ← driver timer torneo
├── utils/
│   ├── format.ts               ← esc, fmtData, euro, oggi, getNome
│   ├── calc.ts                 ← calcoli torneo (montepremi, premi, consolida)
│   ├── settlement.ts           ← calcolaSettlement cash (puro, §8 SETTLEMENT_SPEC)
│   ├── settlement.test.ts      ← test §14 (9 base + 3 buy-in misti = 12)
│   ├── settlementTorneo.ts     ← calcolaSettlementTorneo (puro): auto-compensa contributo↔premio
│   ├── settlementTorneo.test.ts ← test torneo (5 scenari)
│   ├── torneo.ts               ← suggerisciTorneo, creaSessione, nuovoGiocatoreSessione, posti
│   ├── migrations.ts           ← migrateSessione, migratePartita, migrateLega (agganciata in R/M2: runMigrations)
│   ├── migrations.test.ts      ← test migrateLega (4)
│   ├── giochi.ts (+ .test.ts)  ← catalogo 11 giochi + nuovoGiocoCustom/accentDaNome (M1; test in R/M2)
│   ├── statsGiochi.ts (+ .test.ts) ← M1: calcolaStatsGioco (puro, SPEC §7) + StatsGiocatore
│   ├── tema.ts                 ← R/M2: applyTema/temaPerGioco/accentPerGioco (data-tema + --accent dinamico)
│   ├── personale.ts (+ .test.ts) ← R/M2: creaLegaPersonale (lega speciale "Personale" §2)
│   └── sessioneGioco.ts (+ .test.ts) ← M3: ciclo sessione/partita (puro) + esitoSessione coerente con calcolaStatsGioco
└── components/
    ├── auth/LoginScreen.tsx
    ├── shell/                  ← R/M2: ShellLayout, GlobalNav, GameBar, Home, ClassificaShell, StoricoShell
    ├── ui/                     ← R/M2: libreria UI (Button, Card, Chip, Sheet, ListRow, Avatar, EmptyState)
    ├── icons/                  ← R/M2: ui.tsx (icone interfaccia), gameGlyphs + GameIcon (glifi gioco, no emoji/loghi)
    ├── gioco/                  ← M3: SchermataGioco, SheetNuovaSessione, SheetEsitoPartita, StoricoSessioni (segna-partita)
    ├── leghe/                  ← NuovaLega, ListaLeghe + M3: LegaLayout/LegaNav, LegaHome/Classifica/Storico, SchermataGiocoLega (HubLega rimosso)
    ├── app/                    ← AppLayout, BottomNav, PartitaOverlay (poker, ora sotto /leghe/:id/poker)
    ├── common/                 ← Toast, FabDebiti, FabPartiteAttive
    ├── giocatori/              ← TabPartecipanti
    ├── serata/                 ← tutto il flusso partita poker (setup + live + sub-tab)
    ├── settlement/             ← ChiusuraCash, ChiusuraTorneo, ChiusuraScreen
    ├── storico/                ← TabStorico
    ├── classifica/             ← TabClassifica
    └── debiti/                 ← DebitiScreen
```

Risorse fuori da React (root del repo): `index.html` + `css/` + `js/`
sono la **vecchia versione vanilla** mantenuta solo come storia.
`_legacy/poker_tracker.html` è il monolitico originale archiviato.

---

## Tipi dominio (`src/types/index.ts`)

Schema (riepilogo — vedi file per i campi esatti):

- **`User`**, **`NomeGiocatore`** — base.
- **`Sessione`** — partita in corso. Campi chiave:
  - meta: `data`, `ora_inizio`, `ora_fine`, `modalita: 'cash' | 'torneo'`, `buy_in`
  - stato: `stato: 'pre' | 'attivo' | 'pausa' | 'concluso'` (oggi usato dal solo torneo, ma settato a `'pre'` anche per cash da `creaSessione`)
  - torneo: `fiche_iniziali`, `num_giocatori_target`, `num_tavoli`, `durata_ore`, `livelli`, `late_reg`, `add_on`, `premi`, `premi_consolidati`, `livello_corrente`, `inizio_livello_ms`, `trascorso_ms`
  - giocatori: `giocatori: GiocatoreSessione[]`
- **`GiocatoreSessione`** — per giocatore in sessione attiva. Campi:
  - `id_nome`, `entrato`, `buy_in_pagato`
  - cash nuovo modello: `versato: number` (quanto è nel piatto, libero) e `entrata: number` (buy-in personale, default = `Sessione.buy_in`, editabile)
  - `extra_amt`, `extra_pagato`
  - `ricariche: Ricarica[]` (cash; `pagata` opzionale dopo v2), `rebuys: Ricarica[]` (torneo)
  - `soldi_ricevuti` (legacy cash), `fiches_finali` (cash)
  - torneo: `seat`, `add_on_fatto`, `add_on_pagato`, `eliminato`, `posizione_finale`, `elim_ts_ms`, `prize_pagato`
- **`Partita`** (storico), **`GiocatorePartita`** (per giocatore in
  partita salvata), **`Settlement`** (`{from, to, amount, pagato}`).
- **MULTIGIOCO (M1)** — tipi per i giochi non-poker (SPEC §4): **`GiocoLega`**
  (`{id,nome,preimpostato,foto?,accent?,attivo,pareggioComeVittoria}`),
  **`PartitaGioco`**, **`SessioneGioco`** (`stato:'pre'|'attiva'|'chiusa'`). Il poker
  NON usa questi tipi. Il catalogo `GiocoPreimpostato` vive in `utils/giochi.ts`.
- **`Lega`** — `nomi`, `partite`, `sessioneAttiva`, `serate_bg[]` + (M1, opzionali)
  `personale?`, `giochi?`, `sessioniGioco?`, `_sgid?` (poker implicito se assenti).
- **`Db`** — `{ leghe, _lid, _currentLegaId }` (persisted in localStorage).
- **Settlement UI**: `SettlementState`, `SettlementEntrato`, `SettlementAlloc`,
  più `CashSettlementResult`, `GiocatoreCalcolato`, `Trasferimento`.

---

## Store Zustand (`src/store/useStore.ts`)

Singleton store: tutto lo stato UI + il `db` persistito.

### UI state (non persistito tutto: `utente` da sessionStorage)
- `utente`, `nlFoto`
- `serataView: 'hub' | 'live' | 'setup' | 'chiusura'`
- `setupModalita`, `setupPartIds` (Set di id selezionati)
- `liveSubTab: 'orologio' | 'giocatori' | 'attivi' | 'premi'`
- `overlayOpen` (PartitaOverlay)
- `settlement: SettlementState | null`
- `storicoFrom/To`, `storicoOpen` (Set), `classificaFrom/To`
- `pendingPrizeNome` (modal premio torneo)
- `toastMsg`, `toastVisible`

### Persistenza
- `persist` middleware, key `pokerTracker_v2`
- `vanillaCompatStorage`: legge sia formato Zustand `{state: {db: ...}}` sia il
  formato vanilla `{leghe, _lid, _currentLegaId}` legacy.
- `partialize`: persiste solo `db` (UI state ricostruito a ogni avvio).

### Azioni (gruppi)

- **DB**: `saveLega`, `setCurrentLega`, `addLega`.
- **Auth**: `login`, `register`, `logout` (sessionStorage).
- **Overlay**: `openOverlay`, `closeOverlay`.
- **Serata view**: `setSerataView`.
- **Setup**: `setSetupModalita`, `toggleSetupPartId`, `clearSetupPartIds`, `setNlFoto`.
- **Serata hub**: `apriSerataAttiva(legaId, bgIdx)` (swap bg ↔ attiva), `annullaSessione`, `avviaSessione(legaId, sess)`.
- **Cash live**: `toggleEntrato`, `toggleBuyInPagato`, `setExtraAmt`,
  `toggleExtraPagato`, `aggiungiRicarica`, `modificaRicarica`,
  `toggleRicaricaPagata`, `setSoldiRicevuti`, `aggiornaFiches`,
  `addGiocatoreSessione`, `rimuoviGiocatoreSessione`.
  - `setVersato(legaId, idNome, val)`, `setEntrata(legaId, idNome, val)` (cash nuovo modello).
- **Torneo live timer**: `avviaTorneo`, `pausaTorneo`, `riprendiTorneo`,
  `avanzaLivelloAuto`, `avanzaLivelloManuale`, `stopTorneo`, `recoveryTorneo`.
- **Torneo live giocatori**: `torneoAggiungiGiocatore`, `torneoAddRebuy`,
  `torneoAddOn`, `torneoRevive`, `torneoToggleAddOnPag`, `torneoToggleRebuyPag`,
  `torneoElimina`, `confirmaPremio`.
- **Settlement / chiusura**: `apriChiusura`, `apriChiusuraTorneo`,
  `setAllocazione`, `confermaChiusura`.
  - Cash nuovo modello: `setTrasferimento`, `addTrasferimento`,
    `removeTrasferimento`, `saldaTuttiDebiti`.
- **Debiti**: `toggleSettlementPaid`, `saldaDebito`, `saldaTuttiDi`.
- **Storico**: `eliminaPartita`, `setStoricoFrom`, `setStoricoTo`, `toggleStoricoOpen`.
- **Classifica**: `setClassificaFrom`, `setClassificaTo`.
- **Migrazioni**: `runMigrations` (chiamata in `App.tsx` all'avvio).
- **Toast**: `toast(msg)`.

---

## Componenti per area

### `app/`
- `AppLayout.tsx` — layout della screen-app: hosts `BottomNav`,
  `<Outlet />` per i tab, `PartitaOverlay`, `FabPartiteAttive`, `FabDebiti`.
- `BottomNav.tsx` — 4 tab.
- `PartitaOverlay.tsx` — overlay a tutto schermo per la partita.
  Dispatch su `serataView`: `setup` → `<SetupForm/>`, `live` →
  `<LiveView/>`, `chiusura` → `<ChiusuraScreen/>`. Mostrato solo se
  `overlayOpen === true`.

### `serata/`
- `TabSerata.tsx` — tab principale, mostra `SerataHub` + bottone "Nuova
  partita" (apre overlay con `serataView='setup'`).
- `SerataHub.tsx` — card per ogni sessione esistente.
- `SetupForm.tsx` — form di setup serata (data, ora, modalità, buy-in,
  partecipanti, config torneo).
- `ConfigCash.tsx`, `ConfigTorneo.tsx` — sub-form modalità.
- `LiveView.tsx` — dispatcher su `modalita` → `LiveCash` o `LiveTorneo`.
- `LiveCash.tsx` — live view cash (sub-tab giocatori).
- `LiveTorneo.tsx` — live view torneo (sub-tab orologio/giocatori/attivi/premi).
- `SubGiocatoriCash.tsx`, `SubGiocatoriTorneo.tsx`, `SubAttivi.tsx`,
  `SubOrologio.tsx`, `SubPremi.tsx` — sub-tab.
- `PrizeModal.tsx` — modal "In the money" su eliminazione torneo.

### `settlement/`
- `ChiusuraScreen.tsx` — dispatcher cash/torneo.
- `ChiusuraCash.tsx` — chiusura cash (viste Cassa + Trasferimenti).
- `CassaView.tsx` — dettaglio del piatto (di chi sono i soldi).
- `ChiusuraTorneo.tsx` — chiusura torneo (vecchio modello, invariato).

### `common/`
- `Toast.tsx` — notifica in basso.
- `FabDebiti.tsx` — FAB con badge debiti pendenti.
- `FabPartiteAttive.tsx` — FAB basso-sx con elenco partite in corso.

### Altri
- `auth/LoginScreen.tsx`, `leghe/*`, `giocatori/TabPartecipanti.tsx`,
  `storico/TabStorico.tsx`, `classifica/TabClassifica.tsx`,
  `debiti/DebitiScreen.tsx` — auto-esplicativi.

---

## Hook chiave

- **`useCurrentLega()`** — selector `db.leghe.find(l => l.id === db._currentLegaId)`.
- **`useComputeLive(sess)`** / `computeLive(sess)` — pure function per cash.
  Ritorna `{ arr: LiveGiocatore[], leaderId }`. Calcola `dovuto`, `mancante`, `netto`.
  - `dovuto = (g.entrata ?? sess.buy_in) + ricariche`, `versato = g.versato`, `netto = fiche − dovuto`.
- **`useTimer()`** — driver del timer torneo (auto-advance livelli).

---

## Utility chiave

- **`format.ts`**: `oggi()`, `fmtData(s)`, `euro(n)`, `euroSigned(n)`, `esc(s)`, `getNome(lega, id)`, `numVal(el)`.
- **`calc.ts`**: `calcolaPremi`, `calcolaMontepremi`, `calcolaMontepremiIncassato`, `calcolaPremiPagati`, `consolidaPremiSeNecessario` (torneo).
- **`torneo.ts`**: `suggerisciTorneo`, `creaSessione`, `nuovoGiocatoreSessione`, `assegnaPostiCasuali`, `roundChipVal`.
- **`migrations.ts`**: `migrateSessione`, `migratePartita`, `migrateLega` (default campi
  multigioco) — idempotenti, in `runMigrations` (store) all'avvio. R/M2 ha **agganciato
  `migrateLega`** e crea la lega **Personale** (`personale.ts`) se assente.
- **`tema.ts`** (R/M2): `applyTema(giocoId)`/`temaPerGioco`/`accentPerGioco` — `data-tema`
  (poker=feltro | scuro) + `--accent` dinamico sul root (unica eccezione inline-style, §5).
- **`personale.ts`** (R/M2): `creaLegaPersonale(id)` — lega speciale "Personale" (§2).
- **`giochi.ts`** (M1): `GIOCHI_PREIMPOSTATI` (11 giochi, accenti = DESIGN_SPEC §4),
  `nuovoGiocoCustom`, `accentDaNome` (hash→HSL→hex deterministico).
- **`statsGiochi.ts`** (M1): `calcolaStatsGioco(gioco, sessioni, idNome)` — pura (SPEC §7):
  sessioni/partite chiuse, % vittorie, pareggio configurabile. Coperta da 8 test.
- **`sessioneGioco.ts`** (M3): costruttori + `esitoSessione` del ciclo sessione/partita
  non-poker — **pure**, stesse regole di `calcolaStatsGioco` (test di coerenza). Le azioni
  store sono in `useStore` (`creaSessioneGioco`/`avviaSessioneGioco`/`aggiungiPartita`/
  `chiudiPartita`/`chiudiSessioneGioco`/`eliminaSessioneGioco`).
- **`classifiche.ts`** (M4): `sommaStats` (somma conteggi + **% ricalcolata**, mai mediata),
  `classificaGioco` (standings + leader), `statsPersonaCrossContesto` (aggrega per nome su
  Personale + leghe). **Pure** + test. Usate da `LegaClassifica` e `ClassificaShell`.
- **`settlement.ts`**: `calcolaSettlement(players)` — funzione pura cash, §8 SETTLEMENT_SPEC. Coperta da `settlement.test.ts` (12 test §14).
- **`settlementTorneo.ts`**: `calcolaSettlementTorneo(entrati)` — funzione pura torneo: auto-compensa `contributo_residuo`↔`premio_residuo` dello stesso giocatore, poi greedy debiti→premi. Coperta da `settlementTorneo.test.ts` (5 test).

---

## Cose da NON toccare senza spec

- **Settlement torneo** (modello `contributo_residuo` / `premio_residuo`) — fuori scope di SETTLEMENT_SPEC.
- **`vanillaCompatStorage`** in `useStore.ts` — adapter retrocompat col formato vanilla. Romperlo significa perdere i dati degli utenti esistenti.
- **`calcolaSettlement`** (post-v2) — funzione pura coperta dai 9+ test §14. Cambi richiedono modifica anche di SETTLEMENT_SPEC.

---

## Roadmap

Vedi `CONTESTO.md` per il piano in corso. Fatto: migrazione React, settlement cash v2 +
torneo, serata programmata, tavoli T1–T3, **M1 multigioco** (modello + stats).
Prossimo: **R/M2** (design system + shell + Personale).
