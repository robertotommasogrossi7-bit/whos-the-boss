# SERATA PROGRAMMATA — SPEC

> Specifica per la feature "orario d'inizio visibile + serata programmata".
> Da implementare DOPO il merge di `settlement-cash-v2` esteso con `entrata`
> (vedi `ENTRATA_V2_PROMPT.md`).

---

## 1. Scopo

Permettere all'utente di **programmare** una serata (cash o torneo) per
un'ora futura. La serata resta in attesa finché l'utente non preme
"Inizia ora". L'orario programmato è visibile nel **badge FAB in basso a
sinistra** (`FabPartiteAttive`), insieme alle impostazioni e a 3 azioni:
**Annulla**, **Inizia ora**, **Modifica setup**.

Oggi `creaSessione` setta già `stato: 'pre'` per entrambe le modalità, ma
non c'è UI per distinguere "serata programmata" da "serata in corso", né
azioni per gestire la transizione.

---

## 2. Modello dati

### Campi già esistenti (riusati)

- `Sessione.stato`: `'pre' | 'attivo' | 'pausa' | 'concluso'`.
  - `'pre'`: serata programmata, non ancora iniziata.
  - `'attivo'`: serata in corso (cash o torneo).
  - `'pausa'`, `'concluso'`: torneo only (invariati).
- `Sessione.ora_inizio: string` (formato "HH:MM"): orario PROGRAMMATO.
  Quando l'utente preme "Inizia ora", viene sovrascritto con l'ora corrente.
- `Sessione.data: string` (formato "YYYY-MM-DD"): giorno della serata.

### Nessun campo nuovo

Tutto il modello dati esistente è sufficiente. Niente migrazioni.

### Stato della sessione cash

- Cash oggi: nasce in `'pre'` da `creaSessione`, ma il codice non
  controlla `s.stato` nel flusso cash. Va aggiunto un check in `LiveView`
  per dispatchare a `WaitingPanel` quando `stato === 'pre'`.
- Cash: non usa mai `'pausa'`. Le transizioni sono `pre → attivo →
  (chiusura)`. La chiusura porta a `serataView: 'chiusura'` e poi a
  cancellazione della sessione (come oggi).

---

## 3. Flusso utente

### Creazione

1. Utente: tab Serata → "Nuova partita" → SetupForm.
2. Inserisce data, ora di inizio (programmata), modalità, buy-in,
   partecipanti, eventuale config torneo.
3. Preme "▶ Inizia serata".
4. La sessione viene creata in `stato: 'pre'` (è già il default).
5. L'overlay si chiude (`closeOverlay`) e si torna alla home tab. La
   sessione appare nel FAB-sx come "programmata".

### Visualizzazione nel FAB-sx

