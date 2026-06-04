# TAVOLI — Fase T1: funzione pura di bilanciamento + test (prompt per Sonnet)

> Prima fase della feature descritta in `TAVOLI_SPEC.md`. T1 = SOLO la **logica
> pura** di assegnazione/bilanciamento posti, con i test. **Nessuna UI, nessuna
> azione store, nessun routing** (quelli sono T2/T3). È il pezzo delicato: deve
> essere verde sui test prima di costruirci sopra.

## Operativa
Sei una chat di FASE. Leggi prima: `METODO.md` (desktop), `CONTESTO.md`,
`POKER_MAP.md`, e **`TAVOLI_SPEC.md`** (§4–§11: regole + esempi-test).
Working dir: `poker-react/`.

## Branch
```
git checkout main && git pull && git checkout -b tavoli-t1
```

## Cosa fare
Crea `src/utils/tavoli.ts` con DUE funzioni pure (no React, no store, no
`Date.now`) e `src/utils/tavoli.test.ts` con i test §11 dello SPEC.

### Tipi
```ts
export interface Posto  { tavolo: number; posto: number; } // posto 1..9
export interface Seduto { id_nome: number; seat: Posto | null; }
```

### Funzione A — assegnazione all'ingresso (lazy, §5)
```ts
export function assegnaPostoIngresso(seduti: Seduto[], idNuovo: number): Seduto[]
```
- Siede `idNuovo` nel **tavolo meno popolato**, primo posto libero.
- Se serve un tavolo in più (`tavoliNecessari` cresce), crealo e siedi lì.
- **NON sposta nessun altro** (all'ingresso si aggiunge soltanto).
- Es. (test 5): 9 già seduti al tavolo 1 + 1 nuovo → crea tavolo 2, nuovo lì
  → distribuzione 9/1, **0 spostamenti**.

### Funzione B — riequilibrio ottimale (§4, §7–§10)
```ts
export function riequilibraTavoli(seduti: Seduto[]): Seduto[]
```
- `tavoliNecessari(n) = max(1, ceil(n/9))`, capienza max 9.
- Distribuzione **equa** (differenza max 1 tra tavoli).
- Rispetta i vincoli §7: nessun tavolo ≤3 (4 tollerato), **minimizza gli
  spostamenti** rispetto all'input, mai più del ~40% dei giocatori spostati.
- Accorpa (rompi il tavolo più piccolo) se `tavoliNecessari` è sceso; ma se c'è
  un tavolo ≈2 smista prima quello (§9).
- "Spostamento" = un giocatore il cui `seat.tavolo` cambia rispetto all'input.

## Test obbligatori (`tavoli.test.ts`) — dalla tabella §11
Verifica, per ogni caso, **la distribuzione** (n. giocatori per tavolo, ordinata)
e dove indicato **il numero di spostamenti**:

- `riequilibraTavoli`:
  1. 10 da zero (seat null) → tavoli [5,5]
  2. 23 da zero → [8,8,7]
  3. 18 da zero → [9,9]
  4. 19 da zero → [7,6,6]
  6. disposizione 8/8/3 (n=19) → nessun tavolo ≤3, **esattamente 1 spostamento** (→ 8/7/4)
  7. disposizione 4/4/4 (n=12) → [6,6], spostati ≤ 40% (≤4)
  8. disposizione 9/9/2 (n=20) → 3 tavoli equi [7,7,6], smistando il tavolo da 2, spostamenti minimi
- `assegnaPostoIngresso`:
  5. 9 seduti al tavolo 1 + ingresso → distribuzione [9,1], **0 spostamenti**

> Se un caso ammette più output a pari spostamenti minimi, accetta qualunque
> purché distribuzione e vincoli §7 siano rispettati (scrivi i test
> sull'invariante: conteggi per tavolo + n. spostamenti, non sui posti esatti).

## Micro-step (commit logici)
1. tipi + `taboliNecessari` + `assegnaPostoIngresso` + relativi test
2. `riequilibraTavoli` (equa da zero) + test 1–4
3. riequilibrio con minimizzazione spostamenti + accorpamento + test 6,7,8

## Checklist fine fase
1. `npx tsc -b` verde
2. `npm run lint` verde
3. `npm test` → 20 esistenti + nuovi di `tavoli.test.ts` tutti verdi
4. push dopo ogni commit
5. NON mergiare in main: lascia il branch per la review.

## Cosa NON toccare
- Niente UI / store / routing (sono T2–T3).
- Poker esistente, settlement, `vanillaCompatStorage`.
- La funzione resta **pura e deterministica** (niente random/Date): se servisse
  un tie-break, usa l'ordine degli `id_nome`.
