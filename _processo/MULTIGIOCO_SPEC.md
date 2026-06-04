# CARD TRACKER — SPEC (trasformazione multi-gioco)

> Trasformazione dell'app da **poker tracker** a **"Card Tracker"**: un tracker
> per gruppi di amici che giocano a carte (e non solo). Questo file è il
> contratto di design dell'INTERA operazione.
> Grafica → `DESIGN_SPEC.md`. Decisioni → `DECISIONI.md`. Idee storiche →
> `archivio/IDEE.md` (storico/superato: il modello reale è il §4 qui sotto).
>
> Stato: design ampliato con l'utente il **2026-05-31**. Non ancora avviato in
> codice (la prima fase è M1).

---

## 1. Visione

L'app non è più "solo poker". È un'app per **segnare le partite** che un gruppo
(o tu da solo, coi tuoi amici "guest") fa a **qualsiasi gioco**: carte, TCG,
giochi da tavolo. Apri → in pochi tap segni una partita.

- **Poker**: resta com'è oggi (schermata dedicata, soldi, settlement, timer),
  con un restyle grafico (tema feltro). Vive sotto `/poker`.
- **Tutti gli altri giochi**: usano una **schermata comune** semplice (senza
  soldi): sessioni, partite, vincitori/perdenti, classifiche, storico.

**Rebranding**: nome app → "Card Tracker" (cosmetico, fase M5).

---

## 2. Due mondi: Personale e Leghe (CHIAVE)

L'app ha **due ambiti** che usano lo **stesso identico flusso**:

