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
- `POKER_MAP.md` — mappa del codice React (routing, store Zustand, componenti per area, hook, utility, cose da non toccare)
- `SETTLEMENT_SPEC.md` — contratto del settlement cash (modello + algoritmo + 12 test §14, inclusi 3 buy-in misti). **Implementato e mergiato in main.**
- `SERATA_PROGRAMMATA_SPEC.md` — spec feature "orario d'inizio programmato + badge FAB-sx con azioni" (Step C, prossimo)
- `SERATA_PROGRAMMATA_PROMPT.md` — prompt per la fase che implementa la spec sopra (Step C del piano sotto)
- `ENTRATA_V2_PROMPT.md` — prompt dello Step A (già completato e mergiato; tenuto come storico)
- `IDEE.md` — bozza dei cambiamenti futuri GRANDI (tavolo interattivo, multi-gioco): il "perché" e il "quando", con lo spartiacque del backend
- `REACT_MIGRATION_PROMPT.md` — piano di migrazione (storico)
- `README.md` — descrizione pubblica (architecture journey)

## Stato attuale (2026-05-22)

Su `main`: Fasi React 1-5 + Fase A (overlay) + settlement cash v2 + `entrata`
per giocatore + fix settlement torneo + **serata programmata** (merge `7139c36`)
+ **rimozione codice morto** (merge `83722ef`). TSC + lint verdi, **20/20 test**.

**Prossimi passi**: (a) unificare 3 funzioni duplicate residue (avvio torneo,
saldaTutti, coda confermaChiusura) → vedi `CLEANUP_PROMPT.md` (chat Sonnet);
(b) feature multi-gioco → SPEC in `MULTIGIOCO_SPEC.md` (fasi M1–M5), design in `IDEE.md`.
- **Cash**: modello `versato`/`dovuto` con viste Cassa + Trasferimenti. Ogni
  giocatore ha `entrata` editabile (buy-in personale) → risolve "non posso
  modificare il buy-in delle persone".
- **Torneo**: auto-compensazione `contributo_residuo`↔`premio_residuo` dello
  stesso giocatore (funzione pura `calcolaSettlementTorneo`). Un vincitore che
  non ha versato il buy-in non genera più un pagamento verso sé stesso (prima
  usciva un trasferimento V→V); riceve il premio al netto del proprio buy-in.

**Branch**: solo `main` (più i `claude/*` dell'ambiente). I branch di fase
mergiati sono stati cancellati (locale+remoto) dopo il merge — il codice resta
tutto in `main`. Il vecchio approccio settlement scartato è conservato nel tag
`archive/settlement-rework` (recuperabile se mai servisse).

### Piano in corso — 4 step (A e B completati)

1. ✅ **Step A — `entrata` per giocatore** — FATTO. Branch `settlement-cash-v2`,
   6 commit `feat(entrata)` Step 1-6. Prompt: `ENTRATA_V2_PROMPT.md`.

2. ✅ **Step B — Review + merge v2 in main** — FATTO (chat base, merge `9c423f3`).
   Review: tsc+lint verdi, 15/15 test verdi, coerenza con SETTLEMENT_SPEC §3/§14.
   ⚠️ **Test manuale browser NON ancora fatto dall'utente** (caso "sa" §7 + i 3
   buy-in misti). Da verificare visivamente alla prossima occasione.

3. ✅ **Step C — serata programmata** (orario + badge + WaitingPanel) — FATTO (merge `7139c36`)
   - Branch: `serata-programmata` (DA `main` aggiornato)
   - Spec: `SERATA_PROGRAMMATA_SPEC.md`. Prompt: `SERATA_PROGRAMMATA_PROMPT.md`
   - Stato: spec+prompt pronti, da lanciare in chat di fase (Sonnet).

4. **Step D — Review e merge di `serata-programmata`**
   - Chat di review separata
   - Test manuale: 7 casi del SERATA_PROGRAMMATA_SPEC §6
   - `git merge --no-ff` in `main`

## Workflow del progetto
- Branch per ogni fase (es. `serata-programmata`), cancellato dopo il merge
  (il codice resta in `main`; eventuale lavoro scartato si archivia in un tag)
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
1. Step C — serata programmata (orario + badge): prossimo, spec+prompt pronti
2. Tavolo interattivo locale (riusa `seat`/`assegnaPostiCasuali`) — vedi `IDEE.md`
3. Backend Supabase (lo "spartiacque": sblocca spettatori, dati personali, ruoli)
4. Vista spettatori del tavolo + multi-gioco pieno + ruoli/permessi (post-backend) — vedi `IDEE.md`
5. React Native (Expo) per mobile
6. Tailwind: skippato per ora (deciso col modello mobile come obiettivo)

> I due cambiamenti GRANDI (tavolo interattivo, multi-gioco) sono descritti in
> dettaglio in `IDEE.md`, col ragionamento sul momento migliore per ciascuno.

## Repo
GitHub privato: `https://github.com/robertotommasogrossi7-bit/poker-tracker`
