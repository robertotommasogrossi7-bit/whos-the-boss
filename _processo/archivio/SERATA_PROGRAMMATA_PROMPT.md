# SERATA PROGRAMMATA — prompt per chat di fase

> Implementa la feature descritta in `SERATA_PROGRAMMATA_SPEC.md`.
> **Da aprire SOLO DOPO** che `settlement-cash-v2` (esteso con `entrata`)
> è stato mergiato in `main`.

## Operativa

Sei una chat di FASE (non chat base). Leggi prima:
1. `METODO.md` (sul desktop)
2. `CONTESTO.md` (in questa cartella)
3. `SERATA_PROGRAMMATA_SPEC.md` — la spec di questa fase

Working dir: `C:\Users\rober\Desktop\Programmi\poker\poker-react\`

## Branch

```
git checkout main
git pull
git checkout -b serata-programmata
```

## Cosa fare

Vedi `SERATA_PROGRAMMATA_SPEC.md` per il modello completo. In sintesi:

1. La sessione nasce in `stato: 'pre'` (già così).
2. In stato `'pre'`, mostra un `WaitingPanel` al posto della LiveView, con
   3 azioni: **Annulla**, **Inizia ora**, **Modifica setup**.
3. Il badge `FabPartiteAttive` mostra l'orario programmato se `stato === 'pre'`.

## Micro-step (commit logici)

### Step 1 — Utility format (1 commit)
- `src/utils/format.ts`: aggiungi `nowHHMM(): string` (es. "21:35") e
  `fmtRelativeDate(data: string): string` (restituisce "oggi", "domani",
  "DD/MM/YYYY" se più lontana).
- Test rapidi inline (Vitest se utile).

### Step 2 — Store: azioni transizione (1 commit)
- `src/store/useStore.ts`: aggiungi
  - `iniziaOra(legaId)`: setta `sessioneAttiva.stato = 'attivo'`,
    `ora_inizio = nowHHMM()`. Per torneo: setta anche
    `inizio_livello_ms = Date.now()`.
  - `modificaSetup(legaId)`: setta `serataView: 'setup'`, copia i valori
    della `sessioneAttiva` nel form (vedi Step 4).
  - `aggiornaSetupSerata(legaId, sess)`: aggiorna la `sessioneAttiva`
    esistente (NON crea nuova, NON tocca `serate_bg`). Mantiene `stato: 'pre'`.
- `annullaSerata(legaId)`: se esiste già `annullaSessione` con
  comportamento giusto, riusare. Altrimenti aggiungere.

### Step 3 — WaitingPanel (1 commit)
- Nuovo file `src/components/serata/WaitingPanel.tsx`:
  - Card con riepilogo della sessione (vedi SPEC §3).
  - 3 bottoni: Annulla / Inizia ora / Modifica setup, in ordine inverso
    visivamente (Inizia ora più prominente).
  - `Annulla`: usa `window.confirm` poi chiama `annullaSerata`.
- `src/components/serata/LiveView.tsx`: in cima, dispatch su `sess.stato`.
  Se `'pre'` → `<WaitingPanel />`, altrimenti contenuto attuale.

### Step 4 — SetupForm in modalità edit (1 commit)
- `src/components/serata/SetupForm.tsx`:
  - Leggi `_setupEditing: boolean` (nuovo flag store) o equivalente.
  - Se `editing === true`: precompila `data`, `oraInizio`, `oraFine`,
    `buyIn`, `setupModalita`, `setupPartIds`, `torneoConfig` dalla
    `sessioneAttiva`.
  - Bottone "▶ Inizia serata" diventa "▶ Salva modifiche" se editing.
  - In `avvia()`: se editing, chiama `aggiornaSetupSerata` invece di
    `avviaSessione`. Poi reset flag.

### Step 5 — FAB con orario programmato (1 commit)
- `src/components/common/FabPartiteAttive.tsx`:
  - Per ogni partita in `partite`: se `s.stato === 'pre'`, aggiungi alla
    riga 2 (`fab-partite-row2`) un suffisso "🕐 alle HH:MM" oppure una
    riga 3.
  - Se `data ≠ oggi`, anteporre `fmtRelativeDate(s.data)` (es. "domani
    alle 21:00").
- CSS in `src/index.css` o file relativo: minimi tweak se serve.

### Step 6 — Stile WaitingPanel + collaudo (1 commit)
- Aggiungi CSS classi minimal per `WaitingPanel` (riusa stili `card`,
  `btn-block`, `btn-red`, `btn-gray`, `btn-green` esistenti).
- `npx tsc -b` + `npm run lint` + `npm test`: tutti verdi.

## Checklist fine fase (obbligatoria)

1. `npx tsc -b` → verde
2. `npm run lint` → verde
3. `npm test` → tutti verdi (nessuna regressione)
4. `git push` dopo ogni commit
5. Messaggio finale all'utente con:
   - Elenco dei 6 micro-step completati
   - **Cosa testare in browser** (porta 5173):
     - tutti i 7 casi del §6 dello SPEC
     - regressione: serata normale (creata → "Inizia ora" → live → chiusura) funziona come prima
   - Indicazione "apri chat di review separata per il merge in main"
6. **NON mergiare** in main da questa chat.

## Cose da NON toccare

- Modello settlement (cash e torneo) — calcoli intatti.
- Logica timer torneo (a parte il punto Step 2 `iniziaOra` che setta
  `inizio_livello_ms`).
- `vanillaCompatStorage`.
