# Prompt per la nuova chat — Migrazione React

> Copia tutto il contenuto sotto la riga nella nuova chat. Le fasi sono pensate per stare ognuna in una singola sessione, in modo da non sforare i limiti di token.

---

## CONTESTO

Sto migrando una web app esistente da HTML+JS vanilla a React. L'app è un tracker per serate di poker (cash + torneo) con tornei full-featured (timer, struttura blind, premi, late reg, add-on, eliminazioni in zona premi, settlement post-partita, debiti aperti tra giocatori, classifica per lega, multi-sessione concorrente).

**Percorso del progetto:** `C:\Users\rober\Desktop\Programmi\poker\`

**Stato attuale (codice da migrare):**
- `index.html` — markup statico + onclick handlers
- `css/styles.css` — 1100 righe di CSS funzionante
- `js/` — 16 file JS modulari (config, auth, data, calc, ui, leghe, giocatori, session-hub, session-setup, session-cash, session-tournament, session-premi, settlement, storico, classifica, debiti). Totale ~3500 righe.

**Mappa del progetto (LEGGI PRIMA DI INIZIARE):**
- `POKER_MAP.md` — schema dati completo (Lega, Sessione, GiocatoreSessione, Partita), elenco funzioni per file, variabili globali, logiche chiave. Costa ~6K token ma ti risparmia di leggere tutti i .js.

**Cartelle da ignorare:**
- `_legacy/` — vecchio file HTML monolitico, non usare
- `Altro/`, `Partite_giocate/` — file utente, non toccare

---

## STACK SCELTO

- **Vite + React + TypeScript** (target: web, ma codice scritto pensando alla futura migrazione a React Native via Expo)
- **Zustand** per state management (con middleware `persist` per localStorage)
- **React Router v6** per navigazione tra schermate
- **CSS attuale**: copia `styles.css` in `src/styles/styles.css` e applica le classi esistenti ai componenti React. **NON riscrivere lo style ora.** Però:
  - Usa solo `className="..."` con classi semantiche dal CSS esistente
  - **NIENTE inline `style={{...}}`** nei componenti (rende dolorosa la futura migrazione a Tailwind)
  - Se hai bisogno di varianti di stile, aggiungi modificatori CSS (es. `card card--gold`), non props inline
  - Obiettivo: domani potrò fare `find/replace` delle classi → Tailwind utility classes in modo meccanico
- **TypeScript**: definisci le interfaces da POKER_MAP.md (Lega, Sessione, GiocatoreSessione, Partita, GiocatorePartita) in `src/types/index.ts`

---

## WORKFLOW GIT (obbligatorio)

Il progetto è su GitHub: `https://github.com/robertotommasogrossi7-bit/poker-tracker.git`
Branch principale: `main`. **L'utente conserva ogni fase su un branch separato** per fare un controllo finale di tutte le fasi insieme prima di unirle.

**All'inizio di ogni fase:**
```bash
git checkout main
git pull
git checkout -b react-fase-N    # es. react-fase-1, react-fase-2, ...
```

**Importante:** ogni fase costruisce sulla precedente. L'utente al termine di ogni fase fa il merge in `main` (`git merge react-fase-N --no-ff`). Se ti rendi conto che `main` NON contiene il lavoro della fase precedente (es. l'utente ha deciso di tenere tutto separato), allora dopo lo step "checkout -b" fai anche `git merge react-fase-(N-1) --no-ff` per importare il lavoro precedente. **Verifica sempre con `git log main --oneline | head -5`** prima di iniziare a scrivere codice.

**Commit a checkpoint logici:**
```bash
git add .
git commit -m "Fase N - <area>: <cosa hai fatto>"
```
Non serve un commit per ogni singolo micro-step: raggruppare 2-4 micro-step correlati in un commit coerente va bene (es. "i 3 file utils" = un commit). 3-6 commit a fase è la granularità giusta.

