# FASE #4.7a — Classifica condivisa (poker inline + filtro nome) — PROMPT di fase

> **Chi sei**: chat di fase **Sonnet**. Prima leggi `METODO.md` (Desktop) e `_processo/CONTESTO.md`.
> Poi questo prompt. **Implementi solo questa sub-fase** (classifica), micro-commit, push dopo OGNI commit.
> **NON** mergi in `main`. Decisioni: `DECISIONI.md` **(d)**, **(e)**, **(f)**, **(i)**.

## Obiettivo
Unificare **tutte le classifiche** in **UN** componente tabella condiviso, alimentato dal **layer-dati
del #4.6** (`utils/classifiche.ts`), con **KPI parametriche** e **filtro per nome**. È la 1ª delle 3
sub-fasi di #4.7 (poi 4.7b storico, 4.7c nickname). **Solo classifica** qui.

## Cosa esiste già (NON ri-fare la logica — è in `utils/`, testata)
Dal #4.6 (usa questi, non duplicare):
- `classificaUnificata(lega, giocoId): ClassificaU` — dispatcher; `tipo:'soldi'` (poker) | `'punti'` (giochi).
- `classificaPokerCrossContesto(nome, leghe)` — poker globale "La tua situazione" (netto/partite/% + perContesto).
- `statsPersonaCrossContesto(nome, gioco, leghe)` — il gemello non-poker (già usato in ClassificaShell).
- `ordinaMatchInCima(righe, query)` + `rigaMatchaNome(riga, query)` — filtro nome (match in cima, NON nasconde).
- Tipi `RigaClassificaU` (`kpi: {tipo:'punti', stats} | {tipo:'soldi', partiteGiocate, partiteVinte, percVittorie, netto}`).

## I 3 contesti da unificare (li conosco, sono questi)
1. `components/classifica/TabClassifica.tsx` — **poker** (`/leghe/:id/poker/classifica`): tabella
   `# | Giocatore | Partite | Vitt. | Netto`, filtro **data**, corona #1.
2. `components/leghe/LegaClassifica.tsx` — **giochi di lega** (`/leghe/:id/classifica`): selettore
   gioco (oggi **esclude poker**), tabella `# | Giocatore | % vinte | Sess.`, corona al leader, avatar.
3. `components/shell/ClassificaShell.tsx` — **globale/Personale** (`/classifica`): GameBar, "La tua
   situazione" (persona → totale aggregato + breakdown per contesto), "Classifica Personale", avviso
   identità. Oggi sul poker mostra **EmptyState di rimando** (niente dati inline).

