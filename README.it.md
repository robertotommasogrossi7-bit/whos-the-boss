# Who's the Boss? 👑

> Segna chi vince la serata. Un'app veloce e senza attriti per registrare le partite
> che fai con gli amici — carte, giochi da tavolo e poker — e scoprire chi è *davvero* il boss.

🇬🇧 [Read in English](README.md)

**Stato:** 🚧 In sviluppo attivo — **pre-backend** (gira in locale, login demo, i dati
restano nel tuo browser). Costruita e testata allo scoperto.

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
- **Offline-first** — tutto in `localStorage`. Un backend vero (account, multi-dispositivo,
  ruoli) è in programma.

## Screenshot

> 📸 In arrivo — vedi [`docs/screenshots/`](docs/screenshots/) per quelli previsti.

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

Così la storia dei commit non è solo codice — è il racconto di *come* è stato costruito. Per
questo il processo fa parte del repo.

> **Costruita apertamente con l'AI — e ne vado fiero.** L'implementazione è in gran parte scritta
> dall'AI; io possiedo architettura, decisioni di prodotto, UX e review. Non lo nascondo, lo
> sfoggio — la storia dei commit accredita perfino i co-autori AI. Questo repo parla tanto del
> *metodo* quanto dell'app.

---

## Stack

| Livello | Tecnologia |
|---|---|
| Build | Vite 6 |
| UI | React 19 + TypeScript 5.8 (strict) |
| Stato | Zustand 5 (persist) |
| Routing | React Router 7 |
| Test | Vitest |
| Stile | CSS puro (design token / variabili CSS) |
| Persistenza | localStorage (backend Supabase in programma) |

## Avvio in locale

```bash
pnpm install
pnpm dev:mobile  # server Expo (apri in Expo Go)
```

Auth reale (Supabase, email + password); i dati di gioco restano sul dispositivo per ora (sync cloud in corso).

> La versione web originale (Vite + React) è archiviata al tag git `archive/web-frozen`, da quando il progetto è passato del tutto a React Native.

## Licenza

MIT — vedi [LICENSE](LICENSE).

## Autore

Roberto Grossi — [@robertotommasogrossi7-bit](https://github.com/robertotommasogrossi7-bit)
