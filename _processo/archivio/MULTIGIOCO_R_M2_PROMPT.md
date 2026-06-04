# CARD TRACKER — Fase R/M2: Design system + Shell + routing + Personale (chat OPUS)

> **R/M2 = UNA fase sola** (R *dentro* M2, non prima). R = sistema grafico/restyle;
> M2 = shell + routing + ambito Personale. Vanno insieme perché la shell M2 si
> costruisce già sui token di R: separarle vorrebbe dire fare la UI due volte.
> La logica del poker è **INVARIATA**: si sposta di route e cambia solo aspetto (feltro).
>
> Prerequisito già in `main` (M1): tipi `GiocoLega/SessioneGioco/PartitaGioco`, catalogo
> `utils/giochi.ts`, `migrateLega` (pura — **da agganciare in questa fase**),
> `calcolaStatsGioco`.

## Operativa
Sei una chat di FASE, modello **Opus** (fase grande/delicata). I file di processo stanno
in `_processo/`. Leggi PRIMA: `METODO.md` (sul Desktop); poi in `_processo/`:
`CONTESTO.md`, `POKER_MAP.md`, **`DESIGN_SPEC.md` (tutto)**, `MULTIGIOCO_SPEC.md`
(§2, §5, §9, §10), `DECISIONI.md`. Working dir del codice: `poker-react/`.

## Scope — cosa FA e cosa NON fa
**FA**: token scuri + meccanismo tema/accento (`data-tema` / `--accent`), libreria UI
minima, prime icone SVG, **restyle feltro del poker**, bottom nav nuova, routing
riorganizzato, GameBar persistente, **ambito Personale** (lega speciale + `migrateLega`
agganciata), Hub di lega.

**NON fa (sono fasi successive — NON sconfinare):**
- Il **flusso "segna partita"** (crea/avvia sessione, avvia/chiudi partita) → **M3**.
  In M2 Home e le route gioco sono **gusci** (GameBar + EmptyState), non il flusso vero.
- Le **classifiche reali** filtrabili → **M4**. Classifica/Storico in M2 = gusci.
- La **UI di creazione giochi custom** → **M5**.
- Soldi d'uscita / tavolo live → fasi poker-live.

## Branch
```
git checkout main && git pull && git checkout -b r-m2
```

## Ordine dei commit (micro-step, push dopo OGNI commit)
> Fase grande (~8–12 commit). **Punto di taglio naturale dopo il Blocco R**: lì l'app è
> ri-stilata ma ancora con la nav vecchia — è uno stato coerente e mergeabile. Se la chat
> si appesantisce, fermati, fai review+merge del solo restyle e riprendi M2 dopo. Tutto è
> su git: spezzare qui non costa nulla.

### Blocco R — Design system + restyle (nessun cambio di comportamento)
- **R1 — Token scuri**: nel CSS con `:root` (oggi tema chiaro — DESIGN_SPEC §2)
  sostituisci coi token scuri (`--bg/--surface/--surface-2/--border/--text/--text-muted/
  --shadow/--radius`, accento `--accent/--accent-ink/--accent-soft`, semantici
  `--ok/--warn/--danger`). Aggiungi il meccanismo `data-tema` sul root e
  `[data-tema="poker"]` (feltro, DESIGN_SPEC §6). **Audit colori hardcoded**: porta a
  variabili ogni esadecimale/`rgb()` nei componenti. L'app (ancora con nav vecchia) deve
  restare leggibile in scuro.
- **R2 — Libreria UI** (`src/components/ui/`): Button (primary/ghost/danger), Card, Chip,
  Sheet/Modal, ListRow, Avatar, EmptyState (DESIGN_SPEC §3). Solo presentazione, da token,
  touch ≥44px, nessuna logica di dominio.
- **R3 — Icone SVG** (`src/components/icons/`): icone d'interfaccia (frecce, +, settings,
  persona, corona… **NO emoji**) + `GameIcon` che disegna il glifo per la chiave `icona`
  del catalogo (`picche/mazzo/coppe/bastoni/denari/due-mazzi/scala/uno/magic/yugioh/
  pokemon`), glifi **originali**, **NIENTE loghi di marca** (DESIGN_SPEC §4). Colore da `--accent`.
- **R4 — Restyle feltro poker** (solo CSS/classi, ZERO logica): ri-vesti le schermate poker
  col tema feltro e i nuovi componenti dove banale; togli le emoji-icone (es. in
  `TavoloView` `⚠ ↺ ⇄ →` → SVG). `calcolaSettlement`/`calcolaSettlementTorneo`/store/timer
  **intatti**.