## Deliverable 1 — Componente tabella condiviso
Nuovo `components/classifica/ClassificaTable.tsx` (riusa le classi CSS `.cla-*` esistenti).
Props (proposta, affina i nomi): `{ classifica: ClassificaU; query?: string }`.
- **Colonne PARAMETRICHE su `classifica.tipo`**:
  - `'soldi'` (poker): `# | Giocatore | Partite | Vitt. | % | Netto` (netto con classe `.pos/.neg` come oggi).
  - `'punti'` (giochi): `# | Giocatore | % vinte | Sess.` (come l'attuale LegaClassifica).
- **Corona** sul leader (`isLeader`), **Avatar**, riga "zero" stinta (`.cla-row--zero`) come oggi.
- **Filtro nome**: applica `ordinaMatchInCima(classifica.righe, query)`; le righe che **matchano**
  hanno una classe evidenziata (es. `.cla-row--match`); **nessuna riga sparisce** (semantica (f)).
  Il `#` posizione: mostra il **rank reale** (indice nella classifica ordinata per KPI), NON l'ordine
  post-match — così "porta in cima" senza falsare le posizioni. (Calcola il rank prima del riordino
  match, poi riordina portando i match in cima mantenendo il loro numero di posizione.)

## Deliverable 2 — Box ricerca nome condiviso
Piccolo input controllato riutilizzabile (es. `components/classifica/FiltroNome.tsx` o un campo inline
coerente) usato in tutti e 3 i contesti. Stile via CSS (NO inline). Placeholder "Cerca giocatore…".
Reset facile. Lo stato `query` vive nel componente-contenitore (non nello store: è effimero).

## Deliverable 3 — Refactor dei 3 contesti sul condiviso
- **LegaClassifica**: il selettore gioco **ora include il poker** se `lega.partite` non è vuoto (pill
  "Poker" col suo glifo/feltro). Dati = `classificaUnificata(lega, giocoIdSelezionato)` → `ClassificaTable`.
  Aggiungi il box ricerca. Quando è selezionato il poker, mostra anche un **link rapido** "Apri schermata
  Poker" → `/leghe/:id/poker/classifica` (il redirect "piace", (d)) **oltre** ai dati inline.
- **TabClassifica** (poker dedicato): rendering via `classificaUnificata(lega, 'poker')` → `ClassificaTable`
  (così poker = stesso look). **Mantieni il filtro data** esistente (passa il `range` — vedi nota sotto).
  Aggiungi il box ricerca.
- **ClassificaShell** (globale): togli l'EmptyState di rimando del poker; rendi tutto **parametrico**:
  - "**La tua situazione**": se gioco='punti' usa `statsPersonaCrossContesto`; se ='poker' usa
    `classificaPokerCrossContesto` → card totale (poker: **netto** + % + partite; giochi: % + partite +
    sess) + breakdown per contesto (collassabile, come oggi). Marca ogni contesto come **"ci sei"**
    (sei in `lega.nomi`) — il "non ci sei più" è deferito al backend, vedi (i): non costruirlo.
  - "**Classifica Personale**": `classificaUnificata(legaPersonale, giocoId)` → `ClassificaTable` +
    box ricerca. (Per poker mostra la tabella soldi.)
  - Tieni l'avviso identità. Sul poker, un **link rapido** alla schermata poker della lega Personale.

### Nota sul `range` data (poker)
`classificaUnificata` non prende il range; per il poker con filtro data usa direttamente
`classificaPoker(lega.partite, lega.nomi, range)` (esportata dal #4.6) e avvolgila in `{tipo:'soldi', righe}`.
(Oppure estendi `classificaUnificata` con un `range?` opzionale passato a `classificaPoker` — scelta tua,
purché i giochi 'punti' restino invariati.)

## ⛔ Fuori scope (NON qui)
- **Storico** → 4.7b. **Nickname / `rinominaGiocatore` / `normalizzazione di `statsPersonaCrossContesto`** → 4.7c.
- Soldi/settlement, `vanillaCompatStorage`, logica poker di gioco, store (nessuna azione nuova: la
  classifica **legge** soltanto). GameBar invariata.
- Non cambiare la matematica del #4.6: se serve un dato che non c'è, fermati e segnala (non ricalcolare a mano).

## Micro-commit suggeriti (1 idea = 1 commit, push dopo ognuno)
1. `feat(4.7a): ClassificaTable condivisa (parametrica soldi/punti) + CSS colonna netto`
2. `feat(4.7a): box ricerca nome + match-in-cima (ordinaMatchInCima) con evidenza`
3. `feat(4.7a): LegaClassifica sul condiviso + poker nel selettore + link rapido`
4. `feat(4.7a): TabClassifica (poker) sul condiviso, mantiene filtro data`
5. `feat(4.7a): ClassificaShell — poker inline (La tua situazione) + Personale sul condiviso`
6. `feat(4.7a): rifiniture CSS + "ci sei" nel breakdown`

## Checklist fine-fase (obbligatoria)
1. `npx tsc -b` verde · `npm run lint` verde · `npm test` verdi (baseline **138**; la logica è già
   testata dal #4.6 — qui può restare ~uguale: se aggiungi helper puri, testali).
2. `git push` (branch `multigioco-4-7a-classifica`).
3. Messaggio finale con micro-step + **cosa testare a browser** (sotto) + "apri chat di review separata".
4. **Non** mergiare in `main`.

## Cosa testare nel browser (per il messaggio finale)
- **Lega**: scheda Classifica → il selettore include **Poker** (se ci sono partite); switch
  gioco↔poker cambia colonne (% /sess ↔ partite/vitt/%/netto); la **ricerca** porta i match in cima
  **senza** nasconderli e senza sballare i numeri di posizione; link "Apri schermata Poker" funziona.
- **Poker dedicato** (`/leghe/:id/poker/classifica`): stesse colonne soldi, **filtro data** ancora ok, ricerca ok.
- **Globale** (`/classifica`): con un gioco non-poker → "La tua situazione" (tu, da #4.5) popolata,
  breakdown per contesto; con **poker** selezionato in GameBar → "La tua situazione" mostra il **netto**
  aggregato + breakdown, "Classifica Personale" mostra la tabella soldi; nessun EmptyState di solo-rimando.
- Verifica che **poker e giochi** rendano identici nel look (stesso componente), e che il poker dedicato
  esistente **non sia regredito**.
