# Who's the Boss? 👑

> Track who wins game night. A fast, no-friction app to log the games you play
> with friends — cards, board games, and poker — and find out who's *really* the boss.

🇮🇹 [Leggi in italiano](README.it.md)

**Status:** 🚧 In active development — **pre-backend** (runs locally, demo login,
data lives in your browser). Built and tested in the open.

---

## What it is

Open the app, pick a game, log your matches, look at the standings. That's the loop.

- **Two scopes** — **Personal** (just you and your friends as guests, zero setup) and
  **Leagues** (a shared roster with standings and history).
- **Any game** — a simple, money-free flow for cards / board games: start a session,
  log matches (participants, winners, draws, one-off game names), close the session
  with an outcome, browse the history.
- **Poker, done properly** — a dedicated mode with cash games & tournaments, a real
  tournament timer (blinds, late reg, add-ons, prizes, refresh-recovery), an automatic
  **debt-settlement engine** (who owes whom), and an interactive table (auto-seating,
  moves, balancing).
- **Standings** — per game, plus a personal cross-context view: how good are *you* at a
  game, across your solo games **and** all your leagues.
- **Offline-first** — everything in `localStorage`. A real backend (accounts, multi-device,
  roles) is planned.

## Screenshots

> 📸 Coming soon — see [`docs/screenshots/`](docs/screenshots/) for what's planned.

<!-- Uncomment as you add the images:
![Home](docs/screenshots/home.png)
![Standings](docs/screenshots/standings.png)
![Poker table](docs/screenshots/poker-table.png)
-->

---

## Why this repo is interesting: an AI-built project, in the open

This app doubles as a **real-world test of [Claude Code](https://www.anthropic.com/claude-code)** —
building a non-trivial app through a disciplined, AI-orchestrated workflow, on the most
realistic project I could find: my own.

The method (written up in **[`METODO.md`](METODO.md)**) in a nutshell:

- A **"base chat" orchestrates** — splits the work into phases, writes the spec for each,
  reviews the result and decides what to merge. It never writes the production code.
- **"Phase chats" implement** — one dedicated chat per phase, each on its own branch.
- **Spec-first for anything delicate** (money, calculations): a written contract with
  example-based tests, *before* any code.
- **Tests before UI**, **review in a separate chat before every merge**, **micro-commits**,
  **push after each commit**, **clean git history**.

So the commit history isn't just code — it's a record of *how* it was built. That's why the
process is part of the repo.

> **Built openly with AI — and proud of it.** The implementation is largely AI-written; I own
> the architecture, product decisions, UX and review. I'm not hiding it, I'm showcasing it —
> the commit history even credits the AI co-authors. This repo is as much about *the method* as
> about the app.

---

## Tech stack

| Layer | Tech |
|---|---|
| Build | Vite 6 |
| UI | React 19 + TypeScript 5.8 (strict) |
| State | Zustand 5 (persist) |
| Routing | React Router 7 |
| Tests | Vitest |
| Styling | Plain CSS (design tokens / CSS variables) |
| Persistence | localStorage (Supabase backend planned) |

Few dependencies on purpose: small bundle, and a codebase that ports cleanly to React Native later.

## Run it locally

```bash
pnpm install
pnpm dev:web     # http://localhost:5173
```

```bash
pnpm test        # all tests (Vitest, via Turbo)
pnpm lint        # ESLint
pnpm build       # type-check + production build
```

Demo login (any name) — your data stays in your browser.

## Project structure

```
whos-the-boss/   ← pnpm + Turborepo monorepo
├── apps/web/        ← the web app (Vite + React + TS) — frozen reference
├── apps/mobile/     ← the React Native app (Expo) — current target
├── packages/core/   ← shared logic (pure TS: settlement, standings, …) + tests
├── _legacy/         ← historical: the original monolith + the vanilla-JS split
├── METODO.md        ← the AI-orchestration method (how this was built)
├── README.md / README.it.md
└── LICENSE
```

## Roadmap (short)

- ✅ **Multi-game core** — data model + stats, design system + app shell, match-logging,
  standings (per game + personal cross-context).
- ⏭️ **Poker live money** (mid-game cash-out), **virtual table** (cash box, timers),
  **roles & permissions** (local base).
- 🔮 Rebranding, custom games, then a real **backend** (Supabase: accounts, multi-device).

## License

MIT — see [LICENSE](LICENSE).

## Author

Roberto Grossi — [@robertotommasogrossi7-bit](https://github.com/robertotommasogrossi7-bit)
