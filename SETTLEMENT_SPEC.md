# SETTLEMENT SPEC — Chiusura serata CASH

> Specifica della logica di chiusura del cash game. Questo documento è il
> **contratto**: l'implementazione deve seguirlo alla lettera, con gli esempi
> del §14 come test automatici. Il torneo ha un modello suo (§13).

---

## 1. Scopo

Due principi che guidano tutto:
1. **Il debito di un giocatore si elide contro le SUE fiche** (auto-compensazione).
2. **Soldi già nel piatto** (Cassa) e **contanti che cambiano mano** (Trasferimenti)
   sono due cose distinte e vanno presentate in DUE schermate separate. La schermata
   "Trasferimenti" mostra solo i contanti veri.

Il modello attuale fallisce su entrambi: tratta debiti e vincite come liste separate
(un giocatore può apparire sia tra chi paga sia tra chi riceve), e mette nei
trasferimenti anche la ridistribuzione passiva dei soldi già nel piatto.

---

## 2. Decisioni prese (definitive)

1. **Dati**: `versato` diventa un **numero libero** per giocatore (quanto ha
   effettivamente messo nel piatto). Spariscono i sì/no per ogni contribuzione.
2. **Algoritmo**: greedy "dal più grande al più grande", con auto-compensazione
   del debito contro le fiche (§8). Prevedibile, modificabile a mano.
3. **Due schermate distinte alla chiusura**:
   - **Il Piatto (Cassa)**: visibile. Totali + (a scomparsa) di chi sono i soldi.
   - **I Trasferimenti**: SOLO i contanti che cambiano mano.
4. **Implementazione**: fase dedicata, con test automatici sugli esempi del §14.

---

## 3. Modello dati

Per ogni `GiocatoreSessione` (cash):
- `entrata: number` — quanto si è seduto a giocare. Default = `Sessione.buy_in`,
  ma libero (10, 25, 10000…). Correggibile dall'admin in ogni momento (anche
  a serata in corso).
  - **UI**: input numerico per ogni giocatore "entrato" nella sub-tab giocatori
    cash. Visualizza il default ma è editabile.
  - **Torneo**: non usa questo campo. Il torneo mantiene `Sessione.buy_in`
    uniforme per il calcolo del monte premi e dei contributi.
- `ricariche: [{ importo: number }]` — solo gli importi (niente più `pagata`).
- `versato: number` — **numero libero**, quanto è realmente nel piatto a suo nome.
  Può essere minore di `dovuto` (non ha pagato tutto) o maggiore (ha versato di
  più, es. non aveva da cambiare). L'admin lo modifica liberamente.

**Drop**: `entrata_pagata`, `ricariche[i].pagata`, `extra_amt`, `extra_pagato`.

`Sessione.buy_in` resta come valore predefinito suggerito.