**Push dopo OGNI commit, sempre — OBBLIGATORIO:**
```bash
git push -u origin react-fase-N
```
Subito dopo ogni `git commit`, fai `git push`. Visto che i commit sono pochi, pushare ognuno costa pochissimo e azzera il rischio di perdere lavoro se i token finiscono a metà fase. Il primo push crea il branch remoto (`-u`), i successivi sono `git push` semplici. **Non aspettare mai la fine della fase per pushare.**
Poi DICI all'utente: "Fase N pushata sul branch `react-fase-N`. Apri una nuova chat per il controllo, poi torna qui per la fase N+1."
**NON fare merge in main** — lo fa l'utente alla fine di tutte le fasi.

**Se durante la fase scopri un bug nelle fasi precedenti**, non risolverlo in questo branch: prendi nota e segnalalo all'utente a fine fase.

---

## REGOLE DI LETTURA (anti-bug)

Il codice è splittato in 16 file, ma le interazioni tra file esistono. Per evitare bug ai confini:

1. **All'inizio di ogni fase, leggi nell'ordine:**
   - `POKER_MAP.md` (sempre, è la bussola)
   - **TUTTI** i file `.js` legati alla fase, non solo i "principali" (es. nella Fase 5 leggi `session-cash.js`, `session-tournament.js`, `session-premi.js`, ma anche `calc.js` per le funzioni montepremi che riusi)
   - I tipi già definiti in `src/types/index.ts`
2. **Cerca i punti di contatto**: prima di scrivere codice, fai un `grep` delle funzioni che hai deciso di implementare per vedere CHI le chiama in altri file. Esempio: prima di implementare `apriChiusura`, cerca `apriChiusura(` in tutti i .js per vedere da dove parte.
3. **In caso di dubbio chiedi all'utente**, non indovinare. Meglio una domanda in più che un bug da debuggare a 3 fasi di distanza.
4. **A fine fase, diff manuale**: chiedi all'utente di aprire l'app vanilla (`index.html`) e l'app React fianco a fianco, e di testare il flusso che hai appena migrato. Lista i comportamenti chiave da verificare.

---

## REGOLE DI MIGRAZIONE

1. **Comportamento identico**: l'app React deve fare ESATTAMENTE quello che fa l'app vanilla. Niente nuove feature, niente refactoring "creativo".
2. **Una funzione vanilla → un hook o un componente**: mantieni la stessa granularità. Non fondere logica diversa.
3. **State globale solo in Zustand**: le variabili `_*` di `config.js` diventano slice dello store. Niente `useContext` fai-da-te.
4. **Funzioni pure (calc.js)**: traduzione 1:1 in `src/utils/calc.ts`. Esporta come named exports.
5. **localStorage**: usa `zustand/middleware/persist` con chiave `'pokerTracker_v2'` (stessa di adesso, così i dati esistenti vengono caricati).
6. **Migrazioni dati**: `migrateSessione` e `migratePartita` da `data.js` vanno preservate, eseguite all'avvio.
7. **Onclick → onClick handlers**: in React-ese.
8. **render*Html → componenti**: ogni funzione `renderXxx` diventa un componente `<Xxx />`. Niente più stringhe HTML.
9. **Italiano**: nomi di variabili, file, componenti restano in italiano (sessioneAttiva, renderPartitaForm…). Sono nomi di dominio, non tradurli.
10. **Niente library extra non richieste**: no date-fns, no lodash, no animation libraries. La vanilla version non ne usa, e nemmeno questa.

---

## STRUTTURA TARGET

