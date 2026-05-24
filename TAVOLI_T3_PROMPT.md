# TAVOLI — Fase T3: spostamenti + riequilibrio + giocatori in corso (prompt Sonnet)

> Continuazione: **T1 e T2 sono già in `main`** (`utils/tavoli.ts` con
> `assegnaPostoIngresso`/`riequilibraTavoli`/`tavoliNecessari`; `TavoloView` con
> auto-seat all'ingresso). T3 **chiude** la feature tavoli aggiungendo le
> interazioni manuali e il riequilibrio.

## Operativa
Stessa chat (hai già il contesto). Riparti da `main` aggiornato:
```
git checkout main && git pull && git checkout -b tavoli-t3
```
Rileggi `TAVOLI_SPEC.md` §6 (riallocazione manuale), §8 (riequilibrio), §9
(accorpamento), §2 (aggiunta giocatori).

## Obiettivo (3 cose)
1. **Spostamento manuale** di un giocatore in un altro posto/tavolo (override).
2. **Riequilibrio** dei tavoli usando `riequilibraTavoli` di T1 (su richiesta e
   come proposta quando un tavolo resta ≤3 dopo un'uscita).
3. **Aggiungere un giocatore NUOVO alla lega durante la sessione** e farlo
   entrare subito (con auto-seat).

## Micro-step
1. **Store — spostamento manuale** (`src/store/useStore.ts`):
   - `spostaGiocatore(legaId, idNome, tavolo, posto)`: imposta il `seat` del
     giocatore. Se il posto di destinazione è **occupato**, fai **swap** (i due
     giocatori si scambiano il posto). Override totale, nessun ricalcolo.
2. **Store — riequilibrio**:
   - `riequilibraSeat(legaId)`: prende i giocatori entrati, chiama
     `riequilibraTavoli`, salva i nuovi `seat` e aggiorna `num_tavoli`.
   - In `toggleEntrato` (uscita): dopo aver liberato il seat, **se** resta un
     tavolo con ≤3 giocatori, NON spostare in automatico ma segnala che serve un
     riequilibrio (es. un flag/derivato che la UI mostra). Il riequilibrio vero
     lo lancia l'utente (vedi step 3) → evita di spostare gente a sorpresa.
3. **UI in `TavoloView.tsx`**:
   - **Sposta**: tap su un giocatore seduto → modalità "sposta" → tap su un
     posto (libero o occupato → swap) → chiama `spostaGiocatore`.
   - **Bottone "Riequilibra tavoli"** → `confirm(...)` → `riequilibraSeat`.
     Evidenzialo quando c'è un tavolo ≤3.
   - **Aggiungi giocatore in corso**: campo nome + bottone. Riusa le azioni
     esistenti (`aggiungiGiocatore` per la rubrica se il nome è nuovo, poi
     `addGiocatoreSessione` / `torneoAggiungiGiocatore`); il nuovo giocatore poi
     entra con auto-seat (lo stesso percorso di `toggleEntrato`). Verifica nel
     codice quali azioni esistono e collega quelle giuste.

## Checklist fine fase
1. `npx tsc -b` verde
2. `npm run lint` verde
3. `npm test` → tutti verdi (28, nessuna regressione)
4. push dopo ogni commit
5. **Cosa testare in browser** (5173):
   - sposta un giocatore su un posto libero e su uno occupato (swap);
   - fai uscire qualcuno finché un tavolo va a ≤3 → compare l'invito a
     riequilibrare → premi "Riequilibra" e verifica che si spostino **poche**
     persone;
   - aggiungi un giocatore mai visto durante la sessione e fallo sedere.
6. NON mergiare in main: lascia il branch per la review.

## Cosa NON toccare
- Le funzioni pure di `utils/tavoli.ts` (usale, non modificarle).
- Calcoli settlement, `vanillaCompatStorage`, modello soldi.
