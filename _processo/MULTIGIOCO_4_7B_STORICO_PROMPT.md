# FASE #4.7b — Storico condiviso (poker inline + filtro gioco/nome) — PROMPT di fase

> **Chi sei**: chat di fase **Sonnet**. Prima leggi `METODO.md` (Desktop) e `_processo/CONTESTO.md`.
> Poi questo prompt. **Implementi solo questa sub-fase** (storico), micro-commit, push dopo OGNI commit.
> **NON** mergi in `main`. Decisioni: `DECISIONI.md` **(d)**, **(f)**, **(i)**.

## Obiettivo
Gemella di #4.7a, lato **storico**: **UN** componente storico condiviso, alimentato dal **layer-dati del
#4.6** (`utils/storico.ts`), usato in tutti i contesti, con **filtro gioco** (poker incluso, colma la
lacuna (d)) e **filtro nome SECCO**. È la 2ª delle 3 sub-fasi di #4.7. **Solo storico** qui.

## Cosa esiste già (USA, non ri-fare)
- **#4.6** (`utils/storico.ts`, testato): `vociStorico(lega, {giocoId?, range?}): VoceStorico[]` —
  `VoceStorico = {kind:'poker', data, partita} | {kind:'gioco', data, giocoId, sessione}`, già ordinate
  per data desc; `giocoId` assente = **tutto** (poker + giochi mescolati). `filtraStoricoPerNome(voci,
  query, nomeById)` — **filtro secco** (rimuove le voci senza quel nome). `voceCoinvolgeNome(...)`.
- **#4.7a**: `components/classifica/FiltroNome.tsx` — **riusalo** (box ricerca generico).
- Store actions: `eliminaPartita(legaId, partitaId)`, `toggleSettlementPaid(legaId, partitaId, idx)`
  (poker); `eliminaSessioneGioco(legaId, sessId)` (gioco). Helpers: `esitoSessione`, `partitaInCorso`
  (`utils/sessioneGioco`), `fmtData`/`euro`/`getNome` (`utils/format`).

## I 4 contesti da unificare (li conosco)
1. `components/storico/TabStorico.tsx` — **poker** (`/leghe/:id/poker/storico`): card per `Partita`
   (Cash/Torneo · data, barra vincitore, espandi → tabella ranking per netto [#, nome+corona, buy-in,
   netto pos/neg], pillole settlement `toggleSettlementPaid`, elimina `eliminaPartita`). **Filtro data**.
2. `components/gioco/StoricoSessioni.tsx` — **non-poker** (condiviso lega+Personale): card per
   `SessioneGioco` chiusa (icona+nome gioco · data · N partite, chip esito, espandi → lista partite con
   esiti/`nomeLibero`, elimina `eliminaSessioneGioco`). Prop `giocoId?`.
3. `components/leghe/LegaStorico.tsx` — delega a StoricoSessioni, **senza filtro gioco** (lacuna (d)).
4. `components/shell/StoricoShell.tsx` — globale: GameBar; sul poker mostra **EmptyState di rimando**
   (da togliere → poker inline); altrimenti StoricoSessioni filtrato per `giocoFiltro`.

## Deliverable 1 — Componente storico condiviso
Nuovo `components/storico/StoricoLista.tsx`. Props (proposta): `{ lega: Lega; voci: VoceStorico[]; query?: string }`.
- Legge da sé le **azioni store** che gli servono (`eliminaPartita`, `toggleSettlementPaid`,
  `eliminaSessioneGioco`, `toast`) e risolve i nomi con `lega.nomi` (`getNome`).
- Applica `filtraStoricoPerNome(voci, query, nomeById)` — **filtro secco** (niente "match in cima":
  nello storico le voci senza il nome **spariscono**, semantica (f)). Empty-state se 0 voci dopo il filtro.
- **Card PARAMETRICA su `voce.kind`** (riusa le classi CSS esistenti `.game-card` / `.storico-sess`):
  - `'poker'`: rendi **identico all'attuale TabStorico** (header Cash/Torneo+data+vincitore; espansa:
    ranking per `netto_finale` [#, nome+corona, buy-in `entrate`, netto `.pos/.neg`], pillole settlement,
    elimina partita).
  - `'gioco'`: rendi **identico all'attuale StoricoSessioni** (header icona+nome gioco+data+N partite,
    chip esito sessione; espansa: lista partite con esiti + `nomeLibero`, elimina sessione).