```
poker-react/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── src/
│   ├── main.tsx                 ← entry point
│   ├── App.tsx                  ← router root
│   ├── types/
│   │   └── index.ts             ← interfaces (Lega, Sessione, …)
│   ├── store/
│   │   ├── useStore.ts          ← Zustand store + persist
│   │   └── slices/              ← slice per area (auth, ui, serata, settlement…)
│   ├── utils/
│   │   ├── calc.ts              ← calcoli torneo (montepremi, premi…)
│   │   ├── format.ts            ← euro, fmtData, esc…
│   │   └── migrations.ts        ← migrateSessione, migratePartita
│   ├── hooks/
│   │   └── useCurrentLega.ts    ← derived state hook
│   ├── components/
│   │   ├── common/              ← Toast, Modal, FabDebiti…
│   │   ├── auth/                ← LoginScreen, RegisterForm…
│   │   ├── leghe/               ← CircoliHome, NuovaLega, ListaLeghe…
│   │   ├── app/                 ← AppLayout, BottomNav
│   │   ├── giocatori/           ← TabPartecipanti
│   │   ├── serata/              ← SerataHub, SetupForm, …
│   │   ├── cash/                ← LiveCash, SubGiocatori, SubAttivi
│   │   ├── torneo/              ← LiveTorneo, SubOrologio, SubGiocatoriTorneo, SubPremi, PrizeModal
│   │   ├── settlement/          ← ChiusuraCash, ChiusuraTorneo
│   │   ├── storico/             ← StoricoList, StoricoCard
│   │   ├── classifica/          ← Classifica
│   │   └── debiti/              ← DebitiScreen, DebitoRow
│   └── styles/
│       └── styles.css           ← copia 1:1 dal vecchio styles.css
```

---

## FASI (ognuna in una sessione separata)

### **Fase 1 — Setup, types, store, utils** (sessione 1)

**Branch:** `react-fase-1`

