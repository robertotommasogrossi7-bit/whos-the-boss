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

**Deliverable:**
- Progetto Vite+TS+React scaffoldato in `C:\Users\rober\Desktop\Programmi\poker-react\`
- `package.json` con dipendenze: react, react-dom, react-router-dom, zustand
- `tsconfig.json` configurato (strict mode)
- `src/types/index.ts` con tutte le interfaces da POKER_MAP.md
- `src/utils/calc.ts`, `format.ts`, `migrations.ts` — traduzione 1:1 da `calc.js` + parti di `data.js`
- `src/store/useStore.ts` con Zustand + persist middleware su chiave `'pokerTracker_v2'`
- Store contiene: `db` (leghe, _lid, _currentLegaId), `ui` (_serataView, _setupModalita, _storicoOpen, _classificaFrom/To, ecc.), e azioni come `saveLega`, `setCurrentLega`, `setSerataView`, ecc.
- `src/styles/styles.css` copiato da `css/styles.css`
- App "Hello World" che gira con `npm run dev`

**A fine sessione:** verifica che `npm run dev` non dia errori e che lo store si popoli leggendo dal localStorage esistente.

---

### **Fase 2 — Auth, routing, schermate "circoli"** (sessione 2)

**Deliverable:**
- React Router con route: `/login`, `/circoli`, `/nuova-lega`, `/leghe`, `/app/:legaId`, `/debiti`, `/chiusura`
- Componente `<LoginScreen />` con tabs Login/Registrati (da `auth.js`)
- `<CircoliHome />` con la lista delle leghe attive + widget "Serate in corso" (da `leghe.js`)
- `<NuovaLega />` form (da `leghe.js`)
- `<ListaLeghe />` con stats per lega (da `leghe.js`)
- `<Toast />` componente globale collegato allo store
- Hook `useCurrentLega()` che ritorna la lega corrente dallo store

**A fine sessione:** dovresti poter fare login → vedere circoli → creare una lega → entrarci (anche se la lega è ancora vuota dentro).

---

### **Fase 3 — App layout, partecipanti, storico, classifica** (sessione 3)

**Deliverable:**
- `<AppLayout />` con `<BottomNav />` (4 tab) e `<FabDebiti />`
- Tab 1: `<TabPartecipanti />` (da `giocatori.js`) — aggiungi/elimina giocatori
- Tab 3: `<TabStorico />` con filtri date + accordion card (da `storico.js`)
- Tab 4: `<TabClassifica />` con filtri date e medaglie (da `classifica.js`)
- `<DebitiScreen />` (da `debiti.js`) raggiunta dal FAB

**A fine sessione:** entrando in una lega vedi le 4 tab funzionanti, lo storico mostra le partite (anche quelle salvate prima nel localStorage), la classifica si aggiorna.

---

### **Fase 4 — Serata Hub + Setup** (sessione 4)

**Deliverable:**
- Tab 2: `<TabSerata />` con dispatcher su `serataView`: `'hub' | 'live' | 'setup'`
- `<SerataHub />` (da `session-hub.js`) — card per ogni sessione attiva + bottone "Nuova serata"
- Logica `apriSerataAttiva` per swappare sessioni in background
- `<SetupForm />` (da `session-setup.js`):
  - Selettore data/ora
  - Toggle cash/torneo
  - `<ConfigCash />` e `<ConfigTorneo />` (con generazione automatica struttura blind, late reg, add-on)
  - Pillole partecipanti
  - Bottone "Inizia serata"
- `<LiveCash />` placeholder (riempito nella fase successiva)

**A fine sessione:** dovresti poter creare una nuova serata cash, aprirla, vederla nell'hub e poter swappare tra serate in background.

---

### **Fase 5 — Live Cash + Live Torneo + Premi** (sessione 5)

**Deliverable:**
- `<LiveCash />` completo (da `session-cash.js`):
  - Sub-tab Giocatori (aggiungi, entra, buy-in, extra, rimuovi)
  - Sub-tab Attivi (ricariche, soldi ricevuti, fiches, netto live, mancante)
  - Hook `useComputeLive(lega)` come `useMemo` su giocatori
- `<LiveTorneo />` completo (da `session-tournament.js`):
  - Sub-tab Orologio con timer countdown (`useEffect` + `setInterval`, recovery dopo refresh)
  - Sub-tab Giocatori con seat assignment, rebuy, add-on, eliminazione
  - Controlli avvia/pausa/riprendi/avanza/stop torneo
- `<SubPremi />` (da `session-premi.js`):
  - Struttura premi calcolata sul monte teorico
  - Barra Incassato/Pagato/Da incassare
- `<PrizeModal />` per eliminazione in zona premi
- `consolidaPremiSeNecessario` come funzione utility

**A fine sessione:** una serata cash o torneo completa (apri, gioca, segna pagamenti, elimina giocatori, premi).

---

### **Fase 6 — Settlement + Polish + verifica finale** (sessione 6)

**Deliverable:**
- `<ChiusuraCash />` (da `settlement.js`):
  - losers = mancante > 0, winners = netto > 0
  - Auto-allocazione greedy
  - Possibilità di marcare singoli pagamenti come effettuati
- `<ChiusuraTorneo />` (da `settlement.js`):
  - Basato su contributo_residuo / premio_residuo
- `confermaChiusura` che salva in `lega.partite` e svuota sessioneAttiva
- Test manuale completo: crea una lega da zero, gioca una serata cash, gioca un torneo, controlla storico, classifica, debiti
- Build di produzione (`npm run build`) funzionante
- README.md con istruzioni rapide

**A fine sessione:** app React completa e identica per comportamento alla vanilla. Pronto per il prossimo step (Tailwind, Supabase, React Native).

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
