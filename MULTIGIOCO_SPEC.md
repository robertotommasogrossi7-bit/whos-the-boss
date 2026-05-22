# CARD TRACKER — SPEC (trasformazione multi-gioco)

> Trasformazione dell'app da **poker tracker** a **"Card Tracker"**: un tracker
> per gruppi di amici che giocano a carte (e non solo). Questo file è il
> contratto di design dell'INTERA operazione. Sostituisce il design preliminare
> in `IDEE.md` (che resta come storico). Implementazione a fasi (chat dedicate).
>
> Stato: design deciso con l'utente 2026-05-22. Non ancora avviato.

---

## 1. Visione

La lega non è più "solo poker": è un gruppo di amici che gioca a **più giochi**.
Entri nella lega → scegli il gioco → giochi e ti segni i risultati.
- **Poker**: resta com'è oggi (schermata dedicata, soldi, settlement).
- **Tutti gli altri giochi**: usano una **schermata default comune** (semplice,
  senza soldi) finché non ne personalizziamo qualcuno in futuro.

**Rebranding**: nome app → "Card Tracker" (titolo, README, intestazioni). È
cosmetico, va in una fase a sé.

---

## 2. Gerarchia dei concetti (CHIAVE)

```
Lega → Gioco → Sessione → Partita
```
- **Lega**: gruppo di amici (`nomi`) + i giochi che praticano.
- **Gioco**: poker (speciale) o un gioco "default" (predefinito o custom).
- **Sessione di gioco**: una "serata" di un gioco (es. "scopa di venerdì").
  - **Programmabile in anticipo** (come la serata poker: stato `pre` → si avvia).
  - Rilevamento automatico ora inizio/fine.
  - Contiene **più partite**.
  - Si chiude (con un esito), e si può chiudere anche **in pareggio**.
