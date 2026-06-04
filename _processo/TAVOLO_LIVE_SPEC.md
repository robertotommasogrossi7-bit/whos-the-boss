# TAVOLO LIVE — SPEC (tavolo virtuale, cassa al centro, timer, "Sessioni")

> Feature: la **schermata viva della sessione poker** (cash + torneo) come
> **tavolo virtuale** con la **cassa al centro**, le azioni soldi **integrate sul
> posto**, il **timer del tempo-gioco per persona**, e il settlement gestito
> **durante** la partita (non solo a fine serata). Più il rename dell'ingresso in
> **"Sessioni"** e le impostazioni della **GameBar**.
>
> Questo SPEC è **UI/UX + naming + un pezzetto di stato** (timer). La **math dei
> soldi** vive in `USCITA_CASH_SPEC.md` (uscita/cassa) e `SETTLEMENT_SPEC.md`
> (netting). Il **sistema grafico** (token, tema feltro, icone SVG no-emoji) vive
> in `DESIGN_SPEC.md`. La **gerarchia multigioco** (Sessione→Partita generica) in
> `MULTIGIOCO_SPEC.md`. Stato: **bozza 2026-05-31**, da validare con l'utente.

---

## 1. Principi (decisi con l'utente)

1. **Velocità, telefono in mano.** Tutto a portata di pollice, niente schermate
   profonde: le azioni sul giocatore sono un **menù a matrioska** sul posto.
2. **Il tavolo virtuale è LA schermata viva** sia in **cash** che in **torneo**
   (oggi torneo ha i suoi sub-tab; si unifica sulla vista-tavolo).
3. **La cassa è al centro, visibile e cliccabile.** È il piatto contante; tap al
   centro → "di chi sono i soldi"; tap su una persona → operazioni rapide.
4. **Settlement live, non solo a fine serata.** I debiti/trasferimenti si segnano
   **mentre si gioca** (default a debito); la "chiusura" diventa la **review**
   pre-compilata (vedi `USCITA_CASH_SPEC §5`).
5. **Il timer traccia anche il tempo-gioco per persona.** Chi **perde** (torneo:
   eliminato) o **esce** (cash/torneo) viene **tolto dal tavolo**; il suo tempo si
   congela.
6. **Ingresso casuale + spostamento libero**, comodi (già esistono, si confermano).
7. **Ingresso ribattezzato "Sessioni"** (Apri sessione / Sessioni in corso);
   dentro, "Nuova partita" = l'attuale flusso cash/torneo.

---

## 2. Stato attuale del codice (NON rifare da zero)

Molto del tavolo virtuale **esiste già** (feature tavoli T1–T3, in `main`):

- **`components/serata/TavoloView.tsx`** — griglia tavoli 9-posti, ogni posto con
  nome + soldi (`dovuto`, `versato`, warning `−mancante`), **sposta** (tap-tap /
  scambio), **riequilibra**, lista **"in attesa di entrare"**, **aggiungi
  giocatore in corsa**, gestione "entrati senza seat" (sessioni vecchie).
- **`utils/tavoli.ts`** — `tavoliNecessari(n)`, `assegnaPostoIngresso(seduti,
  idNuovo)`, `riequilibraTavoli(seduti)` (+ `tavoli.test.ts`).
- **`utils/torneo.ts`** — `assegnaPostiCasuali(sess)` (Fisher-Yates) usata in
  `creaSessione` (torneo).
- **store**: `spostaGiocatore`, `riequilibraSeat`, `aggiungiEFaiEntrare`,
  `toggleEntrato`, più tutte le azioni cash/torneo (versato, ricariche, rebuy…).

**Cosa manca** (oggetto di questo SPEC):
- **Cassa al centro** del tavolo (widget) + pannello "di chi sono i soldi".
- **Menù a matrioska** sul posto (versati rapido, "deve soldi a…", esce, ecc.).
- **Uscita** dal tavolo a metà (collega `USCITA_CASH_SPEC`).
- **Timer per-persona** (tempo-gioco) + rimozione su perdita/uscita.
- **Tavolo unico per torneo** (oggi torneo non usa `TavoloView` come vista viva).
- **Restyle**: togliere le **emoji** (`⚠ ↺ ⇄ →`) → icone SVG (`DESIGN_SPEC`).
- **Naming "Sessioni"** + impostazioni **GameBar**.

---

## 3. La schermata "Tavolo" (cash + torneo)

Vista primaria della sessione live. Sostituisce/ingloba i sub-tab attuali
(`giocatori/attivi/orologio/premi` restano come **pannelli** richiamabili, non come
schermate separate).

```
            ┌─────────── TAVOLO ───────────┐
            │  P2      P3      P4           │
            │ P1   ┌───────────┐     P5     │
            │      │  CASSA €   │           │   ← widget centrale, cliccabile
            │ P9   └───────────┘     P6     │
            │      P8      P7              │
            └──────────────────────────────┘
   [torneo: barra orologio/livello sopra]  [premi quando late-reg finita]
```

