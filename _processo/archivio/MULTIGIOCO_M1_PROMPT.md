# CARD TRACKER — Fase M1: modello dati + statistiche (prompt per chat Sonnet)

> Prima fase della trasformazione descritta in `MULTIGIOCO_SPEC.md`.
> M1 = SOLO fondamenta dati e logica testabile. **Nessuna UI, nessuna azione
> store, nessun routing, nessuna grafica** (quelli sono R/M2/M3). Il poker NON
> si tocca.

## Operativa
Sei una chat di FASE. I file di processo stanno nella cartella **`_processo/`**.
Leggi prima: `METODO.md` (sul Desktop), poi in `_processo/`: `CONTESTO.md`,
`POKER_MAP.md`, e soprattutto `MULTIGIOCO_SPEC.md` (§2-§9 e §13).
Working dir del codice: `poker-react/`.

## Branch
```
git checkout main && git pull && git checkout -b multigioco-m1
```

## Cosa fare (solo dati + funzioni pure + test)

### Step 1 — Tipi (`src/types/index.ts`)
Aggiungi (copia le interfacce da SPEC §4):
- `GiocoLega { id, nome, preimpostato, foto?, accent?, attivo, pareggioComeVittoria }`
- `PartitaGioco { id, ora_inizio, ora_fine, vincitori: number[], pareggio: boolean, partecipanti?: number[], nomeLibero?: string }`
- `SessioneGioco { id, giocoId, data, stato: 'pre'|'attiva'|'chiusa', ora_inizio, ora_fine, partecipanti: number[], partite: PartitaGioco[], esitoPareggio: boolean }`
- Estendi `Lega` con: `personale?: boolean`, `giochi?: GiocoLega[]`, `sessioniGioco?: SessioneGioco[]`, `_sgid?: number`.
(NON rimuovere/cambiare nulla del poker esistente.)
> Nota literal: `SessioneGioco.stato` = `'pre'|'attiva'|'chiusa'` (femminile),
> **distinto** da `Sessione.stato` del poker (`'pre'|'attivo'|'pausa'|'concluso'`).
> Sono tipi diversi: seguire i literal dello SPEC, non allinearli al poker.

### Step 2 — Catalogo giochi preimpostati (`src/utils/giochi.ts`)
- Array dei preimpostati con `{ id, nome, accent, icona }` (vedi tabella in
  **DESIGN_SPEC.md §4**): `poker`, `generico`, `scopa`, `briscola`, `tressette`,
  `burraco`, `scala40`, `uno`, `magic`, `yugioh`, `pokemon`.
  - `accent` = stringa colore **hex** (`#RRGGBB`) dal catalogo DESIGN_SPEC §4.
  - `icona` = **chiave stringa kebab-case stabile** (lo SVG vero lo disegna la fase
    grafica; qui basta la chiave). Mappa suggerita: `poker`→`picche`,
    `generico`→`mazzo`, `scopa`→`coppe`, `briscola`→`bastoni`, `tressette`→`denari`,
    `burraco`→`due-mazzi`, `scala40`→`scala`, `uno`→`uno`, `magic`→`magic`,
    `yugioh`→`yugioh`, `pokemon`→`pokemon`.
  - Nessuna immagine/logo: solo dati. (Vincolo copyright — vedi DESIGN_SPEC §4.)
  - ⚠️ Il `poker` sta nel catalogo **solo** per identità/tema/GameBar (verde+oro,
    feltro). Il poker **non** usa `SessioneGioco` né passa da `calcolaStatsGioco`
    (Step 4): mantiene il suo modello e la sua classifica esistenti. Non trattarlo
    come caso speciale nelle stats — semplicemente non gli si passano `SessioneGioco`.
- Helper `nuovoGiocoCustom(nome, foto?)` → `GiocoLega` con `preimpostato:false`,
  `attivo:true`, `pareggioComeVittoria:true`, `accent` derivato dal nome, id
  `custom-<timestamp>`.
- Helper `accentDaNome(nome): string` (deterministico) usato sopra. Restituisce
  **hex** `#RRGGBB` (anche se lo derivi via HSL come in DESIGN_SPEC §4, converti a hex).