- **Partita**: una singola mano/match dentro la sessione.
  - Rilevamento **automatico** di ora inizio e fine.
  - Si segna il/i **vincitore/i** (o pareggio).
  - Quando una partita si chiude, **la sessione resta aperta** (se ne può
    avviare un'altra). La sessione si chiude separatamente, a parte.

> Nota: questo modello a 2 livelli (Sessione→Partite) vale per i giochi
> "default". Il poker mantiene il suo modello attuale separato.

---

## 3. Modello dati (giochi non-poker)

```ts
interface GiocoLega {
  id: string;             // 'magic', 'scopa', 'custom-<n>'
  nome: string;
  preimpostato: boolean;
  foto?: string;          // dataURL (custom) o chiave logo (predefiniti)
  attivo: boolean;
  pareggioComeVittoria: boolean; // default true (vedi §6)
}

interface PartitaGioco {
  id: number;
  ora_inizio: string;     // auto (HH:MM) all'avvio
  ora_fine: string;       // auto (HH:MM) alla chiusura
  vincitori: number[];    // id_nome (vuoto + pareggio=true → pareggio)
  pareggio: boolean;
}

interface SessioneGioco {
  id: number;
  giocoId: string;
  data: string;           // "YYYY-MM-DD"
  stato: 'pre' | 'attiva' | 'chiusa';
  ora_inizio: string;     // programmata, poi reale all'avvio
  ora_fine: string;       // auto alla chiusura
  partecipanti: number[]; // id_nome
  partite: PartitaGioco[];
  esitoPareggio: boolean;  // true se la sessione è chiusa in pareggio
}
```

Estensione `Lega`:
```ts
interface Lega {
  // ...esistenti...
  giochi?: GiocoLega[];
  sessioniGioco?: SessioneGioco[];
  _sgid?: number;  // auto-increment sessione gioco
}
```
- Il poker continua a usare `partite`/`sessioneAttiva`/`serate_bg` esistenti.
- I giochi default usano `sessioniGioco`. Migrazione idempotente: campi assenti
  → trattati come vuoti, **poker mai toccato**.

---

## 4. Flusso d'uso (gioco default)

1. Hub lega → scegli un gioco → schermata del gioco.
2. **Crea sessione** (programmabile): scegli partecipanti, data, ora (anche
   futura). Nasce in stato `pre`.
3. **Avvia sessione** → stato `attiva`, ora_inizio = ora reale.
4. Dentro la sessione: **Avvia partita** → registra ora_inizio automatica.
   - **Chiudi partita** → registra ora_fine automatica + segna vincitore/i
     (o pareggio). La **sessione resta attiva**.
   - Ripeti per quante partite vuoi.
5. **Chiudi sessione** → stato `chiusa`, ora_fine automatica.
   - Esito automatico: vincitore sessione = chi ha vinto **più partite**.
   - Possibile chiudere **in pareggio** (parità o scelta esplicita).

---

## 5. Statistiche da tracciare

Per ogni giocatore, per ogni gioco (derivabili dalle sessioni/partite):
- **Sessioni**: giocate, vinte, perse, pareggi.
- **Partite**: giocate, vinte, perse, pareggi.
- **% partite vinte / partite giocate** (NON sessioni).
- **Sessioni vinte** (conteggio).

Definizioni:
- Partita **vinta** = il giocatore è in `vincitori`. **Pareggio** = `pareggio=true`.
- Sessione **vinta** = ha vinto più partite di tutti (da solo). **Pareggio** =
  parità in testa o `esitoPareggio=true`. **Persa** = altrimenti.

---

## 6. Pareggi (configurabile per gioco)

- Campo `pareggioComeVittoria` per gioco. **Default: true** → una partita/sessione
  pareggiata conta **come vinta** nei calcoli (es. nella %).
- Se `false` (per giochi dove il pareggio è neutro): i pareggi NON contano come
  vittorie (restano conteggiati a parte come pareggi).
- Si può chiudere sia la singola **partita** sia la **sessione** in pareggio.

---

## 7. Classifica interna per gioco

Dentro la schermata del gioco: tabella con TUTTI i dati del §5 per ogni
giocatore + **storico** di sessioni e partite (con date e ore). Ordinabile.

---

## 8. Menù generale (classifica globale)

Schermata d'insieme della lega, **filtrabile per gioco e per persona**.
Per ogni gioco mostra, per giocatore:
- **% partite vinte su partite giocate** (non sessioni);
- **numero di sessioni vinte**.
Il conteggio rispetta `pareggioComeVittoria` del singolo gioco (default:
pareggio = vinta). 👑 a chi guida ogni gioco.

---

## 9. Giochi: predefiniti + custom

- **Predefiniti**: catalogo fisso (con logo). Per ora TUTTI (tranne poker)
  aprono la **schermata default**.
- **Poker**: unico con schermata propria (l'app attuale).
- **Custom**: l'utente aggiunge un gioco inserendo **nome + foto** → ottiene la
  schermata default e le **impostazioni di default** (`pareggioComeVittoria=true`).

---

## 10. Navigazione (routing)

| Route | Schermata |
|---|---|
| `/app/:legaId` | Hub lega: griglia giochi + classifica globale + giocatori |
| `/app/:legaId/poker/*` | App poker attuale (invariata, spostata sotto `/poker`) |
| `/app/:legaId/g/:giocoId` | Schermata default del gioco (sessioni/partite/classifica/storico) |

La gestione giocatori (rubrica) si sposta nell'hub.

---

## 11. Fasi di implementazione

1. **M1 — Modello dati**: tipi `GiocoLega`/`SessioneGioco`/`PartitaGioco`,
   estensione `Lega`, catalogo giochi, migrazione idempotente, + funzioni pure
   di statistiche (§5/§6) con test Vitest. Nessuna UI.
2. **M2 — Hub + routing**: hub lega, poker spostato sotto `/poker`, gestione
   giocatori nell'hub. Poker invariato.
3. **M3 — Schermata default del gioco**: crea/avvia sessione (programmabile),
   avvia/chiudi partita (auto-orari), chiudi sessione (+ pareggio), storico.
4. **M4 — Classifiche**: interna per gioco (§7) + menù globale filtrabile (§8).
5. **M5 — Rebranding "Card Tracker"** (nome, README, titoli) + giochi custom UI.
6. **(Futuro, post-backend)** — ruoli/permessi per-gioco (vedi `IDEE.md`).

Ogni fase: branch dedicato, micro-commit, push, test, review prima del merge.

---

## 12. Cosa NON toccare
- Tutto il **poker** (modello, settlement cash/torneo, overlay, timer): si
  sposta sotto `/poker` ma non cambia.
- `vanillaCompatStorage`, `calcolaSettlement`, `calcolaSettlementTorneo`.

---

## 13. Riepilogo decisioni (2026-05-22)
- Gerarchia **Sessione → Partite**; la partita chiude senza chiudere la sessione.
- Sessione **programmabile** in anticipo; orari partita **automatici**.
- Statistiche a 2 livelli (sessione e partita): V / S / pareggi.
- Vincitore sessione = più partite vinte; chiusura in pareggio possibile.
- Classifica globale: **% partite vinte/giocate** + **sessioni vinte**, filtrabile.
- Pareggio = vinta **di default**, configurabile per gioco.
- Giochi predefiniti → schermata default comune (poker escluso); custom con
  nome + foto + impostazioni di default.
