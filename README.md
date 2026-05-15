# Poker Tracker

> Web app per organizzare e tracciare serate di poker (cash & torneo) con gli amici. Settlement automatico dei debiti, classifica per lega, timer torneo completo con struttura blind, late reg, add-on e premi.

**Status:** 🚧 In active development — currently migrating from vanilla JS to React (Phase 1 of 6 complete).

---

## Why this project

This started as a "weekend hack" to replace the WhatsApp + Excel mess that follows every home poker night with friends. It grew into a complete tournament management app with:

- Multi-session support (you can run a cash game and a tournament in parallel)
- Real tournament timer with auto-advance, pause/resume, recovery after browser refresh
- Late registration + add-on logic with theoretical/cashed prize pool tracking
- "In the money" prize modal during elimination
- Settlement engine that computes who owes whom after the game (greedy allocation)
- Persistent debts tracking across sessions
- Multi-league support (one app, many friend groups)
- Full offline support (localStorage, no backend)

---

## Architecture journey

The interesting part of this repo is **how it evolved**, which is also why the commit history is worth a look.

### Stage 1 — Monolith (`_legacy/poker_tracker.html`)

The first version was a single 4500-line HTML file: HTML + inline `<style>` + inline `<script>`. Vanilla JS, zero dependencies, just `localStorage` for persistence. It worked. It even shipped.

But adding features got harder. Reading the file got harder. AI assistants started struggling with the token cost of reading it.

### Stage 2 — Modular vanilla split (`index.html` + `js/*.js` + `css/styles.css`)

The monolith was split into:
- 1 `index.html` (markup + onclick handlers only)
- 1 `styles.css` (~1100 lines)
- 16 `.js` modules organized by domain: `config`, `auth`, `data`, `calc`, `ui`, `leghe`, `giocatori`, `session-hub`, `session-setup`, `session-cash`, `session-tournament`, `session-premi`, `settlement`, `storico`, `classifica`, `debiti`

Script load order respects a strict dependency chain (config → auth → data → calc → ui → features), every file declares `'use strict'`, and onclick handlers in the markup map cleanly to top-level functions. A cross-file audit verified zero duplicate declarations, zero dangling references, zero orphan onclick handlers.

### Stage 3 — React migration (in progress)

Now being migrated to a typed component-based stack while preserving the exact UX:
- **Vite + React 19 + TypeScript** (strict mode)
- **Zustand** with `persist` middleware on the same `localStorage` key as the vanilla version → existing users' data migrates transparently via a custom storage adapter that detects vanilla format and converts it on the fly
- Component structure that mirrors the JS module structure

The migration is divided into 6 phases, each on its own branch (`react-fase-1` through `react-fase-6`). Each phase has 10–12 micro-steps with one commit each, so the history shows the work clearly.

### What's next (Stage 4+)

- Tailwind CSS migration (mechanical find/replace, prepared by avoiding inline styles)
- Supabase backend for multi-user / multi-device sync
- React Native (Expo) port for iOS + Android, sharing most of the codebase

---

## Tech stack

| Layer | Technology |
|---|---|
| Build | Vite 6 |
| UI | React 19 + TypeScript 5.8 (strict) |
| State | Zustand 5 (persist middleware) |
| Routing | React Router 7 |
| Styling | Plain CSS for now (Tailwind planned) |
| Persistence | localStorage (Supabase planned) |

Zero runtime dependencies beyond the four above. No date-fns, no lodash, no UI kit — the goal is to keep the bundle tiny and the dependencies minimal until they're actually needed.

---

## Getting started

### Vanilla version (legacy, fully working)
Just open `index.html` in any modern browser. No build step.

### React version (work in progress)
```bash
cd poker-react
npm install
npm run dev
```
Then open http://localhost:5173.

The React app automatically reads existing data from the vanilla app's `localStorage` (same origin), so no manual migration is needed when running in production on the same domain.

---

## Project structure

```
poker/
├── index.html               ← vanilla entry point
├── css/styles.css           ← vanilla styles (~1100 lines)
├── js/                      ← 16 modular vanilla JS files
├── poker-react/             ← React migration (Vite + TS)
│   ├── src/
│   │   ├── types/           ← TS interfaces (Lega, Sessione, …)
│   │   ├── store/           ← Zustand store + vanilla-compat adapter
│   │   ├── utils/           ← calc, format, migrations
│   │   ├── components/      ← per-domain folders
│   │   └── styles/          ← copied from vanilla
│   └── package.json
├── _legacy/                 ← original 4500-line monolith
├── POKER_MAP.md             ← canonical project map (data shapes, functions, screens)
└── REACT_MIGRATION_PROMPT.md ← migration plan: 6 phases, 60+ micro-steps
```

`POKER_MAP.md` is worth a look — it's a compact reference of the data schema, key functions per file, and recent significant changes. It exists primarily so AI assistants (and future me) can navigate the codebase efficiently.

---

## Working with AI

This project has been built with significant assistance from Claude (Anthropic). Commit messages reflect this transparently when relevant. The role split has been:
- **Human:** architecture decisions, feature requirements, code review, UX choices
- **AI:** implementation drafts, refactoring at scale, cross-file consistency audits

`REACT_MIGRATION_PROMPT.md` is the engineering plan that drives the React phase: each AI session reads it as the contract for what to build, with strict rules on git workflow (push every 3–4 commits to avoid losing work mid-session), file-reading order (anti-bug), and styling conventions (no inline styles, to keep the future Tailwind migration mechanical).

---

## License

MIT — see [LICENSE](LICENSE) file.

---

## Author

Roberto Tommaso Grossi — [@robertotommasogrossi7-bit](https://github.com/robertotommasogrossi7-bit)