1. **Personale** (il default, ciò che vedi aprendo l'app)
   - Giocatori = **guest**: nomi liberi, li aggiungi/modifichi al volo, **senza
     creare account** per ogni sessione.
   - Serve per "stasera gioco con questi amici, mi segno le partite" nel modo più
     veloce possibile.
   - Ha la **sua classifica e storico** (coi tuoi guest).

2. **Leghe** (gruppi "veri")
   - Stesso flusso, ma con i **giocatori della lega** (rubrica condivisa) che,
     in futuro (post-backend), avranno **ruoli/poteri** diversi.
   - Ogni lega ha la sua classifica/storico.

> **Modello**: il "Personale" è realizzato come una **Lega speciale** (es.
> `personale: true`, sempre presente, non cancellabile). Così riusa tutta la
> macchina sessioni/partite/statistiche senza codice doppio. La differenza è solo
> di presentazione (guest vs membri) e, in futuro, di permessi.

---

## 3. Gerarchia dei concetti

```
(Personale | Lega) → Gioco → Sessione → Partita
```
- **Gioco**: poker (speciale) o un gioco "comune" (preimpostato o custom).
- **Sessione**: una "tornata" di un gioco (es. "scopa di venerdì"). Programmabile
  in anticipo (stato `pre` → si avvia), orari inizio/fine automatici, contiene
  **più partite**, si chiude con un esito (anche **pareggio**).
- **Partita**: un singolo match dentro la sessione. Orari automatici. Si segnano
  **vincitore/i** (o pareggio) e i **partecipanti** (anche un sottoinsieme della
  sessione). Chiudere una partita **non chiude** la sessione.

---

## 4. Modello dati (giochi non-poker)

```ts
interface GiocoLega {
  id: string;             // 'magic', 'scopa', 'custom-<ts>'
  nome: string;
  preimpostato: boolean;
  foto?: string;          // dataURL caricato dall'utente (LOCALE, non nel repo)
  accent?: string;        // colore custom (i preimpostati lo prendono dal catalogo)
  attivo: boolean;
  pareggioComeVittoria: boolean; // default true (vedi §7)
}

interface PartitaGioco {
  id: number;
  ora_inizio: string;     // auto (HH:MM) all'avvio
  ora_fine: string;       // auto (HH:MM) alla chiusura
  vincitori: number[];    // id_nome (vuoto + pareggio=true → pareggio)
  pareggio: boolean;
  partecipanti?: number[]; // override: chi ha giocato QUESTA partita (default: quelli della sessione)
  nomeLibero?: string;     // gioco "una tantum"/sconosciuto segnato per la singola partita
}

interface SessioneGioco {
  id: number;
  giocoId: string;
  data: string;           // "YYYY-MM-DD"
  stato: 'pre' | 'attiva' | 'chiusa';
  ora_inizio: string;     // programmata, poi reale all'avvio
  ora_fine: string;       // auto alla chiusura
  partecipanti: number[]; // id_nome di default per le partite
  partite: PartitaGioco[];
  esitoPareggio: boolean;  // true se la sessione è chiusa in pareggio
}
```

Estensione `Lega`:
```ts
interface Lega {
  // ...esistenti...
  personale?: boolean;          // true SOLO per la lega "Personale"
  giochi?: GiocoLega[];
  sessioniGioco?: SessioneGioco[];
  _sgid?: number;  // auto-increment sessione gioco
}
```
- Il poker continua a usare `partite`/`sessioneAttiva`/`serate_bg` esistenti.
- I giochi comuni usano `sessioniGioco`. Migrazione **idempotente**: campi assenti
  → trattati come vuoti, **poker mai toccato**.

> ⚠️ **DA DECIDERE prima di M3 (non per M1/M2)** — naming "Sessioni" del poker.
> `TAVOLO_LIVE_SPEC §6` rinomina l'ingresso poker in "Sessioni". Due letture:
> **(a) contenitore**: una "Sessione" poker = serata che contiene più "partite"
> (ogni cash/torneo è una partita "pesante") → richiederebbe un contenitore-serata
> nuovo per il poker; **(b) solo rename**: l'attuale `Sessione` (un cash/torneo)
> resta tale, si cambiano solo le etichette UI. (a) è più coerente con questa
> gerarchia (Sessione⊃Partite) e più utile (raggruppa "torneo + cash della stessa
> sera"), ma è lavoro dati in più; (b) è a costo ~zero. **M1 e M2 non dipendono da
> questa scelta** (M1 non tocca il poker; M2 sposta solo il poker sotto `/poker`,
> **senza rinominare**). La scelta si fa **all'inizio di M3**; il **rename UI** in
> "Sessioni" avviene poi nella fase **tavolo-live** (#6 in CONTESTO, vedi
> `TAVOLO_LIVE_SPEC §6`), non in M2.
>
> 🔵 **Indicazione utente (2026-06-01)**: propende per **(a) contenitore** — anche il
> poker **apre una sessione** e dentro gioca le **partite** una alla volta (es. il cash
> o il torneo della serata, e più cose della stessa sera stanno nella stessa sessione).
> Quindi a M3 si dettaglia il **contenitore-serata** del poker, non il solo-rename.
> Conferma definitiva + piano migrazione dati **a M3**.

### Nota "partita generica/sconosciuta"
La richiesta "segnare una partita con il nome del gioco sconosciuto per ogni
partita" si realizza con `PartitaGioco.nomeLibero`: dentro una sessione del gioco
**Generico** (o di qualsiasi gioco), una partita può dichiarare un nome libero.
Utile per giochi una tantum che non vale la pena aggiungere al catalogo.

---

## 5. Mappa dell'app: sezioni, ordine e cosa fai dove

> Richiesta esplicita dell'utente. Questa è la **IA (information architecture)**
> di riferimento per M2.

**Navigazione principale** (bottom nav, 4 voci):

1. **Home — "Segna partita"** (è ciò che vedi aprendo l'app, ambito Personale)
   - In cima: **GameBar** (filtro gioco, ri-tema l'app — vedi DESIGN_SPEC §5).
   - Obiettivo: **nel minor numero di tap** → apri sessione → scegli gioco (o
     Generico) → aggiungi/edita i **guest** → segni le **partite** (partecipanti,
     vincitori/perdenti, eventuale nome libero).
   - Mostra la **sessione in corso** (se c'è) con le sue partite, e il pulsante
     per chiuderla.

2. **Classifica** (ambito filtrabile)
   - In cima la **GameBar** (stesso gioco selezionato, stesso tema).
   - **Filtri**: ambito = **Personale / una mia Lega / Generale** (somma di tutto
     ciò che è su questo dispositivo) + per **gioco** + per **persona**.
   - Mostra % partite vinte/giocate, sessioni vinte, **icona corona** al leader
     (glifo SVG, non emoji — vedi §8 e decisione "niente emoji" in DESIGN_SPEC §4).

3. **Storico** (ambito filtrabile, stessi filtri della Classifica)
   - Elenco sessioni/partite con date, ore, partecipanti, esiti. Apribili nel
     dettaglio.

4. **Leghe**
   - Elenco delle tue leghe → entri in una → **sezione lega dedicata** con **nav
     propria a 4 schede: Home / Classifica / Storico / Giocatori** (decisione
     2026-06-02 — sostituisce l'Hub a schermata singola). Simmetrica alla shell
     globale, con **"Giocatori"** (rubrica della lega) al posto di "Leghe".
     - **Home** lega = scelta gioco (griglia) + **segna partita** per la lega.
     - **Classifica/Storico** lega = ambito ristretto a quella lega.
     - Qui **NON** c'è la GameBar globale: il gioco si sceglie dalla griglia in Home.
     - Un **admin** può rendere la lega **mono-gioco** (si entra dritti nel gioco).
   - ⚠️ R/M2 ha costruito la versione "Hub singolo" (griglia + rubrica); la sezione a
     4 schede si realizza con **M3**. Da chiarire in M4: rapporto tra Classifica/
     Storico **di lega** e quelle **globali** filtrabili per ambito (punti 2-3).

> Riassunto "cosa fai dove":
> - **segnare una partita veloce, da solo** → Home (Personale).
> - **vedere come vai / chi vince** → Classifica (filtri).
> - **rivedere cosa è stato giocato** → Storico (filtri).
> - **giocare con un gruppo "vero"** → Leghe → Hub → gioco.

---

## 6. Flusso d'uso (gioco comune)

1. Scegli il gioco (GameBar in Home, o griglia nella Lega).
2. **Crea sessione** (programmabile): partecipanti, data, ora (anche futura) →
   stato `pre`.
3. **Avvia sessione** → `attiva`, ora_inizio reale.
4. Dentro la sessione: **Avvia partita** (ora_inizio auto) → gioca → **Chiudi
   partita** (ora_fine auto) + segna vincitore/i (o pareggio) + eventuali
   partecipanti/nome libero. La **sessione resta attiva**. Ripeti.
5. **Chiudi sessione** → `chiusa`, ora_fine auto. Vincitore sessione = chi ha
   vinto **più partite**; chiusura **in pareggio** possibile.

---

## 7. Statistiche e pareggi

Per ogni giocatore, per ogni gioco (derivate da sessioni/partite **chiuse**):
- **Sessioni**: giocate, vinte, perse, pareggi.
- **Partite**: giocate, vinte, perse, pareggi.
- **% partite vinte / partite giocate** (NON sessioni).
- **Sessioni vinte** (conteggio).

Definizioni:
- Partita **vinta** = `idNome ∈ partita.vincitori`; **pareggio** = `partita.pareggio`.
  "Giocata" = `idNome` è nei partecipanti (della partita se presenti, sennò della
  sessione).
- Sessione **vinta** = ha vinto più partite di tutti, da solo; **pareggio** =
  parità in testa **oppure** `esitoPareggio`; **persa** = altrimenti.

**Pareggio configurabile** (`pareggioComeVittoria`, default **true**): se true, i
pareggi contano **come vittorie** nella % ; se false, restano contati a parte e
NON entrano nella %.

---

## 8. Classifiche

- **Per gioco** (dentro la schermata del gioco): tabella con tutti i dati di §7
  per ogni giocatore + storico. Ordinabile.
- **Globale / filtrabile** (sezione Classifica, §5): per ogni gioco mostra **%
  partite vinte/giocate** + **numero sessioni vinte**, rispettando
  `pareggioComeVittoria`. **Icona corona** (glifo, non emoji) a chi guida ogni gioco.
- **Poker nella globale** (caso speciale): il poker ha il **suo** modello (tipo
  `Sessione` con soldi/settlement), non il generico `SessioneGioco`, quindi **non** si
  misura con la % di partite di §7. Si ordina per **netto totale** (€), dal **più
  vincente al più perdente**; il leader (corona) è il **maggior vincitore netto**. È
  già così nel codice (`TabClassifica` ordina per `totaleNetto`). La riconciliazione
  col resto della tabella si fissa **in M4** (dipende dal nodo sessione/dati poker di
  M3, vedi §4).
- **Ambito Generale** (somma su tutte le leghe + personale del dispositivo):
  pre-backend l'identità tra leghe è **best-effort per nome** (stesso nome =
  stessa persona). Post-backend diventa esatta (utenti veri). Documentare il
  limite in UI.

---

## 9. Giochi: preimpostati + custom

- **Preimpostati**: catalogo fisso in `src/utils/giochi.ts` (id, nome, accento,
  glifo) — vedi tabella in **DESIGN_SPEC §4**. Tutti (tranne poker) aprono la
  schermata comune.
- **Poker**: unico con schermata propria (l'app attuale) e tema feltro.
- **Custom**: l'utente crea un gioco con **nome (+ foto opzionale, locale)** →
  ottiene la schermata comune e i default (`pareggioComeVittoria=true`, accento
  derivato dal nome). Vedi DESIGN_SPEC §4.

**Loghi**: mai loghi di marca nel repo (copyright). Solo icone originali + nome.
Vedi DESIGN_SPEC §4.

---

## 10. Navigazione (routing)

| Route | Schermata |
|---|---|
| `/` (o `/segna`) | **Home "Segna partita"** (Personale) + GameBar |
| `/classifica` | Classifica filtrabile (Personale/Lega/Generale × gioco × persona) |
| `/storico` | Storico filtrabile |
| `/leghe` | Elenco leghe |
| `/leghe/:legaId` | **Sezione lega**: nav a 4 schede Home/Classifica/Storico/Giocatori (vedi §5; sotto-route da definire in M3) |
| `/leghe/:legaId/poker/*` | App poker attuale (invariata, tema feltro) |
| `/leghe/:legaId/g/:giocoId` | Schermata comune del gioco |
| `/personale/g/:giocoId` | Schermata comune del gioco in ambito Personale |

- La **gestione giocatori** (rubrica) si sposta nell'Hub di lega; in Personale è
  la lista guest.
- Il routing attuale (login → lista leghe → poker) viene **riorganizzato** in M2.
  Mantenere la retrocompat dei dati (le leghe esistenti restano).

---

## 11. Fasi di implementazione

> L'ordine definitivo (con R = restyle) è in **CONTESTO.md**. Qui il contenuto.

1. **M1 — Modello dati + statistiche** (NO UI): tipi `GiocoLega/SessioneGioco/
   PartitaGioco`, estensione `Lega` (+ `personale`), catalogo giochi, migrazione
   idempotente (`migrateLega` pura, agganciata da M2), funzioni pure di statistica
   (§7) con test Vitest.
2. **R/M2 — Design system + Shell + routing + Personale**: token scuri + meccanismo
   accento/tema (DESIGN_SPEC), libreria UI + prime icone, bottom nav (Home/
   Classifica/Storico/Leghe), GameBar persistente, ambito Personale, Hub di lega,
   **poker spostato sotto `/poker`** + restyle feltro. Poker invariato nella logica.
   (R e M2 vanno insieme: i token nascono con la shell, il restyle poker è il
   passaggio dedicato.)
3. **M3 — Schermata comune del gioco**: crea/avvia sessione, avvia/chiudi partita
   (auto-orari, vincitori/perdenti, partecipanti, nome libero), chiudi sessione
   (+ pareggio), storico della sessione. **È il cuore "segna partita".** All'inizio
   di M3 si scioglie il nodo naming "Sessioni" del poker (vedi §4).
4. **M4 — Classifiche**: per-gioco + globale filtrabile (§8), ambiti.
5. **Soldi d'uscita** (poker, `USCITA_CASH_SPEC`): funzione pura `saldoUscita` +
   esempi-test, poi modello/store/azioni. **Riusa** `calcolaSettlement`/
   `calcolaSettlementTorneo`, non li duplica.
6. **Tavolo live + cassa + timer + "Sessioni"** (`TAVOLO_LIVE_SPEC`): estende
   `TavoloView.tsx` (cassa al centro, menù soldi sul posto, timer per-persona,
   settlement live). Qui il **rename UI "Sessioni"**. Dipende dalla shell (2) e dal
   punto (5).
7. **M5 — Rebranding "Card Tracker"** + UI giochi custom + rifinitura icone/identità.
8. **(Post-backend)** ruoli/permessi per-gioco, dati personali cross-device,
   spettatori (vedi `archivio/IDEE.md`).

Ogni fase: branch dedicato, micro-commit, push, test, review prima del merge.

---

## 12. Cosa NON toccare
- Tutto il **poker** (modello, settlement cash/torneo, overlay, timer): si sposta
  sotto `/poker` e cambia solo **aspetto** (tema feltro), non logica.
- `vanillaCompatStorage`, `calcolaSettlement`, `calcolaSettlementTorneo`.

---

## 13. Riepilogo decisioni (2026-05-31)
- Due ambiti, stesso flusso: **Personale** (guest, default all'apertura) e
  **Leghe**; il Personale è una Lega speciale.
- Home = "segna partita" veloce; GameBar persistente che ri-tema l'app.
- Sezioni: Home / Classifica / Storico / Leghe (filtri ambito+gioco+persona).
- Partita: vincitori/perdenti + partecipanti per-partita + **nome libero**.
- Stat a 2 livelli (sessione/partita), pareggio = vinta di default (configurabile).
- Classifica globale: % partite vinte/giocate + sessioni vinte, icona corona al leader.
- Giochi preimpostati + custom; icone originali, **niente loghi di marca**.
- Grafica scura + accento per gioco; **poker = feltro** (vedi DESIGN_SPEC).
