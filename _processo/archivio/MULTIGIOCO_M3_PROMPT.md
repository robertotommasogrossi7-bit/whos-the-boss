# CARD TRACKER — Fase M3: Schermata comune del gioco ("segna partita") (chat OPUS)

> **Il cuore dell'app**: segnare le partite dei giochi **non-poker**. Usa il modello
> dati di M1 (`SessioneGioco / PartitaGioco / calcolaStatsGioco`) e la shell di R/M2
> (nav, GameBar, tema, ambito Personale). **Il poker resta INVARIATO.**
>
> Modello **contenitore** (Gioco → Sessione → Partita): per i giochi comuni è **già
> così** da M1 (una `SessioneGioco` contiene `partite[]`). Il nodo "Sessioni" del
> **poker** (se anche il poker diventi contenitore) è **DISACCOPPIATO da M3** → resta
> alla fase **tavolo-live** (dove si fa il rename UI). M3 non tocca il poker.

## Operativa
Sei una chat di FASE, modello **Opus** (fase più importante, sensibile al design). File
di processo in `_processo/`. Leggi PRIMA: `METODO.md` (Desktop); poi `CONTESTO.md`,
`POKER_MAP.md`, **`MULTIGIOCO_SPEC.md` (§3-§7, §10)**, `DESIGN_SPEC.md` (§3 componenti,
§8 regole), `DECISIONI.md`. Working dir: `poker-react/`.

## Scope — cosa FA e cosa NON fa
**FA:**
- **Logica + azioni store** del ciclo sessione/partita dei giochi comuni (su
  `lega.sessioniGioco`, tipi M1): crea/avvia/chiudi sessione, aggiungi/chiudi partita.
- **Flusso "segna partita"** (SPEC §6): scegli gioco → crea sessione (partecipanti, data,
  ora; stato `'pre'`) → avvia (`'attiva'`, ora reale) → **Nuova partita** (auto `ora_inizio`)
  → chiudi partita (auto `ora_fine`, **vincitori**/`pareggio`, **partecipanti** override,
  `nomeLibero` opzionale) → **chiudi sessione** (`'chiusa'`, + `esitoPareggio`). + **storico**.
- **Sezione lega a 4 schede** (decisione 2026-06-02): entrare in una lega → pagina con nav
  propria **Home / Classifica / Storico / Giocatori**. Home = griglia giochi + segna partita;
  **Giocatori** = rubrica (sposta qui `TabPartecipanti`); Storico = sessioni/partite della
  lega; **Classifica = guscio** (le classifiche reali sono M4).
- **Ambito Personale**: la Home globale (Personale) usa lo **stesso** flusso segna-partita
  coi guest. Stesso componente, due entry-point (Personale e lega).
- **`NuovaLega` inizializza i campi multigioco** alla creazione (chiama `migrateLega` /
  imposta i default) — risolve il debito noto.

**NON fa (fasi successive — NON sconfinare):**
- **Classifiche reali** (per-gioco/globali, filtri ambito) → **M4**. Le schede Classifica
  restano gusci.
- **Poker**: nessuna modifica (logica e route `/leghe/:id/poker` invariate). Niente
  restructure "Sessioni" poker (è tavolo-live).
- **Soldi / tavolo live** → fasi poker-live. **UI giochi custom** → M5.

## Branch
```
git checkout main && git pull && git checkout -b m3
```

## Ordine dei commit (micro-step, push dopo OGNI commit)
> Fase grande (~8–12 commit). **Cut-point naturale dopo il Blocco A** (logica+azioni con
> test): il motore è pronto e recensibile anche senza UII completa. Se la chat si appesantisce,
> fermati lì. Tutto è su git.

### Blocco A — Logica sessione/partita (PURA/store + TEST prima della UI)
- **A1 — Azioni store** (`useStore.ts`) per `sessioniGioco`: `creaSessioneGioco(legaId,
  giocoId, partecipanti, data, ora)`, `avviaSessioneGioco`, `aggiungiPartita`,
  `chiudiPartita`(vincitori/pareggio/partecipanti/nomeLibero), `chiudiSessioneGioco`(+
  `esitoPareggio`), `eliminaSessioneGioco`. Id incrementali via `lega._sgid` (e id partita
  interni). Persistono con `saveLega`. **Non toccare** le azioni poker.
