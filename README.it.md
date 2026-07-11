# Who's the Boss? 👑

> Segna chi vince la serata. Un'app veloce e senza attriti per registrare le partite
> che fai con gli amici — carte, giochi da tavolo e poker — e scoprire chi è *davvero* il boss.

🇬🇧 [Read in English](README.md)

![CI](https://github.com/robertotommasogrossi7-bit/whos-the-boss/actions/workflows/ci.yml/badge.svg)
![Licenza: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Costruita con Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-8A63D2)

**Stato:** ✅ **App funzionante**, in **testing chiuso su veri dispositivi Android** con un gruppo di
amici del mio paese. React Native (Expo) + account veri (Supabase). I dati di gioco stanno sul
dispositivo per ora; **il sync cloud multi-dispositivo è il pezzo che sto costruendo adesso**.
Costruita e testata allo scoperto.

---

## Cos'è

Apri l'app, scegli un gioco, segni le partite, guardi le classifiche. È tutto qui.

- **Due ambiti** — **Personale** (tu e i tuoi amici come "guest", zero configurazione) e
  **Leghe** (una rubrica condivisa, con classifiche e storico).
- **Qualsiasi gioco** — un flusso semplice e senza soldi per carte / giochi da tavolo: apri
  una sessione, segni le partite (partecipanti, vincitori, pareggi, nomi di giochi una
  tantum), chiudi la sessione con un esito, sfogli lo storico.
- **Poker, fatto bene** — una modalità dedicata con cash e tornei, un vero timer da torneo
  (bui, late reg, add-on, premi, recupero al refresh), un **motore di settlement** automatico
  (chi deve cosa a chi) e un tavolo interattivo (posti automatici, spostamenti, riequilibrio).
- **Classifiche** — per gioco, più una vista personale cross-contesto: quanto sei bravo a un
  gioco, tra le tue partite da solo **e** in tutte le tue leghe.
- **Account veri, dati sul dispositivo** — l'auth è reale (Supabase); i dati di gioco restano
  sul dispositivo (AsyncStorage) per ora, quindi l'app è pienamente usabile offline.

## Screenshot

<!-- Metti i 4 PNG in docs/screenshots/ e questa sezione si accende. Vedi docs/screenshots/README.md -->

| Home | Classifica | Tavolo poker | Debiti |
|---|---|---|---|
| ![Home](docs/screenshots/home.png) | ![Classifica](docs/screenshots/standings.png) | ![Tavolo poker live](docs/screenshots/poker-table.png) | ![Settlement debiti](docs/screenshots/debts.png) |

---

## Come provarla

**Vederla girare (più veloce):** l'app è in **testing chiuso** come vera build Android (EAS) —
scrivimi e ti aggiungo come tester, oppure guarda gli screenshot qui sopra.

**Eseguirla tu (per chi rivede il codice):**

```bash
pnpm install
pnpm dev:mobile   # server Expo — apri sul telefono con una dev build, o premi "w" per il web
```

```bash
pnpm test         # tutti i test della logica condivisa (Vitest, via Turbo) — 286 test
pnpm typecheck    # TypeScript strict, senza emit
pnpm build        # build di tutti i pacchetti
```

Auth reale (Supabase, email + password). Puoi registrare un account nuovo e iniziare subito a
segnare partite — tutto funziona offline, sul dispositivo.

---

## Perché questo repo è interessante: un progetto costruito con l'AI, allo scoperto

Quest'app è anche un **test sul campo di [Claude Code](https://www.anthropic.com/claude-code)** —
costruire un'app non banale con un workflow disciplinato e orchestrato dall'AI, sul progetto
più realistico che avessi: il mio.

Il metodo (scritto in **[`METODO.md`](METODO.md)**) in breve:

- Una **"chat base" orchestra** — divide il lavoro in fasi, scrive lo spec di ognuna, controlla
  il risultato e decide cosa mergiare. Non scrive mai il codice di produzione.
- Le **"chat di fase" implementano** — una chat dedicata per fase, ciascuna sul suo branch.
- **Design prima del codice** per la roba delicata (soldi, calcoli): un contratto scritto con
  esempi-test, *prima* di scrivere codice.
- **Test prima della UI**, **review in una chat separata prima di ogni merge**, **micro-commit**,
  **push dopo ogni commit**, **storia git pulita**.
- **Red team esterni prima di esporre il lavoro** — il layer di sync è stato rivisto da revisori
  AI freschi e non contaminati; ogni finding è stato verificato sul codice reale (vedi
  [`_processo/`](_processo/)).

Così la storia dei commit non è solo codice — è il racconto di *come* è stato costruito. Per
questo il processo vive nel repo, sotto [`_processo/`](_processo/).

> **Costruita apertamente con l'AI — e ne vado fiero.** L'implementazione è in gran parte scritta
> dall'AI; io possiedo architettura, decisioni di prodotto, UX e review. Non lo nascondo, lo
> sfoggio — la storia dei commit accredita perfino i co-autori AI. Questo repo parla tanto del
> *metodo* quanto dell'app.

---

## Stack

| Livello | Tecnologia |
|---|---|
| App | Expo (React Native) + Expo Router |
| UI | React 19 + TypeScript (strict) |
| Stato | Zustand (persist → AsyncStorage) |
| Backend | Supabase — Auth (email+password) + Postgres (schema-as-code, RLS) |
| Test | Vitest — 286 test sulla logica condivisa |
| Stile | `StyleSheet` React Native (design token, tema scuro + accento per gioco) |
| Monorepo | pnpm workspaces + Turborepo (`packages/core` logica, `packages/state` store) |
| Rilascio | EAS Build (Android) + EAS Update (OTA) |

Poche dipendenze di proposito: bundle piccolo, logica condivisa in modo pulito tra i pacchetti e l'app.

## Struttura del progetto

```
whos-the-boss/          monorepo pnpm + Turborepo
├── apps/mobile/        l'app React Native (Expo) — il prodotto
├── packages/core/      logica condivisa pura (settlement, classifiche, mapper di sync) + 286 test
├── packages/state/     store condiviso (Zustand: createAppStore)
├── supabase/           schema del database come codice (migration: profili, username univoco, RLS, sync)
├── docs/               screenshot e guide
├── _processo/          il diario di processo — decisioni, spec, audit (il "come", allo scoperto)
├── METODO.md           il metodo di orchestrazione con l'AI (come è stata costruita)
└── README.md / README.it.md / LICENSE
```

> Il prototipo originale in vanilla-JS e la versione web congelata sono conservati ai tag git
> `archive/legacy-vanilla` e `archive/web-frozen` — tenuti fuori da `main` per una root pulita.

## A che punto è (e cosa manca)

**Fatto:** l'app funziona tutta in nativo — segna-partita multi-gioco, poker cash e tornei con
tavolo live e settlement automatico dei debiti, classifiche cross-contesto, account Supabase veri
con username univoci e conferma email. Lo schema relazionale cloud (13 tabelle, RLS) è applicato, e
il **layer di mapping** locale↔cloud è scritto e coperto da test.

**Adesso:** agganciare quel layer per fare davvero push/pull tra dispositivi — irrobustito prima
dopo due red team esterni (test round-trip su DB reale, ID stabili sul registro dei soldi,
controllo di concorrenza sul push).

**Prossimo:** ruoli e condivisione tra account → realtime → restyle grafico → pubblicazione sul Play Store.

## Licenza

MIT — vedi [LICENSE](LICENSE).

## Autore

Roberto Grossi — [@robertotommasogrossi7-bit](https://github.com/robertotommasogrossi7-bit)
