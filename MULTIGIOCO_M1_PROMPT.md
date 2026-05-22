# CARD TRACKER — Fase M1: modello dati + statistiche (prompt per chat Sonnet)

> Prima fase della trasformazione descritta in `MULTIGIOCO_SPEC.md`.
> M1 = SOLO fondamenta dati e logica testabile. **Nessuna UI, nessuna azione
> store, nessun routing** (quelli sono M2/M3). Il poker NON si tocca.

## Operativa
Sei una chat di FASE. Leggi prima: `METODO.md` (desktop), `CONTESTO.md`,
`POKER_MAP.md`, e soprattutto `MULTIGIOCO_SPEC.md` (§2-§6 e §13).
Working dir: `poker-react/`.

## Branch
```
git checkout main && git pull && git checkout -b multigioco-m1
```

## Cosa fare (solo dati + funzioni pure + test)

### Step 1 — Tipi (`src/types/index.ts`)
Aggiungi (vedi SPEC §3, copia le interfacce):
- `GiocoLega { id, nome, preimpostato, foto?, attivo, pareggioComeVittoria }`
- `PartitaGioco { id, ora_inizio, ora_fine, vincitori: number[], pareggio: boolean }`
- `SessioneGioco { id, giocoId, data, stato: 'pre'|'attiva'|'chiusa', ora_inizio, ora_fine, partecipanti: number[], partite: PartitaGioco[], esitoPareggio: boolean }`
- Estendi `Lega` con: `giochi?: GiocoLega[]`, `sessioniGioco?: SessioneGioco[]`, `_sgid?: number`.
(NON rimuovere/cambiare nulla del poker esistente.)

### Step 2 — Catalogo giochi predefiniti (`src/utils/giochi.ts`)
- Costante array dei giochi predefiniti: `{ id, nome }` per poker, magic, yugioh,
  pokemon, scopa, briscola, tresette (il logo lo aggiungiamo dopo; ora basta id+nome).
- Helper `nuovoGiocoCustom(nome, foto?)` → `GiocoLega` con `preimpostato:false`,
  `attivo:true`, `pareggioComeVittoria:true`, id `custom-<timestamp>`.

### Step 3 — Migrazione (`src/utils/migrations.ts`)
- In una funzione (es. `migrateLega` o dentro quella esistente): se `giochi`
  undefined → lascia undefined (poker implicito); se `sessioniGioco` undefined →
  `[]`; se `_sgid` undefined → 1. **Idempotente**, e **non toccare** i campi poker.

### Step 4 — Funzioni pure di statistica (`src/utils/statsGiochi.ts`) + TEST
Funzione pura (no React/store):
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
Regole (SPEC §5/§6):
- Considera solo sessioni `chiusa` del gioco a cui `idNome` è in `partecipanti`.
- Una **partita** è "giocata" da `idNome` se è nei `partecipanti` della sessione.
  - vinta: `idNome ∈ partita.vincitori`; pareggio: `partita.pareggio`; persa: altrimenti.
- **Esito sessione** per `idNome`: conta le partite vinte di ciascun partecipante.
  - vinta: `idNome` ha il massimo da solo;
  - pareggio: parità in testa **oppure** `sessione.esitoPareggio === true`;
  - persa: altrimenti.
- **`percVittorie`** = (`partiteVinte` + (se `gioco.pareggioComeVittoria` allora `partitePareggio` else 0)) / `partiteGiocate` * 100, arrotondata a 1 decimale. Se `partiteGiocate===0` → 0.

**Test obbligatori (Vitest, `statsGiochi.test.ts`)** — almeno questi:
1. **Base**: 1 sessione chiusa, partecipanti A,B, 3 partite: A vince 2, B vince 1.
   → A: partiteGiocate 3, vinte 2, perse 1, percVittorie 66.7, sessione vinta.
   → B: vinte 1, perse 2, percVittorie 33.3, sessione persa.
2. **Pareggio partita con pareggioComeVittoria=true**: 2 partite, una con
   `pareggio:true` (vincitori vuoto). A: partitePareggio 1 → conta nella %.
3. **Pareggio partita con pareggioComeVittoria=false**: stesso scenario ma il
   pareggio NON entra nella % (esce solo come partitePareggio).
4. **Sessione in pareggio**: A e B con stesse partite vinte (o `esitoPareggio:true`)
   → entrambi sessioniPareggio 1, sessioniVinte 0.

## Checklist fine fase
1. `npx tsc -b` verde
2. `npm run lint` verde
3. `npm test` → i test esistenti (20) + i nuovi di statsGiochi tutti verdi
4. push dopo ogni commit (4 commit logici: tipi / catalogo / migrazione / stats+test)
5. NON mergiare in main: lascia il branch per la review.

## Cosa NON toccare
- Tutto il poker (modello, store, settlement, overlay, timer).
- `vanillaCompatStorage`, `calcolaSettlement`, `calcolaSettlementTorneo`.
- Niente UI, niente azioni store, niente routing (sono M2/M3).
