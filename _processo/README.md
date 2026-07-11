# `_processo/` — the process log (in the open)

This folder is the **living record of how the app is built** — not the code, but the *decisions*,
*specs*, *reviews* and *metrics* behind it. It's public on purpose: the repo showcases an
AI-orchestrated workflow (see [`../METODO.md`](../METODO.md)), and the process is half the story.

**Start here:**
- **`CONTESTO.md`** — the single source of truth on where the project stands and what's next. Any new
  chat reads this first.
- **`DECISIONI.md`** — the decision log (one line per choice, with the date and the *why*).

**By type:**
- **Specs** (`*_SPEC.md`) — written contracts for delicate features (money, settlement, tables…),
  with example-based tests, written *before* the code.
- **Audits & red teams** — `AUDIT_R6_R7.md`, `REVISIONE-ESTERNA.md`, `REDTEAM-R72-SYNC.md`:
  multi-agent and external reviews, each finding verified against the real code.
- **`R7_SCHEMA.md`** — the living map between the app's local data model and the relational cloud schema.
- **`METRICHE.md`** — token/time log (this build is also an experiment in AI-assisted development).
- **`MAPPA_CODICE.md`** — a compact index of where each feature lives in the code.
- **`archivio/`** — closed/superseded docs, kept for history.