### Step 3 — Migrazione (`src/utils/migrations.ts`)
- Crea una **nuova funzione pura** `migrateLega(l: Lega): void`, sorella di
  `migrateSessione`/`migratePartita` (già nel file), che imposta i default dei campi
  multigioco sulla lega: `giochi` undefined → **lascia undefined** (poker implicito);
  `sessioniGioco` undefined → `[]`; `_sgid` undefined → `1`; `personale` undefined →
  `false`. **Idempotente**, **non toccare** alcun campo poker.
- ⚠️ **In M1 NON agganciarla allo store**: NON modificare `useStore.ts` (il loop di
  rehydrate ~riga 1455 con `migrateSessione`/`migratePartita`). L'aggancio di
  `migrateLega` lo fa **M2** (la fase che crea la lega "Personale" e legge questi
  campi). In M1 la funzione resta scritta ma **non chiamata** — coerente col mandato
  "niente UI, niente store". Un piccolo test di idempotenza è consigliato (non obbligatorio).
- NON creare qui la lega "Personale" (è compito di M2): qui solo i default campi.

### Step 4 — Funzioni pure di statistica (`src/utils/statsGiochi.ts`) + TEST
```ts
interface StatsGiocatore {
  sessioniGiocate: number; sessioniVinte: number; sessioniPerse: number; sessioniPareggio: number;
  partiteGiocate: number; partiteVinte: number; partitePerse: number; partitePareggio: number;
  percVittorie: number; // 0..100, su partite giocate
}
function calcolaStatsGioco(
  gioco: GiocoLega,
  sessioni: SessioneGioco[],   // già filtrate per questo gioco e stato 'chiusa'
  idNome: number
): StatsGiocatore
```
Regole (SPEC §7):
- Considera solo sessioni `chiusa` del gioco a cui `idNome` è in `partecipanti`.
- **Partecipanti di una partita** = `partita.partecipanti` se presente, altrimenti
  `sessione.partecipanti`. "Giocata" da `idNome` se vi appartiene.
  - vinta: `idNome ∈ partita.vincitori`; pareggio: `partita.pareggio`; persa: altrimenti.
- **Esito sessione** per `idNome`: conta le partite vinte di ciascun partecipante
  della sessione.
  - vinta: `idNome` ha il massimo da solo;
  - pareggio: parità in testa **oppure** `sessione.esitoPareggio === true`;
  - persa: altrimenti.
- **`percVittorie`** = (`partiteVinte` + (se `gioco.pareggioComeVittoria` allora
  `partitePareggio` else 0)) / `partiteGiocate` * 100, arrotondata a 1 decimale.
  Se `partiteGiocate===0` → 0.
- `nomeLibero` NON influisce sulle statistiche (è solo un'etichetta della partita).

**Test obbligatori (Vitest, `statsGiochi.test.ts`)** — almeno questi:
1. **Base**: 1 sessione chiusa, partecipanti A,B, 3 partite: A vince 2, B vince 1.
   → A: partiteGiocate 3, vinte 2, perse 1, percVittorie 66.7, sessione vinta.
   → B: vinte 1, perse 2, percVittorie 33.3, sessione persa.
2. **Pareggio partita, pareggioComeVittoria=true**: 2 partite, una `pareggio:true`
   (vincitori vuoto). A: partitePareggio 1 → conta nella %.
3. **Pareggio partita, pareggioComeVittoria=false**: stesso scenario ma il
   pareggio NON entra nella % (esce solo come partitePareggio).
4. **Sessione in pareggio**: A e B con stesse partite vinte (o `esitoPareggio:true`)
   → entrambi sessioniPareggio 1, sessioniVinte 0.
5. **partecipanti per-partita**: sessione con partecipanti A,B,C; una partita con
   `partecipanti:[A,B]` (C non gioca quella) → per C quella partita NON è
   "giocata"; i conteggi di C la ignorano.

## Checklist fine fase
1. `npx tsc -b` verde
2. `npm run lint` verde
3. `npm test` → i test esistenti (28) + i nuovi di statsGiochi tutti verdi
4. push dopo ogni commit (4 commit logici: tipi / catalogo / migrazione / stats+test)
5. NON mergiare in main: lascia il branch per la review.

## Cosa NON toccare
- Tutto il poker (modello, store, settlement, overlay, timer).
- `vanillaCompatStorage`, `calcolaSettlement`, `calcolaSettlementTorneo`.
- Niente UI, niente azioni store, niente routing, niente CSS (sono R/M2/M3).
