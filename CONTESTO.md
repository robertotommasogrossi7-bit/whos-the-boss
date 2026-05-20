# CONTESTO — poker-tracker

> Ogni chat base del progetto legge PRIMA questo file. Aggiornare quando cambia
> qualcosa di significativo (fase mergeata, spec nuovo, decisione importante).

## Cos'è
App React per tracciare serate di poker (cash + torneo) con amici. Multi-sessione
concorrente, settlement automatico, debiti tra giocatori, classifica per lega.

## Path
`C:\Users\rober\Desktop\Programmi\poker\` — `poker-react/` per l'app React.
Node in `C:\Program Files\nodejs` (se `npm` non è nel PATH, usa il path completo).

## Stack
Vite 6 + React 19 + TypeScript strict + Zustand (persist localStorage) +
React Router 7 + Vitest. ESLint flat config.

## File di riferimento (leggere quando servono)
- `POKER_MAP.md` — mappa del codice (struttura dati, dove sta cosa) — **OUTDATED**: descrive la versione vanilla JS, l'app attuale è React in `poker-react/`
- `SETTLEMENT_SPEC.md` — contratto del settlement cash (modello + algoritmo + 12 test §14, inclusi 3 buy-in misti)
- `ENTRATA_V2_PROMPT.md` — prompt per estendere `settlement-cash-v2` con campo `entrata` per giocatore (Step A del piano sotto)
- `SERATA_PROGRAMMATA_SPEC.md` — spec feature "orario d'inizio programmato + badge FAB-sx con azioni"
- `SERATA_PROGRAMMATA_PROMPT.md` — prompt per la fase che implementa la spec sopra (Step C del piano sotto)
- `REACT_MIGRATION_PROMPT.md` — piano di migrazione (storico)
- `README.md` — descrizione pubblica (architecture journey)

## Stato attuale (2026-05-20)

Su `main`: Fasi React 1-5 + Fase A (overlay partita). Settlement v2 **non ancora mergiato**.
TSC + lint + Vitest tutti verdi.

### Piano in corso — 4 step
Pianificato in chat base 2026-05-20 (questa). Vedi CONTESTO precedente al commit 34f2fcf per la storia.

1. **Step A — Estendere `settlement-cash-v2` con `entrata` per giocatore** (prima del merge)
   - Branch: `settlement-cash-v2` (esistente, ci si aggiunge sopra)
   - Prompt: `ENTRATA_V2_PROMPT.md`
   - Motivo: SETTLEMENT_SPEC §3 prevede `entrata` per giocatore (default = `Sessione.buy_in`, libero). v2 attualmente implementa solo `versato` libero — manca l'altro pezzo. Senza questo, "Mario entra con 10 invece di 25" calcola `mancante`/`netto` sbagliati.
   - Stato: prompt scritto, da lanciare in chat di fase nuova.

2. **Step B — Review e merge di `settlement-cash-v2` esteso**
   - Chat di review separata (Opus)
   - Rileggere SETTLEMENT_SPEC.md + diff `main...settlement-cash-v2`
   - Test manuale browser (porta 5173): caso "sa" (§7) + 3 esempi buy-in misti (§14 ES.10-12)
   - `git merge --no-ff` in `main`

3. **Step C — Fase nuova "serata-programmata"** (orario d'inizio + badge FAB-sx)
   - Branch: `serata-programmata` (DA `main` dopo merge v2)
   - Spec: `SERATA_PROGRAMMATA_SPEC.md`. Prompt: `SERATA_PROGRAMMATA_PROMPT.md`
   - Stato: spec+prompt scritti, da lanciare in chat di fase nuova DOPO Step B.

4. **Step D — Review e merge di `serata-programmata`**
   - Chat di review separata
   - Test manuale: 7 casi del SERATA_PROGRAMMATA_SPEC §6
   - `git merge --no-ff` in `main`

## Workflow del progetto
- Branch per ogni fase (es. `settlement-cash-v2`)
- Commit a checkpoint logici, **push dopo OGNI commit**
- Chat dedicata per ogni fase (Opus per logica delicata, Sonnet per resto)
- Review in chat Opus separata prima di mergiare in main
- Niente merge alla cieca

## Cose da NON toccare senza spec
- Settlement torneo (modello `contributo_residuo/premio_residuo`)
- `vanillaCompatStorage` in `src/store/useStore.ts` (legge localStorage vanilla, retrocompat)

## Comandi rapidi (in `poker-react/`)
```
npm run dev     # server dev, porta 5173
npm run lint    # ESLint
npm test        # Vitest
npx tsc -b      # build TS
```

## Roadmap (post-merge attuale)
1. Feature nuove in React web (tavoli virtuali, estrazione posti, vista spettatori, ecc.)
2. Backend Supabase (sblocca multi-dispositivo per vista spettatori)
3. React Native (Expo) per mobile
4. Tailwind: skippato per ora (deciso col modello mobile come obiettivo)

## Repo
GitHub privato: `https://github.com/robertotommasogrossi7-bit/poker-tracker`
