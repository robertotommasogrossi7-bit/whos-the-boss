# ENTRATA per giocatore — prompt per chat di fase

> Estensione del branch `settlement-cash-v2` PRIMA del merge in `main`.
> Scopo: implementare il campo `entrata` per `GiocatoreSessione` (cash only),
> come previsto da `SETTLEMENT_SPEC.md §3`. Senza questa estensione, v2 non
> risolve il caso "Mario entra con 10 invece di 25".

## Operativa

Sei una chat di FASE (non chat base). Leggi prima:
1. `METODO.md` (sul desktop)
2. `CONTESTO.md` (in questa cartella)
3. `SETTLEMENT_SPEC.md` — il contratto. §3 (modello dati), §14 esempi 10-12 (test buy-in misti)

Working dir: `C:\Users\rober\Desktop\Programmi\poker\poker-react\`

## Branch

Lavora **direttamente sul branch esistente `settlement-cash-v2`** (NON creare un nuovo branch). Quando finisci, l'utente apre la chat di review e mergia v2 esteso in main.

```
git checkout settlement-cash-v2
git pull
```

## Cosa fare

### Problema risolto
Oggi v2 ha `versato: number` libero ma il `dovuto` è calcolato come
`Sessione.buy_in + ricariche` — uguale per tutti. Significa che se Mario
entra con 10 € invece dei 25 € di serata, l'app calcola `mancante = 15` e
`netto = fiche − 25`: ENTRAMBI sbagliati.

### Modello target
Ogni giocatore cash ha un proprio campo `entrata` (default = `Sessione.buy_in`,
editabile dall'admin). Il calcolo diventa:
```
dovuto   = g.entrata + sum(ricariche.importo)
mancante = max(0, dovuto − versato)
netto    = fiche − dovuto
```
Vedi `SETTLEMENT_SPEC.md §3` e §14 esempi 10/11/12.

## Micro-step (commit logici)

### Step 1 — Tipo + factory (1 commit)
- `src/types/index.ts`: aggiungi `entrata: number;` su `GiocatoreSessione`
  (subito dopo `versato`).
- `src/utils/torneo.ts`:
  - `nuovoGiocatoreSessione(idNome, buyInDefault?: number)`: setta
    `entrata: buyInDefault ?? 0` nel ritorno.
  - `creaSessione(...)`: dopo aver costruito `sess`, se modalita === 'cash',
    setta per ogni giocatore `g.entrata = g.entrata || buyIn`.
- **Niente cambi** ai consumer di `nuovoGiocatoreSessione`: il default può
  restare 0 e `creaSessione` setta il valore corretto in batch.

### Step 2 — Migrazione (1 commit)
- `src/utils/migrations.ts` → `migrateSessione`: in blocco `if (isCash)`, dopo
  il calcolo di `versato`, aggiungi:
  ```ts
  if ((g as { entrata?: number }).entrata === undefined) {
    g.entrata = s.buy_in ?? 0;
  }
  ```
- Idempotente: chiamata 2 volte non cambia il risultato.

### Step 3 — Calcolo `dovuto` con `entrata` (1 commit)
- `src/hooks/useComputeLive.ts`:
  ```ts
  const entrata = g.entrata ?? sess.buy_in;
  const dovuto  = g.entrato
    ? Math.round((entrata + ricaricheTot) * 100) / 100
    : 0;
  ```
- Aggiungi un test (`src/hooks/useComputeLive.test.ts` nuovo o esistente, da
  verificare) che usa giocatori con `entrata` ≠ `sess.buy_in` e controlla che
  `dovuto`, `mancante`, `netto` siano corretti.

### Step 4 — Test §14 buy-in misti (1 commit)
- `src/utils/settlement.test.ts`: aggiungi gli scenari `ES.10`, `ES.11`, `ES.12`
  della tabella §14 aggiornata. Nota: `calcolaSettlement` riceve `dovuto`
  precalcolato — i 3 nuovi test passano `dovuto` con valori derivati da
  `entrata + ricariche` (es. `dovuto: 10` per chi ha `entrata: 10` e zero
  ricariche).

### Step 5 — UI: edit di `entrata` in sub-tab giocatori cash (1 commit)
- `src/components/serata/SubGiocatoriCash.tsx`: aggiungi un input numerico
  per giocatore "entrato", etichettato "Entrata €". Valore = `g.entrata`,
  onChange chiama un'azione nuova nello store `setEntrata(legaId, idNome, val)`.
- `src/store/useStore.ts`: nuova azione `setEntrata`, identica a `setVersato`
  (clamp ≥ 0, arrotonda a 2 decimali, riscrive il giocatore).
- **Solo cash**: l'input NON va aggiunto in `SubGiocatoriTorneo`.

### Step 6 — Aggiorna `confermaChiusura` cash (1 commit)
- `src/store/useStore.ts` → blocco cash di `confermaChiusura`:
  ```ts
  entrate: sessG?.entrata ?? sa.buy_in,
  ```
  invece di `entrate: sa.buy_in`. Salva l'entrata REALE del giocatore nello
  storico, non quella di serata.

## Checklist fine fase (obbligatoria)

1. `npx tsc -b` → verde
2. `npm run lint` → verde
3. `npm test` → tutti verdi, **incluso ES.10/11/12** nuovi
4. `git push` dopo ogni commit (NON solo alla fine)
5. Messaggio finale all'utente con:
   - Elenco dei 6 micro-step completati
   - **Cosa testare in browser** (porta 5173):
     - apri una serata cash nuova con `Sessione.buy_in = 25`
     - aggiungi 2 giocatori, fai "entra"
     - modifica l'`entrata` di uno a 10
     - vai a chiusura: il suo `dovuto` deve essere 10 (non 25), il `mancante`
       e il `netto` devono riflettere il buy-in 10
     - caso bordo: cambia `entrata` durante la serata, verifica che la
       sub-tab giocatori cash si aggiorni
   - Indicazione "apri chat di review separata per il merge in main"
6. **NON mergiare** in main da questa chat.

## Cose da NON toccare

- `calcolaSettlement` (puro, già funzionante con i 9 test § esistenti).
- Il modello torneo (`contributo_residuo` / `premio_residuo`).
- `vanillaCompatStorage` in `useStore.ts`.

## Note implementative

- I 9 test §14 esistenti devono continuare a passare (regressione zero).
- I 3 nuovi test §14 (ES.10/11/12) verificano direttamente
  `calcolaSettlement` con input misti — la UI/store coverage la fa lo
  Step 5.
- `Partita.buy_in` (storico) NON cambia significato: resta il "buy-in di
  serata" come riferimento di default. `GiocatorePartita.entrate` (già
  esistente) diventa il valore reale.