- **Cash e torneo condividono il tavolo.** Differenze:
  - torneo: barra **orologio/livello** + **premi** (dopo fine late reg);
  - cash: **versamenti liberi** e ricariche.
- Multi-tavolo (torneo grande): più griglie, come oggi; la **cassa** è una sola,
  mostrata in testa o sul tavolo 1.

### 3.1 Widget Cassa (centro)

- Mostra la **cassa disponibile** = contante versato e **non ancora
  ridistribuito** (stato **derivato**, vedi `USCITA_CASH_SPEC §7`:
  `Σversato − contante già ri-distribuito`).
- **Tap al centro** → pannello **"di chi sono i soldi"**: elenco chi ha versato
  quanto, e (a uscite avvenute) chi ha già incassato. **Riusa `CassaView.tsx`**.
- **Torneo**: a **late reg finita**, il widget mostra anche **montepremi +
  ripartizione premi** (già calcolati in `utils/calc.ts`). Prima della fine,
  mostra solo la cassa.

### 3.2 Tap su un posto → menù a matrioska

Menù compatto sul posto (no schermate nuove). **Default = debito**, con "pagato
ora" opzionale (coerente con `USCITA_CASH_SPEC §1`). Voci secondo modalità:

- **Versati** — registra che P ha versato la quota. Matrioska: tap → importo
  rapido (**tutto** / **parziale**). Aggiorna `versato`.
- **Deve soldi a…** — scegli il **destinatario** dalla lista persone; crea un
  trasferimento (default a **debito**, bottone "pagato ora"). Riusa il sistema
  `debiti`/`Settlement` esistente.
- **Ricarica** (cash) / **Rebuy** / **Add-on** (torneo) — già esistono, qui solo
  raggiunte dal menù del posto.
- **Esce** — flusso **`USCITA_CASH_SPEC §4`**: 1 tap "è uscito" → tolto dal
  tavolo; se caccia/incassa, i tap di dettaglio sono **opzionali** e **deferibili**
  alla review.
- **Eliminato** (torneo) — toglie dal tavolo, registra **posizione** e **tempo**
  (vedi §4). Riusa `torneoElimina` + `PrizeModal`.

### 3.3 Ingresso casuale + spostamento libero (conferma + estensione)

- **Ingresso**: posto via `assegnaPostoIngresso`; **casuale** via
  `assegnaPostiCasuali` (oggi torneo).
  - **Estensione**: anche il **cash** deve poter assegnare i posti **a caso**
    all'avvio/ingresso (oggi è solo torneo). Decisione utente: **sì**.
- **Spostamento**: tap-tap (sposta / scambia) come oggi.
- **Riequilibrio**: pulsante, con segnalazione tavolo "corto" (≤3) come oggi.

---

## 4. Timer per-persona (tempo di gioco)

Nuovo: per ogni giocatore si traccia **quanto tempo è stato al tavolo**.

- **Modello** (campi nuovi su `GiocatoreSessione`, cash+torneo):
  - `seduto_da_ms?: number` — timestamp di quando si è (ri)seduto;
  - `tempo_gioco_ms?: number` — tempo **accumulato** nelle sedute precedenti.
- **Transizioni**:
  - entra / rientra / si siede → `seduto_da_ms = now`;
  - esce / eliminato / lascia il tavolo (`seat = null`) → `tempo_gioco_ms +=
    now − seduto_da_ms`, poi `seduto_da_ms = undefined`. Tempo **congelato**.
- **Funzione pura testabile** (NON soldi, ma è logica → merita test):
  ```ts
  // ms totali "vissuti" al tavolo a un dato istante
  function tempoGiocoMs(g: GiocatoreSessione, nowMs: number): number {
    return (g.tempo_gioco_ms ?? 0) + (g.seduto_da_ms ? nowMs - g.seduto_da_ms : 0);
  }
  ```
  Test minimi: solo accumulato; solo seduta in corso; somma delle due; doppia
  seduta (esce e rientra) accumula correttamente; mai negativo.
- **Visualizzazione**: sul posto / nel pannello persona, "in gioco da `Xh Ym`"
  (se seduto) o "ha giocato `Xh Ym`" (se uscito).
- **Sorgente del tempo**: cash = wall-clock dalla `ora_inizio` sessione; torneo =
  stesso orologio del torneo dove sensato. (Per il tempo-persona basta il
  wall-clock: `Date.now()`.)

---

## 5. Settlement gestito live (non solo a fine serata)

- **Oggi**: `ChiusuraScreen` è una schermata di **fine serata** ("alla cieca").
- **Nuovo**: i trasferimenti/debiti si creano **durante** la sessione dal tavolo
  (uscite, "deve soldi a…", versamenti). La "chiusura" diventa la **review**
  pre-compilata (`USCITA_CASH_SPEC §5`): mostra tutto il già-segnato, **tutto
  modificabile**, con **controllo di quadratura**.
