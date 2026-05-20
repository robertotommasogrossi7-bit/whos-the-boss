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
- `POKER_MAP.md` — mappa del codice (struttura dati, dove sta cosa)
- `SETTLEMENT_SPEC.md` — contratto del settlement cash (modello + algoritmo + 9 test §14)
- `REACT_MIGRATION_PROMPT.md` — piano di migrazione e regole git
- `README.md` — descrizione pubblica (architecture journey)

## Stato attuale
Su `main`: Fasi React 1-5 + Fase A (overlay partita) + Fase B (settlement cash nuovo modello).
TSC + lint + Vitest tutti verdi al momento dell'ultimo merge.

**In sospeso**: branch `settlement-cash-v2` (Fase B settlement cash nuovo modello).
Implementazione conclusa, TSC + lint + 9/9 test Vitest verdi. Review interna fatta
nella chat precedente. **Da fare in chat di review nuova**: rileggere
SETTLEMENT_SPEC.md + diff `main...settlement-cash-v2`, test manuale browser
(porta 5173) — il caso "sa" (§7 spec) è il check chiave — poi `git merge --no-ff`.
L'utente ha già notato alcuni errori dal test browser e li elencherà nella chat
di review.

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
