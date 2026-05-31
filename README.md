# Card Tracker

> A React app to organize and track the games you play with friends.
> It started as a home-poker tracker (cash & tournament, with automatic debt
> settlement and a full tournament timer) and is evolving into a **multi-game
> tracker** — poker plus card and tabletop games, each with sessions, matches,
> standings and history.

**Status:** 🚧 Active development. The poker tracker is complete and in
production; the multi-game transformation ("Card Tracker") is in progress.

---

## What it does

**Poker (today, complete):**
- Cash games and tournaments, runnable in parallel (multi-session).
- Real tournament timer: blind structure, auto-advance, pause/resume, recovery
  after a browser refresh, late registration, add-on and prize pools.
- Automatic **settlement engine**: who owes whom after the game, with a model
  that handles per-player buy-ins and partial contributions.
- Persistent debt tracking across sessions, per-league standings.
- Interactive table view: auto-seating, manual moves, table balancing.
- Fully offline (localStorage, no backend required).

**Multi-game (in progress):** a common, money-free flow for any game — open a
session, log matches (players, winners/losers), and get per-game and global
standings. Personal "quick" mode (guest players, no accounts) and shared leagues.

---

## Tech stack

| Layer | Technology |
|---|---|
| Build | Vite 6 |
| UI | React 19 + TypeScript 5.8 (strict) |
| State | Zustand 5 (persist middleware) |
| Routing | React Router 7 |
| Tests | Vitest |
| Styling | Plain CSS (design tokens / CSS variables) |
| Persistence | localStorage (Supabase backend planned) |

Minimal dependencies on purpose: the goal is a tiny bundle and a codebase that
ports cleanly to React Native later.

---

## Getting started

```bash
cd poker-react
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm test         # Vitest
npm run lint     # ESLint
npx tsc -b       # TypeScript build
```

---

## Architecture journey

The interesting part of this repo is **how it evolved** — the commit history
follows it.

1. **Monolith** (`_legacy/poker_tracker.html`) — one ~4500-line HTML file,
   vanilla JS, `localStorage`. It shipped, but it didn't scale.
2. **Modular vanilla split** (`_legacy/`) — one `index.html`, one stylesheet, and
   16 JS modules organized by domain, with a strict load order and zero duplicate
   declarations.
3. **React migration** (`poker-react/`, production target) — typed,
   component-based (React 19 + TypeScript strict + Zustand). A custom storage
   adapter reads the vanilla `localStorage` format transparently, so existing
   data migrates on the fly.

The `_legacy/` folder is kept as a historical snapshot of stages 1–2.

---

## Project structure

```
poker/
├── poker-react/        ← React app (Vite + TS) — production target
│   └── src/
│       ├── types/      ← TS interfaces
│       ├── store/      ← Zustand store + vanilla-compat adapter
│       ├── hooks/      ← useCurrentLega, useComputeLive, useTimer
│       ├── utils/      ← calc, format, migrations, settlement, tables
│       └── components/ ← per-domain UI folders
├── _legacy/            ← historical reference (monolith + vanilla split)
├── README.md
└── LICENSE
```

---

## Built with AI

This project has been built with significant help from Claude (Anthropic).
The role split: **human** owns architecture, requirements, UX and code review;
**AI** drafts implementation and does refactors and cross-file consistency
audits. Money logic is specified as a written contract with example-based tests
before any code is written.

---

## License

MIT — see [LICENSE](LICENSE).

## Author

Roberto Grossi — [@robertotommasogrossi7-bit](https://github.com/robertotommasogrossi7-bit)