### Blocco M2 — Shell + routing + Personale
- **M2a — Routing + BottomNav**: nav a 4 voci Home/Classifica/Storico/Leghe (DESIGN_SPEC §3,
  MULTIGIOCO_SPEC §5). Route (MULTIGIOCO_SPEC §10): `/` (Home Personale), `/classifica`,
  `/storico`, `/leghe`, `/leghe/:legaId` (Hub), **poker spostato sotto
  `/leghe/:legaId/poker/*`** (l'attuale `/app/:legaId/*`, invariato dentro). Dopo il login
  il landing diventa **Home**. Home/Classifica/Storico = **gusci** con GameBar + EmptyState
  (il contenuto vero è M3/M4). Retrocompat dati: le leghe esistenti restano e si aprono.
- **M2b — GameBar + tema dinamico**: barra in alto su Home/Classifica/Storico (NON dentro
  Leghe). Mostra il gioco selezionato (GameIcon + nome + accento); tap → elenco dal
  catalogo. Al cambio gioco aggiorna `--accent`/`data-tema` sul root → l'app si ri-colora
  (poker → feltro). Stato globale `giocoFiltro` nello store + persistito in localStorage
  (DESIGN_SPEC §5). Predisponi le impostazioni "mostra/nascondi barra" e "gioco fisso (pin)"
  (TAVOLO_LIVE_SPEC §7) — possono restare minimali.
- **M2c — Ambito Personale + `migrateLega`**:
  - **Aggancia `migrateLega`** nel loop di rehydrate dello store (`useStore.ts`, lì dove
    girano `migrateSessione`/`migratePartita`): chiama `migrateLega(lega)` per ogni lega e,
    se imposta default, marca `dirty` → `saveLega` così persiste. (È la parte "agganciata"
    rimandata da M1.)
  - **Crea la lega "Personale"** (`personale:true`, sempre presente, non cancellabile) se
    assente. Giocatori = guest (riusa `lega.nomi`). È il landing di default (Home).
  - Riusa la macchina lega esistente; differenza solo di presentazione (guest vs membri).
- **M2d — Hub di lega** (`/leghe/:legaId`): griglia giochi (catalogo + eventuali
  `lega.giochi`) + classifica di lega (placeholder → M4) + giocatori della lega (la
  gestione rubrica si **sposta qui** — MULTIGIOCO_SPEC §10). **Niente GameBar** dentro la
  lega (il gioco si sceglie dalla griglia). Predisponi il flag lega mono-gioco (admin) — minimale.

## Vincoli (DESIGN_SPEC §8 + memoria progetto)
- Colori SOLO da variabili `--*`; **niente inline style** (unica eccezione tollerata: il
  valore dinamico di `--accent` sul root, DESIGN_SPEC §5). Mai esadecimali nei componenti.
- **Niente emoji** come icone; SVG originali. **Niente loghi di marca** nel repo (nomi sì, loghi no).
- Mobile-first, touch ≥44px, sempre **EmptyState** (mai schermo bianco).
- **Poker: logica INVARIATA.** Non toccare `calcolaSettlement`/`calcolaSettlementTorneo`/
  store-soldi/timer/overlay/`vanillaCompatStorage`. Solo aspetto + spostamento di route.
- Retrocompat localStorage intatta (chiave `pokerTracker_v2`).

## Debito tecnico ereditato da M1 — segnalato, NON urgente
- **`nuovoGiocoCustom` usa `custom-${Date.now()}`** → id a rischio collisione (teorico,
  serve doppia creazione nello stesso ms). Da irrobustire (contatore/uuid) **quando nasce
  la UI giochi custom (M5)**: prima non ha chiamanti. **Non agire ora.**
- **`utils/giochi.ts` senza test**: `accentDaNome`/`nuovoGiocoCustom` sono pure e
  deterministiche. Se in M2 usi/tocchi il catalogo, un mini-test è benvenuto (non obbligatorio).

## Checklist fine fase (METODO)
1. `npx tsc -b` verde · 2. `npm run lint` verde · 3. `npm test` verde (i **40** esistenti
   restano verdi; aggiungi test se introduci logica, es. selettore/creazione lega Personale).
4. push dopo OGNI commit.
5. Messaggio finale con **cosa testare nel browser**: tema scuro ovunque; GameBar cambia
   gioco → ri-colora e **persiste** tra schermate e dopo refresh; poker = feltro e
   **funziona identico** sotto `/leghe/:id/poker` (apri sessione, cash/torneo, settlement,
   debiti); Personale come landing; Hub con griglia giochi; nav a 4 voci; **zero emoji**,
   zero schermi bianchi. Caso limite: lega vecchia migrata → `sessioniGioco:[]`, `_sgid:1`,
   `personale:false`; refresh mantiene `giocoFiltro`.
6. **NON mergiare**: lascia il branch per la review (chat separata).

## Cosa NON toccare
- Logica poker (settlement/torneo/timer/store-soldi/overlay) — solo aspetto + route.
- `vanillaCompatStorage`, `calcolaSettlement`, `calcolaSettlementTorneo`.
- Flusso "segna partita" (M3), classifiche reali (M4), UI giochi custom (M5),
  soldi d'uscita / tavolo live (fasi poker-live).