- **Stato espandi/collassa LOCALE** (`useState<Set<string>>`) con **chiave unificata** `${voce.kind}:${id}`
  (poker = `partita.id`, gioco = `sessione.id`) — così poker e giochi convivono. (Il vecchio
  `storicoOpen`/`toggleStoricoOpen` dello store può restare inutilizzato; rimuoverlo è cleanup opzionale.)

## Deliverable 2 — Filtro gioco (dove manca) + nome (ovunque)
- **Selettore gioco** SOLO dove non c'è la GameBar → **LegaStorico**: pill `Tutti` (giocoId=undefined) +
  `Poker` (se `lega.partite` non vuoto) + un pill per ogni gioco con sessioni chiuse. Riusa il pattern/CSS
  `.cla-gioco-sel` di LegaClassifica (coerenza). Selezione → `vociStorico(lega, {giocoId})`.
- **Filtro nome**: `FiltroNome` (riuso 4.7a) in **tutti** i contesti, passato come `query` a StoricoLista.
- Nello **StoricoShell** il "filtro gioco" è già la **GameBar** (`giocoFiltro`): nessun selettore extra.

## Deliverable 3 — Refactor dei 4 contesti
- **LegaStorico**: aggiungi selettore gioco (Tutti/poker/giochi) + `FiltroNome`; `vociStorico(lega,
  {giocoId})` → `StoricoLista`. (Colma la lacuna (d) **e** porta il poker inline.)
- **StoricoShell**: togli l'EmptyState di rimando del poker; `vociStorico(personale, {giocoId:
  giocoFiltro})` → `StoricoLista` + `FiltroNome`. Per il poker, un **link rapido** alla schermata poker
  dedicata della lega Personale (il redirect "piace", (d)).
- **TabStorico** (poker dedicato): `vociStorico(lega, {giocoId:'poker', range})` → `StoricoLista`;
  **mantieni il filtro data** + `FiltroNome`. Stesso look di prima (le card poker non cambiano aspetto).
- **StoricoSessioni**: superato da `StoricoLista`. **Cerca tutti gli import** (`grep StoricoSessioni`):
  se dopo il refactor resta inutilizzato, **rimuovilo**; se è usato altrove (es. Home/Personale),
  rimpiazza quell'uso con `StoricoLista` alimentata da `vociStorico`.

## ⛔ Fuori scope (NON qui)
- **Classifica** (fatta in 4.7a). **Nickname / `rinominaGiocatore` / normalizzazione `statsPersonaCrossContesto`** → 4.7c.
- Soldi/settlement (puoi **invocare** `toggleSettlementPaid`, ma non cambiarne la logica),
  `vanillaCompatStorage`, matematica del #4.6. GameBar invariata. Nessuna azione store nuova.

## Micro-commit suggeriti (1 idea = 1 commit, push dopo ognuno)
1. `feat(4.7b): StoricoLista condivisa (card poker + gioco) + filtro nome secco`
2. `feat(4.7b): TabStorico (poker) sul condiviso, mantiene filtro data`
3. `feat(4.7b): LegaStorico — selettore gioco (Tutti/poker/giochi) + condiviso`
4. `feat(4.7b): StoricoShell — poker inline (no redirect) + condiviso + link rapido`
5. `feat(4.7b): rimuovi/riconverti StoricoSessioni + rifiniture CSS`

## Checklist fine-fase (obbligatoria)
1. `npx tsc -b` verde · `npm run lint` verde · `npm test` verdi (baseline **138**; logica già testata dal #4.6).
2. `git push` (branch `multigioco-4-7b-storico`).
3. Messaggio finale con micro-step + **cosa testare a browser** (sotto) + "apri chat di review separata".
4. **Non** mergiare in `main`.

## Cosa testare nel browser (per il messaggio finale)
- **Lega › Storico**: compare il **selettore gioco** (Tutti/Poker/giochi); "Tutti" mescola poker e
  giochi per data; selezionando **Poker** vedi le partite inline (espandi → ranking + pillole settlement,
  che restano cliccabili); la **ricerca** nome **rimuove** le voci senza quel nome.
- **Poker › Storico** (`/leghe/:id/poker/storico`): card identiche a prima, **filtro data** ancora ok, ricerca ok.
- **Globale › Storico** (`/storico`): con un gioco → sessioni di quel gioco; con **Poker** in GameBar →
  partite di poker **inline** (niente più EmptyState di solo-rimando), + link rapido alla schermata poker.
- Verifica che eliminare una partita/sessione e segnare un debito pagato **funzionino** dal nuovo componente,
  e che lo storico poker dedicato **non sia regredito**.
