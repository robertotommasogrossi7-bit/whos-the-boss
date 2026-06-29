# Poker Tracker — React

Migrazione React+TypeScript+Zustand+React Router v6 dell'app vanilla Poker Tracker.

## Requisiti

- Node.js ≥ 18
- npm ≥ 9

## Comandi

```bash
# Installa dipendenze
npm install

# Avvia server di sviluppo (http://localhost:5173)
npm run dev

# Build di produzione (output in dist/)
npm run build

# Anteprima build di produzione
npm run preview
```

## Stack

| Libreria | Versione | Ruolo |
|---|---|---|
| React | 19 | UI |
| TypeScript | 5 | Type safety |
| Vite | 6 | Build tool |
| Zustand | 5 | State management |
| React Router | 6 | Routing |

## Struttura

```
src/
├── components/
│   ├── auth/           # Login / registrazione
│   ├── app/            # AppLayout, BottomNav
│   ├── leghe/          # CircoliHome, NuovaLega, ListaLeghe
│   ├── giocatori/      # TabPartecipanti
│   ├── serata/         # TabSerata, LiveCash, LiveTorneo, Setup…
│   ├── settlement/     # ChiusuraScreen, ChiusuraCash, ChiusuraTorneo
│   ├── storico/        # TabStorico
│   ├── classifica/     # TabClassifica
│   ├── debiti/         # DebitiScreen
│   └── common/         # Toast
├── hooks/              # useComputeLive, useTimer
├── store/              # useStore (Zustand + persist)
├── types/              # Tipi dominio
├── utils/              # calc, format, migrations, torneo
└── styles/             # styles.css
```

## Dati

I dati vengono salvati in `localStorage` con la chiave `pokerTracker_v2`.
Il formato è retrocompatibile con la versione vanilla dell'app.
