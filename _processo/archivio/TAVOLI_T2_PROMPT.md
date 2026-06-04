# TAVOLI — Fase T2: UI del tavolo + auto-assegnazione (prompt per Sonnet)

> Continuazione: **T1 è già mergiato in `main`** (`utils/tavoli.ts`:
> `assegnaPostoIngresso`, `riequilibraTavoli`, `tavoliNecessari` + test).
> Ora T2 = la **UI del tavolo** + assegnazione automatica del posto all'ingresso.
> Lo **spostamento manuale, il riequilibrio su uscita e l'aggiunta di nuovi
> giocatori in corso** sono T3 (fase successiva): NON farli ora.

## Operativa
Stessa chat: hai già letto METODO/CONTESTO/POKER_MAP/`TAVOLI_SPEC.md`. Riparti
da `main` aggiornato:
```
git checkout main && git pull && git checkout -b tavoli-t2
```
Rileggi `TAVOLI_SPEC.md` §1–§3 (schermata e dati).

## Obiettivo
Sostituire la vista "lista giocatori che entrano" con un **tavolo interattivo**:
- mostra **uno o più tavoli** (posti 1..9) con i giocatori **seduti**;
- per ogni seduto: **nome**, **dovuto** (entrata/buy-in + ricariche + add-on +
  rebuy) e **versato**;
- una zona "**da far entrare**" con i partecipanti selezionati ma non ancora
  entrati: toccando uno, **entra e viene seduto automaticamente** (usa
  `assegnaPostoIngresso` di T1).
- Per ora **senza fiche di gioco**.

## Micro-step
1. **Store — auto-seat all'ingresso** (`src/store/useStore.ts`):
   - Quando un giocatore passa a `entrato = true`, assegna il suo `seat`
     chiamando `assegnaPostoIngresso(seatsAttuali, idNome)` e salva i seat
     risultanti; aggiorna `sess.num_tavoli` = `tavoliNecessari(nEntrati)`.
   - Quando esce (`entrato = false`), libera il suo `seat` (= null). NON
     riequilibrare ora (è T3).
   - Vale sia per cash sia per torneo (il torneo già usa `seat`).
2. **Componente `TavoloView.tsx`** (`src/components/serata/`):
   - Render dei tavoli da `sess.giocatori` entrati con `seat`; griglia posti.
   - Mostra nome + dovuto + versato per seduto. Per i dati cash riusa
     `computeLive`/`useComputeLive` (dovuto/versato già calcolati lì); per il
     torneo usa i campi sessione (buy-in + rebuy + add-on).
   - Sezione "da far entrare": partecipanti con `entrato=false` → bottone entra.
3. **Integrazione**: usa `TavoloView` al posto della lista nella sub-tab
   giocatori (cash: `SubGiocatoriCash`; torneo: `SubGiocatoriTorneo`). Mantieni
   le azioni esistenti (ricariche, versato, ecc.) accessibili (es. tap sul
   giocatore apre i suoi controlli, o tienili sotto il tavolo).

## Checklist fine fase
1. `npx tsc -b` verde
2. `npm run lint` verde
3. `npm test` → tutti verdi (28, nessuna regressione)
4. push dopo ogni commit
5. **Cosa testare in browser** (porta 5173): crea una partita, fai entrare 1-2-…
   giocatori e verifica che si siedano automaticamente nel tavolo giusto (a 10
   compare il 2° tavolo); i soldi (dovuto/versato) sono corretti.
6. NON mergiare in main: lascia il branch per la review.

## Cosa NON toccare / rimandare a T3
- Spostamento manuale di posto/tavolo; riequilibrio su uscita (`riequilibraTavoli`
  su trigger); aggiunta di giocatori NUOVI alla lega in corso. → **T3**.
- Calcoli settlement, `vanillaCompatStorage`, le funzioni pure di `tavoli.ts`
  (usale, non modificarle).
