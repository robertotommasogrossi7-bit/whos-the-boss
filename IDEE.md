# IDEE — cambiamenti futuri grandi

> Bozza delle feature "grandi" non ancora pianificate in dettaglio. Le chat
> base leggono questo per capire QUANDO conviene affrontarle e con quali
> prerequisiti. Non è uno SPEC: è il "perché" e il "quando", non il "come".
>
> Stato: idee discusse con l'utente il 2026-05-21. Nessuna ancora avviata.

---

## Concetto chiave — lo spartiacque del backend

Oggi l'app vive su **un solo dispositivo** (quello dell'admin), dati in
`localStorage`. Gli altri giocatori sono solo *nomi in una rubrica*, non
utenti connessi.

Molte feature desiderate hanno lo **stesso prerequisito**: far comunicare più
dispositivi → un **backend** (Supabase, già in roadmap). È lo spartiacque:

- **Prima del backend** (single-device): tutto ciò che vede/fa *solo l'admin*.
- **Dopo il backend** (multi-device): spettatori che entrano nella serata,
  dati personali per ogni iscritto, ruoli/permessi (chi vede cosa).

Regola pratica: se una feature implica "altre persone da altri telefoni",
allora dipende dal backend.

---

## Idea 1 — Tavolo interattivo

### Cosa vuole l'utente
- Un tavolo visuale dove **far sedere le persone**.
- **Torneo**: assegnazione posti automatica.
- **Cash**: la casualità dei posti è un'opzione in più (non obbligatoria).
- L'admin può **aggiornare le fiche quando vuole** (live).
- **Visibile da tutti** quelli che entrano nella serata, anche spettatori non
  in gioco.

### Cosa c'è già nel codice (a favore)
- Modello `seat: { tavolo, posto }` su `GiocatoreSessione`.
- `assegnaPostiCasuali(sess)` in `utils/torneo.ts` (Fisher-Yates già pronto).
- `aggiornaFiches` / `fiches_finali` già esistono nello store.
→ La base dati c'è già; manca soprattutto la UI del tavolo.

### Si spezza in due tempi
1. **Tavolo locale** (sul dispositivo admin) — fattibile ORA:
   - UI del tavolo (posti, drag/assegna, casuale on/off nel cash, auto nel torneo)
   - aggiornamento fiche live
2. **Vista spettatori del tavolo** — DOPO il backend:
   - altri telefoni guardano lo stesso tavolo in tempo reale

### Momento consigliato
Tavolo locale: presto (naturale estensione del poker). Spettatori: dopo Supabase.

---

## Idea 2 — Multi-gioco (carte / board game)

### Cosa vuole l'utente
- Aggiungere altri giochi: **Magic, Yu-Gi-Oh, Pokémon, scopa, briscola,
  tresette** (e simili).
- **Senza** la complessità dei soldi del poker: servono solo a **segnare le
  partite** e **chi ha giocato/vinto**.
- Flusso: crei una lega con amici → entri nella lega → ti chiede **a quale
  gioco** state giocando → si apre la schermata di quel gioco con **classifica
  e roba dedicata**.
- **Dati personali**: ogni iscritto deve avere salvate tutte le sue partite a
  quel gioco, per vedere le proprie statistiche.
- **Ruoli/permessi**: il "potere" del singolo nella lega — molte schermate
  dovrebbero vederle solo l'admin. (L'utente stesso dice: "si svolge più
  avanti".)

### Perché è la più strutturale
Cambia l'**identità** dell'app: da "poker tracker" a "tracker di serate di
gioco". Implicazioni:

1. **Modello dati**: oggi `Lega`/`Sessione`/`Partita` sono *tutti poker*
   (buy_in, modalità cash/torneo, fiches, premi, settlement). Per il
   multi-gioco serve il concetto di **"tipo di gioco" sulla lega** e un
   **modello partita generico** per i giochi non-poker.
2. **Buona notizia**: i giochi non-poker sono *molto più semplici* del poker
   (niente soldi → niente settlement). La parte "chi ha giocato / chi ha vinto
   / classifica" è facile da modellare.