Per ogni partita nel panel:
- Se `stato === 'pre'`: aggiungere una **seconda riga** o pill
  con "🕐 inizia alle HH:MM" (oppure "🕐 oggi alle HH:MM" / "🕐 domani
  alle HH:MM" se data ≠ oggi).
- Se `stato === 'attivo'` o `'pausa'`: come oggi (indicatore ▶ / ⏸).

### Apertura di una serata programmata

Tap sulla voce nel FAB-sx → overlay si apre → poiché `stato === 'pre'`,
mostra `WaitingPanel` (al posto della normale `LiveView`).

### `WaitingPanel` — pannello d'attesa

Card centrale con:
- Titolo: "🕐 Serata programmata"
- Riepilogo: data, ora_inizio, modalità (cash/torneo), buy_in, numero
  partecipanti, e (torneo) fiche iniziali / durata stimata / numero livelli.
- 3 bottoni in colonna (mobile-first):
  1. **▶ Inizia ora** (primario, verde): chiama `iniziaOra(legaId)`.
  2. **✎ Modifica setup** (secondario, grigio): chiama `modificaSetup(legaId)`.
  3. **🗑 Annulla serata** (rosso): chiama `annullaSerata(legaId)` con
     conferma.

### Transizioni di stato

#### "Inizia ora"
- `sess.stato → 'attivo'`
- `sess.ora_inizio = nowHHMM()` (ora corrente in formato "HH:MM")
- Per il torneo: `sess.inizio_livello_ms = Date.now()` (parte il timer).
- L'overlay continua a essere aperto e `LiveView` ora mostra il normale
  contenuto live.

#### "Modifica setup"
- L'utente vuole cambiare data, ora, modalità, buy-in, partecipanti o
  config torneo.
- Approccio: la sessione è in `'pre'` → non ha stato di gioco da
  perdere. Si torna al SetupForm precompilato con i valori della
  sessione attiva.
- Quando l'utente preme di nuovo "▶ Inizia serata", la sessione esistente
  viene **aggiornata** (non duplicata): aggiorna `data`, `ora_inizio`,
  `ora_fine`, `buy_in`, `modalita`, `giocatori` (lista), e config torneo
  se rilevante. `stato` resta `'pre'`.
- Implementazione: store action `aggiornaSetupSerata(legaId, sess)` o
  flag `_setupEditing` + comportamento condizionale in `avviaSessione`.

#### "Annulla serata"
- Conferma JS (`confirm("Annullare la serata programmata?")`).
- Se OK: rimuove la sessione attiva, promuove `serate_bg[0]` se esiste
  (stesso comportamento di `annullaSessione` esistente).
- Chiude l'overlay.

---

## 4. Componenti / file toccati

### Nuovi
- `src/components/serata/WaitingPanel.tsx` — il pannello d'attesa (§3).

### Modificati
- `src/components/serata/LiveView.tsx`: dispatch su `sess.stato`. Se
  `'pre'` → `<WaitingPanel />`, altrimenti contenuto attuale.
- `src/components/common/FabPartiteAttive.tsx`: mostra orario
  programmato se `stato === 'pre'`.
- `src/store/useStore.ts`: nuove azioni
  - `iniziaOra(legaId)`: transizione `pre → attivo`.
  - `modificaSetup(legaId)`: torna a `serataView: 'setup'` precompilato.
  - `aggiornaSetupSerata(legaId, sess)` (o equivalente).
- `src/components/serata/SetupForm.tsx`: deve sapere se è in modalità
  "create" o "edit". Se edit, precompila i campi dalla sessione attiva e
  chiama l'azione corretta al submit.

### Eventualmente
- `src/utils/format.ts`: utility `nowHHMM()`, `fmtRelativeDate(data)` per
  "oggi" / "domani" / "DD/MM" nel FAB.

---

## 5. Casi limite

- **Orario passato**: se l'utente programma le 21:00 e sono già le 22:00,
  l'app NON fa nulla di automatico. La serata resta in 'pre' finché
  l'utente non preme "Inizia ora". Nessun blocco.
- **Modifica setup su sessione attiva** (`stato === 'attivo'`): NON
  permesso. Il bottone "Modifica setup" appare solo in `WaitingPanel`
  (cioè quando `stato === 'pre'`).
- **Più serate programmate contemporaneamente**: supportato dal modello
  multi-sessione (`serate_bg`). Nessun cambio necessario.
- **Annulla con conferma**: usa `confirm()` (consistente con altre azioni
  distruttive del progetto).

---

## 6. Test

Niente logica di soldi, quindi niente Vitest sugli esempi-test
obbligatori. Solo test manuale in browser:

1. **Creazione**: nuova serata cash, ora_inizio 23:00, salva. Compare nel
   FAB-sx con "🕐 alle 23:00".
2. **Apertura**: tap → vedi WaitingPanel con riepilogo, NON la LiveView.
3. **Inizia ora**: premi "▶ Inizia ora" alle 22:50. `ora_inizio` salva
   "22:50" (verificabile in chiusura). LiveView appare normalmente.
4. **Modifica setup**: programma una serata, apri, premi "✎ Modifica
   setup". Torna al SetupForm con campi precompilati. Cambia il buy-in
   da 25 a 10. Premi "▶ Inizia serata". Riapri dal FAB-sx → vedi
   WaitingPanel con buy-in 10. Niente serata duplicata in `serate_bg`.
5. **Annulla**: programma, apri, "🗑 Annulla serata", conferma. Sparisce
   dal FAB-sx.
6. **Torneo programmato**: stesso flusso, "Inizia ora" parte anche il
   timer del primo livello.
7. **Multi-serata**: programma una cash + una torneo. Entrambe nel
   FAB-sx con i rispettivi orari.

---

## 7. Cose da NON toccare

- Modello settlement (cash e torneo) — questa fase non tocca i calcoli.
- Logica torneo (timer, livelli, premi).
- `vanillaCompatStorage`.
- Il dispatch `serataView: 'hub' | 'live' | 'setup' | 'chiusura'` resta
  invariato. `WaitingPanel` vive DENTRO `'live'`, dispatchato in base a
  `sess.stato`.
