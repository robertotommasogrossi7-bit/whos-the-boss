# Who's the Boss? 👑

> Track who wins game night. A fast, no-friction app to log the games you play
> with friends — cards, board games, and poker — and find out who's *really* the boss.

🇮🇹 [Leggi in italiano](README.it.md)

![CI](https://github.com/robertotommasogrossi7-bit/whos-the-boss/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-8A63D2)

**Status:** ✅ **Working app**, in **closed testing on real Android devices** with a group of friends
from my town. React Native (Expo) + real accounts (Supabase). Game data lives on-device today;
**cross-device cloud sync is the piece I'm building now**. Built and tested in the open.

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
- **Real accounts, on-device data** — auth is real (Supabase); game data lives on-device
  (AsyncStorage) for now, so the app is fully usable offline.

## Screenshots

<!-- Drop the 4 PNGs into docs/screenshots/ and this section lights up. See docs/screenshots/README.md -->

| Home | Standings | Poker table | Debts |
|---|---|---|---|
| ![Home](docs/screenshots/home.png) | ![Standings](docs/screenshots/standings.png) | ![Poker live table](docs/screenshots/poker-table.png) | ![Debt settlement](docs/screenshots/debts.png) |

---

## How to try it

**See it running (fastest):** the app is currently in **closed testing** as a real Android build
(EAS) — reach out and I'll add you as a tester, or just look at the screenshots above.

**Run it yourself (for reviewers):**

```bash
pnpm install
pnpm dev:mobile   # Expo dev server — open on your phone with a dev build, or press "w" for web
```

```bash
pnpm test         # all shared-logic tests (Vitest, via Turbo) — 286 tests
pnpm typecheck    # TypeScript strict, no emit
pnpm build        # build all packages
```

Auth is real (Supabase, email + password). You can register a fresh account and start logging
games immediately — everything works offline, on-device.

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
- **External red teams before exposing work** — the sync layer was reviewed by fresh,
  uncontaminated AI reviewers; every finding was verified against the real code (see
  [`_processo/`](_processo/)).

So the commit history isn't just code — it's a record of *how* it was built. That's why the
process lives in the repo, under [`_processo/`](_processo/).

> **Built openly with AI — and proud of it.** The implementation is largely AI-written; I own
> the architecture, product decisions, UX and review. I'm not hiding it, I'm showcasing it —
> the commit history even credits the AI co-authors. This repo is as much about *the method* as
> about the app.

---

## Tech stack

| Layer | Tech |
|---|---|
| App | Expo (React Native) + Expo Router |
| UI | React 19 + TypeScript (strict) |
| State | Zustand (persist → AsyncStorage) |
| Backend | Supabase — Auth (email+password) + Postgres (schema-as-code, RLS) |
| Tests | Vitest — 286 tests on the shared logic |
| Styling | React Native `StyleSheet` (design tokens, dark theme + per-game accent) |
| Monorepo | pnpm workspaces + Turborepo (`packages/core` logic, `packages/state` store) |
| Delivery | EAS Build (Android) + EAS Update (OTA) |

Few dependencies on purpose: small bundle, logic shared cleanly between packages and the app.

## Project structure

```
whos-the-boss/          pnpm + Turborepo monorepo
├── apps/mobile/        the React Native app (Expo) — the product
├── packages/core/      pure shared logic (settlement, standings, sync mappers) + 286 tests
├── packages/state/     shared store (Zustand: createAppStore)
├── supabase/           database schema as code (migrations: profiles, unique username, RLS, sync)
├── docs/               screenshots & guides
├── _processo/          the live process log — decisions, specs, audits (the "how", in the open)
├── METODO.md           the AI-orchestration method (how this was built)
└── README.md / README.it.md / LICENSE
```

> The original vanilla-JS prototype and the frozen web version are preserved at git tags
> `archive/legacy-vanilla` and `archive/web-frozen` — kept out of `main` to keep the tree clean.

## Where it's at (and what's next)

**Done:** the whole app works natively — multi-game logging, poker cash & tournaments with a live
table and automatic debt settlement, cross-context standings, real Supabase accounts with unique
usernames and email confirmation. The relational cloud schema (13 tables, RLS) is applied, and the
local↔cloud **sync mapping layer** is written and covered by tests.

**Now:** wiring that sync layer to actually push/pull between devices — hardened first after two
external red teams (real-DB round-trip test, stable IDs on the money ledger, optimistic concurrency
on push).

**Next:** roles & sharing between accounts → realtime → a visual restyle → publish to the Play Store.

## License

MIT — see [LICENSE](LICENSE).

## Author

Roberto Grossi — [@robertotommasogrossi7-bit](https://github.com/robertotommasogrossi7-bit)