3. **Parte delicata = backend**:
   - **Dati personali del singolo** → richiede utenti veri che si collegano
     (identità che persiste tra dispositivi/leghe) → backend.
   - **Ruoli/permessi (admin vs membro)** → ha senso quando i dati sono
     condivisi e accessibili da più persone → backend.

### Scelta di fondo da prendere (presto, se l'idea è certa)
Introdurre la dimensione "tipo di gioco" nel modello dati **prima** che il
codice poker cresca troppo, MA **senza riscrivere il poker**: i giochi
semplici sono un binario separato e leggero accanto al poker. Decidere se
l'app deve diventare ufficialmente "multi-gioco" è una decisione di identità,
non solo tecnica.

### Si spezza in
1. **Multi-gioco base, locale** (single-device): scelta del gioco all'ingresso,
   modello partita semplice (giocatori + vincitore), classifica per gioco.
   Possibile anche prima del backend.
2. **Dati personali per utente reale** + **ruoli/permessi** — DOPO il backend.

### Momento consigliato
La versione *piena* (dati personali, ruoli) vuole il backend. La versione
*base* in locale si potrebbe anticipare, ma valutare se vale la pena prima di
aver deciso l'identità multi-gioco.

---

## Idea 2 — Design concreto (discusso 2026-05-22)

Navigazione oggi: clic sulla lega → si entra DIRETTAMENTE nell'app poker (4 tab).
Nuovo modello: clic sulla lega → **hub della lega** → scegli il gioco.

### Hub della lega (nuova schermata, subito dopo aver scelto la lega)
- **Scelta del gioco** (poker, Magic, Yu-Gi-Oh, Pokémon, scopa, briscola, tresette, …).
- **Classifica globale della lega**: vinte/perse per ogni giocatore in ogni gioco.
- **Elenco giocatori della lega**: l'attuale tab "Partecipanti" si SPOSTA qui
  (i giocatori sono della lega, non del poker; `lega.nomi` è già a livello lega).

### Dopo la scelta del gioco
- **Poker** → porta all'app attuale, invariata.
- **Altro gioco** → schermata dedicata con: **crea partita base** + classifica
  del gioco + storico del gioco.

### "Crea partita base" (nuovo, semplice — NON come il poker)
- Scegli le persone che partecipano.
- Segni chi ha vinto.
- Nessun soldo / buy-in / settlement.

### Terminologia
- NON chiamare "serata" la sessione avviata: si gioca anche di giorno.
  Usare "partita" (o "sessione").

### Modello dati (bozza)
- Una **lega contiene più giochi**: le partite sono "taggate" per gioco.
- Il poker resta il modello complesso esistente; i giochi semplici sono un
  modello parallelo LEGGERO, es. `PartitaSemplice { gioco, data, partecipanti[],
  vincitore/i }`.

### Decisioni aperte (da fissare nello SPEC)
1. Partita semplice: **un solo vincitore** o piazzamento/più vincitori?
2. Lista giochi **fissa** o anche giochi **custom** aggiunti dall'utente?
3. La classifica globale include anche il **poker**? (il poker ha un concetto di
   vittoria diverso → probabilmente classifica separata).
4. **Permessi/ruoli** (admin vs membro): confermato "più avanti" + dipende dal backend.

---

## Sequenza consigliata complessiva

1. **Step C — serata programmata** (orario + badge) → pronto, prossimo.
2. **Tavolo interattivo (locale)** → estende il poker, riusa `seat` /
   `assegnaPostiCasuali`.
3. **Backend (Supabase)** → il momento-cardine. Sblocca tutto il resto.
4. **Vista spettatori del tavolo** (post-backend).
5. **Multi-gioco pieno + ruoli/permessi** (post-backend).
   - (Eventuale multi-gioco *base* locale anticipabile, se si decide presto
     l'identità multi-gioco.)

### Perché questo ordine
- Le feature "single-device" (Step C, tavolo locale) danno valore subito,
  senza dipendenze.
- Il **backend è il collo di bottiglia** di quasi tutto il resto: affrontarlo
  prima delle feature multi-utente evita di costruire due volte le stesse cose.
- I **ruoli/permessi** arrivano per ultimi perché presuppongono utenti reali +
  dati condivisi (cioè il backend già in piedi).