- **La math NON si duplica**: resta `calcolaSettlement` /
  `calcolaSettlementTorneo`. La review **legge e aggiusta**, non re-implementa.
- **Reconcile con `SETTLEMENT_SPEC.md`**: se il punto d'ingresso cambia (la review
  sostituisce la chiusura cieca), aggiornare quel SPEC e i suoi test. **Niente
  regressioni mute**: un test storico che cambia va motivato.

---

## 6. Naming: "Sessioni" (ex "Nuova partita")

Ponte con la gerarchia di `MULTIGIOCO_SPEC.md` (`Gioco → Sessione → Partita`).

- L'ingresso poker si chiama **"Sessioni"**: pulsante **"Apri sessione"** + lista
  **"Sessioni in corso"**.
- Dentro una sessione: **"Nuova partita"** = l'attuale flusso **setup → live
  cash/torneo**.
- Mappatura concettuale: una **sessione** poker = **contenitore-serata**; una
  **partita** poker = **un tavolo cash o un torneo** (l'attuale oggetto `Sessione`).

> ⚠️ **NON rinominare il tipo `Sessione` nel codice** (retrocompat localStorage +
> moltissimi riferimenti). In questa fase il rename è **solo di etichette UI**
> (`TabSerata.tsx`, `SerataHub.tsx`, bottoni). La **riconciliazione dei dati** con
> `SessioneGioco`/`PartitaGioco` del multigioco è **M3**, non qui. Qui si allinea
> solo il **linguaggio** mostrato all'utente.

---

## 7. GameBar (toolbar giochi) — impostazioni

Richiama `DESIGN_SPEC §5` (meccanica accento/tema). La **GameBar** è la barra in
alto che filtra/ritematizza per gioco, presente su **Home/Classifica/Storico**
(non in Leghe). Impostazioni richieste dall'utente:

- **"Mostra barra giochi"** on/off → si può **togliere del tutto**.
- **"Gioco fisso" (pin)** → lascia **un solo gioco** attivo: app **mono-gioco**
  (per chi gioca solo a poker, o per chi non vuole il multi-gioco).
- Quando **fissata**: niente cambio gioco; l'accento/tema resta quello scelto
  (poker → **tema feltro**).
- **A livello di lega**: l'admin può **imporre un gioco fisso** a tutta la lega
  (lega mono-gioco). I **ruoli veri** (chi è admin) sono **post-backend**; per ora
  è un flag locale della lega.

---

## 8. Impatto sul codice (per la fase implementativa)

- **Riusare `TavoloView.tsx`** come base; aggiungere:
  - **widget Cassa** al centro (+ pannello "di chi sono i soldi" via `CassaView`);
  - **menù a matrioska** sul posto (versati rapido, "deve soldi a…", esce, …).
- **Togliere le emoji** (`⚠ ↺ ⇄ →` in `TavoloView`) → **icone SVG** (`DESIGN_SPEC`).
- **Usare il tavolo anche per il torneo** (oggi `LiveTorneo` ha sub-tab separati):
  unificare sulla vista-tavolo tenendo **orologio** e **premi** come pannelli.
- **Timer**: nuovi campi `seduto_da_ms?`, `tempo_gioco_ms?` su `GiocatoreSessione`
  + funzione pura `tempoGiocoMs(...)` (§4) + test. Migrazione idempotente
  (undefined → 0/undefined, non toccare i campi esistenti).
- **store**: azioni uscita (da `USCITA_CASH_SPEC`), "versati" rapido,
  "deve soldi a…", più il set/azzeramento del timer nelle transizioni.
- **Naming UI** "Sessioni"/"Apri sessione"/"Sessioni in corso"/"Nuova partita"
  (`TabSerata.tsx`, `SerataHub.tsx`).
- **GameBar settings**: dipende dalla **shell M2** (stato impostazioni + GameBar
  reali). Questa parte si realizza **con M2/M3**, non da sola.

---

## 9. Vincoli

- **Solo poker** (cash+torneo). I giochi "comuni" non hanno tavolo/soldi.
- **Non rompere** `vanillaCompatStorage`, `calcolaSettlement`,
  `calcolaSettlementTorneo`.
- I **soldi** sono in `USCITA_CASH_SPEC`/`SETTLEMENT_SPEC`: qui solo **UI + timer**.
- **Niente inline style**; CSS con variabili (`DESIGN_SPEC`).
- Feature **grande** → va **spezzata** (vedi ordine in `CONTESTO.md`): tavolo+cassa
  UI → timer (pura+test) → uscita (dipende dalla funzione pura di `USCITA_CASH`) →
  naming → gamebar settings (con M2/M3).