- **A2 — Helper puri + TEST Vitest**: estrai in `utils/` la costruzione/esito (auto-orari,
  esito sessione) come **funzioni pure** e testale. ⚠️ **Coerenza con M1**: l'esito
  partita/sessione DEVE seguire le **stesse regole di `calcolaStatsGioco` (SPEC §7)** —
  **riusa** quelle definizioni, **non duplicarle**. Test minimi: crea sessione; chiudi partita
  (vincitore singolo / pareggio / partecipanti override / nomeLibero ininfluente sulle stat);
  chiudi sessione (vincitore = più partite, pareggio); i conteggi combaciano con
  `calcolaStatsGioco` sugli stessi dati.

### Blocco B — UI del flusso "segna partita"
- **B1 — Schermata gioco comune** (route comune, vedi SPEC §10 — definisci le sotto-route):
  vista della **sessione attiva** (lista partite, pulsante "Nuova partita", "Chiudi sessione")
  + creazione/avvio sessione (stato `'pre'`→`'attiva'`). Riusa la **libreria UI di R/M2**
  (Card/Button/Sheet/ListRow/EmptyState/Avatar), tema per gioco, niente inline style.
- **B2 — Sheet "Nuova partita"**: partecipanti (default = quelli della sessione, con override),
  **vincitori** (selezione multipla), toggle **pareggio**, `nomeLibero` opzionale → chiudi
  (auto `ora_fine`). Mostra l'esito nella lista.
- **B3 — Chiudi sessione**: calcola/мostra l'esito (vincitore = più partite vinte; pareggio
  possibile) e archivia. **Storico** delle sessioni/partite (apribili nel dettaglio).

### Blocco C — Contenitori (sezione lega + Personale)
- **C1 — Sezione lega a 4 schede** (`/leghe/:legaId/*`): layout con nav propria **Home /
  Classifica / Storico / Giocatori** (sostituisce l'Hub singolo di R/M2). Home = **griglia
  giochi** (poker → apre `/leghe/:id/poker`; gioco comune → apre la schermata B1) + segna
  partita; **Giocatori** = rubrica (sposta `TabPartecipanti` qui); **Storico** = sessioni
  della lega; **Classifica** = guscio (M4). Niente GameBar globale dentro la lega.
- **C2 — Home Personale**: la Home globale usa il flusso B coi **guest** (lega Personale).
  Storico Personale.
- **C3 — `NuovaLega`**: inizializza i campi multigioco alla creazione.

## Vincoli (DESIGN_SPEC §8 + memoria)
- **Niente inline style** (eccezione: l'accento dinamico sul root, già in `tema.ts`). Colori
  solo da variabili. **Niente emoji/loghi**. Mobile-first, touch ≥44px, **EmptyState** ovunque.
- **Riusa** la libreria UI + le icone di R/M2; non reinventarle.
- **Poker INTATTO**: logica (settlement/torneo/timer/store-soldi/overlay) e route
  `/leghe/:id/poker`. `vanillaCompatStorage` intatto. Retrocompat dati (leghe esistenti).
- **Riusa** `calcolaStatsGioco` / `migrateLega` (non cambiarli). Logica testabile **prima** della UI.

## Checklist fine fase (METODO)
1. `npx tsc -b` · 2. `npm run lint` · 3. `npm test` (i **48** esistenti verdi + i nuovi
   di sessione/partita) · 4. `npm run build` · 5. push dopo OGNI commit.
6. Messaggio finale con **cosa testare nel browser**: in **Personale** e in una **lega** —
   crea sessione, avvia, segna 2-3 partite (vincitori, un pareggio, una con partecipanti
   ridotti + nomeLibero), chiudi sessione, controlla lo **storico**; verifica che il **poker**
   funzioni ancora identico sotto `/leghe/:id/poker`; lega nuova ha i campi multigioco subito.
7. **NON mergiare**: lascia il branch `m3` per la review (chat separata).

## Cosa NON toccare
- Poker (settlement/torneo/timer/store-soldi/overlay) e la sua route.
- `vanillaCompatStorage`, `calcolaSettlement`, `calcolaSettlementTorneo`.
- `calcolaStatsGioco`, `migrateLega` (riusali, non modificarli).
- Classifiche reali (M4), UI giochi custom (M5), soldi/tavolo-live.