**Micro-step:**
1. **1.1 — Scaffolding** Vite+TS+React in `C:\Users\rober\Desktop\Programmi\poker-react\` (`npm create vite@latest`), install dipendenze base. Commit "1.1 scaffold".
2. **1.2 — Dipendenze extra:** `npm install zustand react-router-dom`. Commit "1.2 deps".
3. **1.3 — TypeScript strict** in `tsconfig.json` (`strict: true`, `noUncheckedIndexedAccess: true`). Commit "1.3 tsconfig".
4. **1.4 — Struttura cartelle:** crea `src/types/`, `src/store/`, `src/utils/`, `src/components/`, `src/hooks/`, `src/styles/`. Copia `css/styles.css` in `src/styles/styles.css`. Importa in `main.tsx`. Commit "1.4 folders + css".
5. **1.5 — Tipi:** crea `src/types/index.ts` con `Lega`, `Sessione`, `GiocatoreSessione`, `Partita`, `GiocatorePartita`, `Settlement`, `Premio`, `Livello`, ecc. — copia 1:1 da POKER_MAP.md. Commit "1.5 types".
6. **1.6 — Utils format:** `src/utils/format.ts` con `euro`, `euroSigned`, `fmtData`, `oggi`, `esc`, `numVal`, `getNome` (da `calc.js` parte utils). Commit "1.6 format".
7. **1.7 — Utils calc:** `src/utils/calc.ts` con `calcolaMontepremi`, `calcolaMontepremiIncassato`, `calcolaPremiPagati`, `calcolaPremi`. Commit "1.7 calc".
8. **1.8 — Migrations:** `src/utils/migrations.ts` con `migrateSessione` e `migratePartita` (da `data.js`). Commit "1.8 migrations".
9. **1.9 — Zustand store:** `src/store/useStore.ts` con stato `db` (leghe, _lid, _currentLegaId), `ui` (tutte le variabili `_*` di config.js), e azioni (`saveLega`, `setCurrentLega`, `setSerataView`, `setStoricoFilter`, ecc.). Middleware `persist` su chiave `'pokerTracker_v2'`. **Importante:** il `partialize` salva solo `db`, non lo stato UI temporaneo. Commit "1.9 store".
10. **1.10 — App.tsx Hello World** che mostra `useStore(s => s.db.leghe.length) + ' leghe nel localStorage'`. Verifica che legge il localStorage esistente del progetto vanilla. Commit "1.10 hello world".
11. **1.11 — Test utente:** `npm run dev`, apri browser, verifica che vedi il count corretto delle leghe esistenti. Se OK, push del branch.

**Letture richieste:** POKER_MAP.md, `js/config.js`, `js/data.js`, `js/calc.js`.

---

### **Fase 2 — Auth, routing, schermate "circoli"** (sessione 2)

**Branch:** `react-fase-2` (creato da `main`, NON da `react-fase-1` — l'utente farà merge solo alla fine)

**Micro-step:**
1. **2.1 — Router setup:** `react-router-dom` v6 in `App.tsx` con route placeholder `/login`, `/circoli`, `/nuova-lega`, `/leghe`, `/app/:legaId`, `/debiti`, `/chiusura`. Commit "2.1 router".
2. **2.2 — Toast globale:** `<Toast />` in `components/common/Toast.tsx` collegato allo store (azione `toast(msg)`). Render in `App.tsx`. Commit "2.2 toast".
3. **2.3 — Auth slice nello store:** funzioni `login`, `register`, `logout`, `getUser` (sessionStorage chiave `'pokerTrackerUser_v2'`). Commit "2.3 auth".
4. **2.4 — `<LoginScreen />`** in `components/auth/LoginScreen.tsx` con tabs Login/Registrati, Enter key → submit. Commit "2.4 login".
5. **2.5 — `<CircoliHome />`** in `components/leghe/CircoliHome.tsx` con saluto, hero cards "Nuova lega" / "Le tue leghe", widget "Serate in corso". Commit "2.5 circoli".
6. **2.6 — `<NuovaLega />`** in `components/leghe/NuovaLega.tsx`: foto picker, nome, partecipanti dinamici, bottone crea. Commit "2.6 nuova lega".
7. **2.7 — `<ListaLeghe />`** in `components/leghe/ListaLeghe.tsx`: lista card con stats (serate, vittorie, netto utente loggato). Commit "2.7 lista leghe".
8. **2.8 — Hook `useCurrentLega()`** in `src/hooks/useCurrentLega.ts` che ritorna la lega corrente dallo store. Commit "2.8 hook".
9. **2.9 — Auto-redirect:** in `App.tsx`, all'avvio, se loggato → `/circoli`, altrimenti `/login`. Commit "2.9 auto redirect".
10. **2.10 — Test utente:** login → vedi circoli → crea lega → entri (anche se vuota dentro). Push.

**Letture richieste:** POKER_MAP.md, `js/auth.js`, `js/leghe.js`.

---

### **Fase 3 — App layout, partecipanti, storico, classifica** (sessione 3)

**Branch:** `react-fase-3` (da `main`)

**Micro-step:**
1. **3.1 — `<AppLayout />`** in `components/app/AppLayout.tsx` con header (back, nome lega, meta), `<Outlet />` per tab, `<BottomNav />`, `<FabDebiti />`. Commit "3.1 layout".
2. **3.2 — `<BottomNav />`** con 4 tab (Partecipanti, Serata, Storico, Classifica), gestione stato attivo. Commit "3.2 bottom nav".
3. **3.3 — `<TabPartecipanti />`** in `components/giocatori/TabPartecipanti.tsx`: lista giocatori, aggiungi (form), elimina. Commit "3.3 partecipanti".
4. **3.4 — Slice storico nello store:** azioni `setStoricoFrom/To`, `toggleStoricoOpen`, `eliminaPartita`, `toggleSettlementPaid`. Commit "3.4 storico actions".
5. **3.5 — `<TabStorico />`** con filtri date, accordion per card, tabella ranking per partita. Commit "3.5 storico".
6. **3.6 — Slice classifica:** azioni `setClassificaFrom/To`. Commit "3.6 classifica actions".
7. **3.7 — `<TabClassifica />`** con filtri date, ranking aggregato, medaglie top 3. Commit "3.7 classifica".
8. **3.8 — `<FabDebiti />`** con badge contatore debiti aperti calcolato live. Commit "3.8 fab".
9. **3.9 — `<DebitiScreen />`** in `components/debiti/DebitiScreen.tsx`: lista debiti aperti, toggle pagato/non pagato. Commit "3.9 debiti".
10. **3.10 — Test utente:** entri in una lega esistente con dati → vedi i partecipanti, lo storico delle partite vecchie, la classifica, i debiti. Push.

**Letture richieste:** POKER_MAP.md, `js/giocatori.js`, `js/storico.js`, `js/classifica.js`, `js/debiti.js`, `js/ui.js`.

---

### **Fase 4 — Serata Hub + Setup** (sessione 4)

**Branch:** `react-fase-4` (da `main`)

**Micro-step:**
1. **4.1 — `<TabSerata />`** dispatcher su `serataView`. Commit "4.1 dispatcher".
2. **4.2 — `<SerataHub />`** in `components/serata/SerataHub.tsx`: hero "Nuova serata" + card per ogni sessione attiva (compreso `serate_bg`). Commit "4.2 hub".
3. **4.3 — Azione `apriSerataAttiva(bgIdx)`** nello store: swap sessione attiva ↔ background. Commit "4.3 swap".
4. **4.4 — Azione `annullaSessione()`** nello store: rimuove sessione attiva, promuove prima bg. Commit "4.4 annulla".
5. **4.5 — `<SetupForm />`** in `components/serata/SetupForm.tsx`: data, ora, toggle modalità, pillole partecipanti. Commit "4.5 setup base".
6. **4.6 — `<ConfigCash />`** sub-componente: solo input buy-in. Commit "4.6 config cash".
7. **4.7 — `<ConfigTorneo />`** sub-componente: tutti i campi (buy-in, n. giocatori, durata, fiche, struttura livelli, late reg, add-on). Commit "4.7 config torneo".
8. **4.8 — `suggerisciTorneo` + `roundChipVal`** come utility pure in `utils/torneo.ts`. Commit "4.8 suggerimenti".
9. **4.9 — `avviaSessione()`** azione: crea oggetto sessione, sposta vecchia in bg se presente, set `serataView='live'`. Commit "4.9 avvia".
10. **4.10 — `<LiveCash />` placeholder** che mostra "Sessione attiva: cash/torneo" — sarà riempito nella fase 5. Commit "4.10 live placeholder".
11. **4.11 — Test utente:** crea due serate diverse, vedi entrambe nell'hub, swappi tra loro. Push.

**Letture richieste:** POKER_MAP.md, `js/session-hub.js`, `js/session-setup.js`.

---

### **Fase 5 — Live Cash + Live Torneo + Premi** (sessione 5)

**Branch:** `react-fase-5` (da `main`)

**Micro-step:**
1. **5.1 — Hook `useComputeLive(lega)`** in `src/hooks/useComputeLive.ts` con `useMemo` (da `computeLive` in session-cash.js). Commit "5.1 compute live".
2. **5.2 — `<LiveCash />`** struttura: header sommario, sub-tabs Giocatori/Attivi, bottom bar. Commit "5.2 cash shell".
3. **5.3 — `<SubGiocatoriCash />`**: aggiungi giocatore, toggle entrato, buy-in, extra. Commit "5.3 sub giocatori".
4. **5.4 — `<SubAttivi />`**: ricariche (add/edit/toggle pagata), soldi ricevuti, fiches finali, netto live, mancante. Commit "5.4 sub attivi".
5. **5.5 — `<LiveTorneo />`** struttura: header, sub-tabs Orologio/Giocatori/Premi. Commit "5.5 torneo shell".
6. **5.6 — Hook `useTimer(sessione)`** in `src/hooks/useTimer.ts`: `useEffect` con `setInterval` 1s, recovery dopo refresh (calcola tempo passato da `inizio_livello_ms`). Commit "5.6 timer hook".
7. **5.7 — `<SubOrologio />`**: timer card, blinds correnti/prossimi, banner late reg, stats mini bar, controlli (avvia/pausa/avanza/stop). Commit "5.7 orologio".
8. **5.8 — `<SubGiocatoriTorneo />`**: card per giocatore con seat, stato, buy-in, rebuy, add-on, eliminazione. Commit "5.8 sub giocatori torneo".
9. **5.9 — `consolidaPremiSeNecessario` + `<SubPremi />`** con barra Incassato/Pagato/Da incassare. Commit "5.9 premi".
10. **5.10 — `torneoElimina` + `<PrizeModal />`**: assegna posizione, mostra modal se in zona premi, gestisce caso "ultimo rimasto = vincitore". Commit "5.10 elim + modal".
11. **5.11 — Azioni torneo nello store:** `avviaTorneo`, `pausaTorneo`, `riprendiTorneo`, `avanzaLivelloAuto/Manuale`, `stopTorneo`, `torneoAddRebuy`, `torneoAddOn`, `torneoRevive`, ecc. Commit "5.11 azioni torneo".
12. **5.12 — Test utente:** gioca una serata cash completa + un torneo completo (incluso eliminazione in zona premi). Push.

**Letture richieste:** POKER_MAP.md, `js/session-cash.js`, `js/session-tournament.js`, `js/session-premi.js`, `js/calc.js`.

---

### **Fase 6 — Settlement + verifica finale** (sessione 6)

**Branch:** `react-fase-6` (da `main`)

**Micro-step:**
1. **6.1 — Slice settlement nello store:** stato `_settlement` (con `isTorneo`, `arr`, `losers`, `winners`, `neutri`, `allocazioni`). Commit "6.1 slice".
2. **6.2 — Azione `apriChiusura()`**: per cash calcola losers=mancante>0, winners=netto>0, auto-alloca greedy. Commit "6.2 apri cash".
3. **6.3 — Azione `apriChiusuraTorneo()`**: forza consolidamento, assegna posizioni residue, calcola contributo_residuo/premio_residuo, auto-alloca. Commit "6.3 apri torneo".
4. **6.4 — `<ChiusuraCash />`** in `components/settlement/ChiusuraCash.tsx`: tabella allocazioni, toggle "pagato adesso", ricalcolo live. Commit "6.4 chiusura cash".
5. **6.5 — `<ChiusuraTorneo />`** in `components/settlement/ChiusuraTorneo.tsx`: stesso schema ma campi torneo. Commit "6.5 chiusura torneo".
6. **6.6 — Azione `confermaChiusura()`**: costruisce oggetto `Partita`, deriva `settlements`, popola `pagamenti_effettuati/ricevuti`, salva in `lega.partite`, svuota `sessioneAttiva`, promuove prima `serate_bg`. Commit "6.6 conferma".
7. **6.7 — `<ChiusuraScreen />`** route `/chiusura` con dispatcher cash vs torneo. Commit "6.7 chiusura route".
8. **6.8 — Build production:** `npm run build`, verifica che non dia errori TS/lint. Commit "6.8 build ok".
9. **6.9 — README.md** breve con istruzioni: `npm install`, `npm run dev`, `npm run build`. Commit "6.9 readme".
10. **6.10 — Test finale completo:** lega nuova da zero → aggiungi giocatori → cash completa → torneo completo → chiusura entrambi → storico → classifica → debiti. Push.

**Letture richieste:** POKER_MAP.md, `js/settlement.js`.

---

## DOPO LE 6 FASI

L'utente fa un controllo finale di tutti i 6 branch insieme (`git log --all --oneline --graph`), poi sceglie come unirli — probabilmente squash merge di ogni branch in `main`. A quel punto la migrazione vanilla → React è completa.

**Cosa viene dopo (NON in queste 6 fasi):**
- Migrazione styles.css → Tailwind (find/replace meccanico grazie alle regole di stile imposte)
- Backend Supabase per multi-utente
- Migrazione web → React Native con Expo
- Nuove feature (es. galleria foto, sezioni speciali, statistiche avanzate, ecc.)

---

## NOTE FINALI

- **Token efficiency**: a inizio di OGNI fase, leggi prima `POKER_MAP.md`. È molto più economico che rileggere i .js.
- **Quando hai dubbi sul comportamento**, leggi il .js corrispondente (es. dubbi su settlement → `js/settlement.js`).
- **Non leggere `_legacy/poker_tracker.html`** — è il vecchio file monolitico, già splittato e non aggiornato.
- **Quando finisci una fase**, aggiorna `POKER_MAP.md` con un breve log "Fase N completata: …" alla fine.
- **Domande all'utente**: solo se davvero bloccante. Per le scelte tecniche, scegli tu il default ragionevole.
- **Stile React**: function components + hooks. Niente class components.
- **Tipi**: usa `interface` per oggetti dati, `type` per union/intersection. `strict: true` in tsconfig.

Buon lavoro!