**Migrazione dati vecchi** (cash legacy → nuovo modello):
- `entrata = Sessione.buy_in` (default per chi non l'ha mai impostato)
- `ricariche = ricariche.map(r => ({ importo: r.importo }))`
- `versato = (buy_in_pagato ? Sessione.buy_in : 0) + sum(ricariche pagate) + (extra_pagato ? extra_amt : 0)`
- `extra_amt > 0` non pagato → diventa una ricarica `{ importo: extra_amt }`

**Migrazione intermedia** (v2 con `versato` ma senza `entrata`):
- Se `g.entrata === undefined` → `g.entrata = Sessione.buy_in` (cash only).
- Idempotente: chiamabile più volte senza effetti collaterali.

---

## 4. Definizioni (per ogni giocatore ENTRATO)

| Termine     | Formula |
|-------------|---------|
| `dovuto`    | `entrata + somma(ricariche.importo)` — lo stake totale |
| `versato`   | numero libero, quanto è nel piatto a nome suo |
| `mancante`  | `max(0, dovuto − versato)` — debito (≥ 0) |
| `eccedenza` | `max(0, versato − dovuto)` — soldi versati in più, da restituire |
| `fiche`     | fiche finali davanti al giocatore (admin a mano) |
| `netto`     | `fiche − dovuto` — **il risultato vero del giocatore** |

Solo i giocatori `entrato = true` entrano nel settlement. Servono **≥ 2** entrati.

---

## 5. Principio fondamentale

Ogni giocatore chiude alla cifra `netto`. **`somma(netti) dovrebbe fare 0`** (le
fiche totali = stake totale). Ma le fiche le conta l'admin a mano: se sbaglia,
non quadra. L'app non lo dà per scontato (§10).

---

## 6. La Cassa — schermata visibile

La Cassa è il piatto comune. **Schermata propria** alla chiusura:

- **Totale realmente nel piatto** = `somma(versato)`
- **Totale che dovrebbe esserci** = `somma(dovuto)` (se tutti avessero versato il dovuto)
- **Indicatore di quadratura** (verde se quadra, ⚠ con la differenza)
- **Pulsante "Di chi sono i soldi"** → schermata a scomparsa: ogni giocatore col
  proprio `versato`
- **Eccedenze**: ogni giocatore con `versato > dovuto` si riprende `eccedenza`
  dal piatto, automaticamente

La Cassa è il modo in cui circolano passivamente i soldi GIÀ versati: i
vincitori incassano da qui, con priorità ai propri soldi.

---

## 7. I Trasferimenti — solo contanti veri

Schermata propria alla chiusura, titolata **"CHI DÀ CONTANTI A CHI"**: elenca
**solo** i passaggi di contante che devono avvenire davvero.

Un giocatore compare nei trasferimenti **solo se**, dopo l'auto-compensazione
del §8, ha ancora `mancante' > 0` (deve mettere contanti adesso).

**Caso "sa"** (esempio fondamentale): entrata €25 versata, ricarica €10 non
versata, fiche €10 → `mancante = 10`, `fiche = 10` → si annullano →
`mancante' = 0` → **sa non compare nei trasferimenti**. I suoi €25 nel piatto
vanno passivamente ai vincitori (vista Cassa), ma sa non "dà" niente.

---

## 8. Algoritmo automatico

Per ogni giocatore entrato:

**Passo 1 — grandezze base**
- `mancante = max(0, dovuto − versato)`
- `versato_legitimo = min(versato, dovuto)` (esclude l'eccedenza, che è a parte)

**Passo 2 — auto-compensazione (il debito si elide contro le tue fiche)**
```
cancelled = min(mancante, fiche)
mancante' = mancante − cancelled
fiche'    = fiche    − cancelled
```

**Passo 3 — bisogni**
- `bisogno(p) = max(0, fiche' − versato_legitimo)` — quanti contanti p deve
  ricevere oltre ai suoi nel piatto

**Passo 4 — abbinamento greedy (genera la lista trasferimenti)**
Distribuisci `mancante'` ai bisogni:
- Debitori = giocatori con `mancante' > 0`, ordinati decrescente
- Creditori = giocatori con `bisogno > 0`, ordinati decrescente
- Per ogni debitore, scala `mancante'` distribuendolo dai creditori più grandi
- Ogni passaggio = un trasferimento `{ from, to, importo }`, arrotondato a 2 decimali

I `bisogni` non coperti dai trasferimenti vengono coperti **dal piatto**
(vista Cassa, automatico).

**Risultato**: lista trasferimenti totale = `somma(mancante')`. Se `mancante' = 0`
per tutti, la lista è vuota (la Cassa si bilancia da sola).

---

## 9. Override manuale (controllo totale)

- Ogni trasferimento suggerito è **modificabile** nell'importo
- Si può **aggiungere** un trasferimento tra DUE PERSONE QUALSIASI, di QUALSIASI importo
- Si può **eliminare** un trasferimento
- Vista chiara di chi-deve-a-chi: tutti i `from → to → importo`

L'algoritmo è solo un punto di partenza.

---

## 10. Check bilanciamento (non bloccante)

Per ogni giocatore, l'app calcola la sua posizione risultante (trasferimenti +
ciò che prende dal piatto) e la confronta col suo `netto`:
- ✓ se quadra (entro €0,01)
- ⚠ con la differenza altrimenti

Mostra anche lo **sbilancio globale** (`somma netti`): se ≠ 0 le fiche sono
state contate male.

**Mai bloccante**: si può sempre salvare, con un avviso.

---

## 11. Casi limite

- **< 2 giocatori entrati** → chiusura bloccata.
- **Fiche non quadrano** (`somma netti ≠ 0`) → si segnala, si procede.
- **Eccedenza** (`versato > dovuto`) → restituita dal piatto automaticamente.
- **Pareggio con debito** (`mancante = fiche`) → si annulla in §8, il giocatore
  esce dai trasferimenti.
- **Arrotondamenti**: 2 decimali; tolleranza €0,01.

---

## 12. Schermate (UI)

Dentro l'overlay partita, alla CHIUSURA, due schermate separate (più i debiti aperti):

1. **Cassa (Il Piatto)** — visibile (§6):
   - Totale nel piatto + totale dovuto + indicatore di quadratura
   - Pulsante "Di chi sono i soldi" → schermata a scomparsa col breakdown per giocatore
2. **Trasferimenti** — visibile (§7):
   - SOLO i passaggi di contante (`mancante'`)
   - Modificabili, aggiungibili, rimovibili (§9)
   - Check bilanciamento per giocatore (§10)

E nella schermata **Debiti aperti** (esistente, fuori dall'overlay):
- Aggiungere un pulsante globale "**Salda tutti i debiti**" che salda i debiti
  di TUTTI i debitori della lega (oggi c'è solo "Salda tutti di X" per singolo).

---

## 13. Torneo — modello separato

Il torneo ha un suo modello (`contributo_residuo` / `premio_residuo`), distinto
dal cash. La logica vive nella funzione pura `utils/settlementTorneo.ts`
(`calcolaSettlementTorneo`), usata da `apriChiusuraTorneo`.

**Auto-compensazione (fix 2026-05-21)**: prima dell'abbinamento greedy, per
ogni giocatore si elide `min(contributo_residuo, premio_residuo)` — lo stesso
principio del §8 cash, applicato ai due valori dello *stesso* giocatore. Senza,
un vincitore che non ha versato il buy-in risultava insieme debitore e
creditore, generando un trasferimento verso sé stesso (V→V) e un debito fittizio
nello storico. Esempio: vince 100 senza aver versato 25 → `contributo_residuo 0`,
`premio_residuo 75` → riceve 75 dagli altri, nessun V→V. Chi *ha* versato resta
invariato (riprende i propri soldi dal piatto). Coperto da `settlementTorneo.test.ts`.

---

## 14. Esempi lavorati = test obbligatori

Importi in €. Ogni riga = un test Vitest sulla funzione pura.

| # | Scenario | netto | Trasferimenti attesi |
|---|----------|-------|---------------------|
| 1 | A: entrata 25, versato 25, fiche 40 · B: entrata 25, versato 25, fiche 10 | A +15, B −15 | **nessuno** (il piatto: A prende 40, B prende 10) |
| 2 | A: entrata 25, versato 0, fiche 10 · B: entrata 25, versato 25, fiche 40 | A −15, B +15 | A→B €15 (cancel A: 10 fiche annullano 10 di mancante, residuo 15) |
| 3 | **sa**: entrata 25, versato 25, ricarica 10 (versato totale 25), fiche 10 · B: entrata 25, versato 25, fiche 50 | sa −25, B +25 | **nessuno** (sa: mancante 10 elide contro fiche 10) |
| 4 | A: entrata 25 + ricarica 25, versato 0, fiche 110 · altri 3 giocatori: entrata 25 versata 25 fiche 5 ciascuno | A +60, altri −20 ciascuno | nessuno (A: mancante 50 elide contro fiche 110) |
| 5 | A: entrata 25, versato 25 + ricarica 20 versato 0, fiche 80 · B fiche 0, C fiche 15 (entrambi entrata 25 versata 25) | A +35, B −25, C −10 | nessuno (A: mancante 20 elide contro fiche 80) |
| 6 | A entrata 10 versata 10 fiche 0 · B entrata 100 versata 100 fiche 110 | A −10, B +10 | nessuno (B prende 110 dal piatto: 100 suoi + 10 di A) |
| 7 | A entrata 25 versata 0 fiche 25 (pareggio) · B, C in pari | A 0, B 0, C 0 | nessuno (auto-compensazione totale per A) |
| 8 | A entrata 25 versata **30** (overpay 5) fiche 40 · B entrata 25 versata 25 fiche 10 | A +15, B −15 | nessuno; A si riprende l'eccedenza 5 dal piatto |
| 9 | A entrata 25 versata 0 fiche **0** · B entrata 25 versata 25 fiche 25 · C entrata 25 versata 25 fiche 50 | A −25, B 0, C +25 | **A→C €25** (A: mancante 25, fiche 0 → mancante' 25; C: bisogno 25) |
| 10 | **Buy-in misti, regolari**: A entrata 25 versata 25 fiche 30 · B entrata **10** versata 10 fiche 5 | A +5, B −5 | **nessuno** (A: bisogno 5, B: niente da dare; A prende 5 dal piatto, B 5 dal piatto) |
| 11 | **Buy-in misti + debito**: A entrata 25 versata 0 fiche 5 · B entrata **10** versata 10 fiche 30 | A −20, B +20 | **A→B €20** (A: mancante 25, cancelled=5 → mancante' 20; B: bisogno 20) |
| 12 | **Buy-in misti, B non versa**: A entrata 25 versata 25 fiche 35 · B entrata **10** versata 0 fiche 0 | A +10, B −10 | **B→A €10** (B: mancante 10, fiche 0 → mancante' 10; A: bisogno 10) |

**Detail ES.10/11/12**: dimostrano che `dovuto = entrata + somma(ricariche)` con
`entrata` per-giocatore (NON `Sessione.buy_in` per tutti). I 9 test base
funzionano già perché `calcolaSettlement` accetta `dovuto` come input puro;
questi 3 test in più verificano che la pipeline `useComputeLive` calcoli
correttamente `dovuto` quando `g.entrata ≠ sess.buy_in`.

**Detail ES.3** (il caso "sa"): `dovuto 35, versato 25, mancante 10, fiche 10`.
Passo 2: `cancelled = min(10, 10) = 10`. `mancante' = 0, fiche' = 0`. sa esce
da debitori e creditori. I suoi €25 versati restano nel piatto, B li incassa
nel piatto. ✓

**Detail ES.9** (trasferimento non banale): A non ha versato niente e non ha
fiche → niente da elidere. `mancante' = 25` interamente. C ha vinto €25 (bisogno
25). Trasferimento diretto A→C €25.

---

## 15. Note implementative

- Fase dedicata, su branch suo.
- Funzione **pura** (`calcolaSettlement`) separata dalla UI, testabile in isolamento.
- Test automatici (Vitest) sulla tabella §14 — collaudo del modello.
- Le schermate Cassa e Trasferimenti vivono dentro l'overlay partita (dalla Fase A).
- Aggiunta pulsante globale "Salda tutti i debiti" nella schermata Debiti aperti.
