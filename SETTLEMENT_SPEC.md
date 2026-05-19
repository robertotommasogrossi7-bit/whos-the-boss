# SETTLEMENT SPEC — Chiusura serata CASH

> Specifica della logica di chiusura del cash game. Questo documento è il
> **contratto**: l'implementazione deve seguirlo alla lettera, con gli esempi
> del §12 come test automatici. Il torneo ha un modello suo, separato (§11).

---

## 1. Scopo

Sostituire il modello di settlement cash attuale, che ha un difetto reale:
tratta "chi deve soldi" e "chi ha vinto" come liste separate, così un giocatore
che **deve** soldi ma ha **vinto** fiche finisce in entrambe (paga e riceve allo
stesso tempo). Il nuovo modello compensa prima il debito di ognuno col proprio
risultato, poi distribuisce solo i residui.

---

## 2. Decisioni prese (definitive)

1. **Dati**: si sostituisce `extra_amt`/`extra_pagato` con `entrata` libera +
   `entrata_pagata`. L'ingresso non è più fisso (§3).
2. **Algoritmo**: greedy "dal più grande al più grande", con auto-compensazione
   (§7). Scelto perché prevedibile ("il perdente più grosso paga il vincitore
   più grosso") e semplice da verificare. Non si fa la minimizzazione del numero
   di transazioni: è un suggerimento comunque modificabile a mano, la
   prevedibilità vale più dell'ottimalità.
3. **Schermata**: la chiusura mostra direttamente i **trasferimenti finali**
   (chi dà contanti a chi), ognuno modificabile. La "Cassa" (§6) resta modello
   mentale che spiega il perché, non è una schermata a sé.
4. **Quando**: si implementa come **fase dedicata**, con test automatici sugli
   esempi del §12. Non a pezzi, non mischiato ad altro.

---

## 3. Cambio al modello dati

L'ingresso non è più fisso: ogni giocatore entra con la cifra che vuole.

`GiocatoreSessione` (cash):
- **rimuovere** `extra_amt`, `extra_pagato`
- **aggiungere** `entrata: number` — quanto il giocatore si è seduto a giocare.
  Default = `Sessione.buy_in`, ma modificabile liberamente (10, 25, 10000…).
  Resta correggibile dall'admin in qualsiasi momento.
- **aggiungere** `entrata_pagata: boolean` — ha versato la sua entrata? (sì/no,
  niente pagamenti parziali: per i casi strani c'è l'override manuale §8)
- `ricariche: [{ importo, pagata }]` — invariato

`Sessione.buy_in` resta, ma è solo il **valore predefinito** suggerito nel form.

**Migrazione dati vecchi**: `entrata = buy_in`, `entrata_pagata = buy_in_pagato`;
se `extra_amt > 0` → diventa una ricarica `{ importo: extra_amt, pagata: extra_pagato }`.

---

## 4. Definizioni (per ogni giocatore ENTRATO)

| Termine    | Formula |
|------------|---------|
| `dovuto`   | `entrata + somma(ricariche.importo)` — tutto lo stake, pagato o no |
| `versato`  | `(entrata_pagata ? entrata : 0) + somma(ricariche pagate)` — soldi messi nella Cassa |
| `mancante` | `dovuto − versato` — quanto NON ha ancora versato (≥ 0) |
| `fiche`    | fiche finali davanti al giocatore (inserite a mano dall'admin) |
| `netto`    | `fiche − dovuto` — **il risultato vero del giocatore** |

Solo i giocatori con `entrato = true` entrano nel settlement. Servono **≥ 2**
giocatori entrati, altrimenti la chiusura è bloccata con avviso.

---

## 5. Principio fondamentale

> **Ogni giocatore chiude alla cifra `netto`.** Vincitori: `netto > 0`.
> Perdenti: `netto < 0`.

Equivalente pratico: ogni giocatore **incassa `fiche`** e **versa `mancante`**.
Infatti `fiche − versato − mancante = fiche − dovuto = netto`. Vale per **tutti**,
anche per un vincitore con una ricarica non pagata.

**`somma(netti)` dovrebbe fare 0** (le fiche totali = lo stake totale). Ma le
`fiche` le conta l'admin a mano: se ha sbagliato il conteggio, `somma(netti) ≠ 0`.
L'app **non lo dà per scontato**: lo segnala e lascia comunque procedere (§9).

---

## 6. La Cassa (modello mentale)

La Cassa è il piatto comune: contiene `somma(versato)`, **nominativa** (si sa di
chi è ogni euro). Spiega il perché dell'algoritmo:

- Priorità: ognuno **si tiene i propri soldi** già nella Cassa, fino a `fiche`.
- Il `mancante` di ognuno è contante nuovo che deve arrivare ai vincitori.
- Se tutti pagano tutto (`mancante = 0` per tutti) la Cassa si bilancia da sola
  e i trasferimenti girano solo i soldi dei perdenti ai vincitori.
- I debiti persona-a-persona nascono dal `mancante` non versato **e** dal
  surplus che i perdenti lasciano in Cassa.

---

## 7. Algoritmo automatico consigliato

Per ogni giocatore entrato, calcola le grandezze del §4, poi:

**Passo 1 — grandezze per giocatore**
- `surplus = max(0, versato − fiche)` — soldi che lascia nella Cassa
- `bisogno = max(0, fiche − versato)` — soldi che gli servono oltre ai suoi
- `debito  = mancante` — contante che deve ancora tirare fuori

**Passo 2 — auto-compensazione (il debito si elide da solo)**
Per ogni giocatore, il suo `debito` annulla **per primo il suo stesso `bisogno`**:
```
conguaglio = min(debito, bisogno)
debito  -= conguaglio
bisogno -= conguaglio
```
Dopo questo passo ogni giocatore è **o** una fonte **o** una destinazione, mai
entrambe (dimostrabile: se `bisogno > 0` allora `surplus = 0` e `debito = 0`).
Questo passo implementa la regola "chi vince si toglie il debito da solo".

**Passo 3 — fonti e destinazioni**
- `fonte(p)        = arrotonda2(surplus + debito)`
- `destinazione(p) = arrotonda2(bisogno)`

**Passo 4 — abbinamento greedy**
- Ordina le fonti per importo decrescente, le destinazioni per importo decrescente
- Per ogni destinazione, preleva dalle fonti (dalla più grande) finché è soddisfatta
- Ogni prelievo genera un trasferimento `{ from, to, importo }`, `importo` arrotondato a 2 decimali
- Una fonte esaurita si scarta; si passa alla successiva

Risultato: lista di trasferimenti minima e sensata. Chi ha già pagato non
ripassa contante; i debiti si eliminano da soli.

**Se le fiche non quadrano** (`somma fonti ≠ somma destinazioni`): l'abbinamento
greedy lascia un residuo da una parte. È atteso — vedi §9.

---

## 8. Override manuale (requisito esplicito)

La schermata di chiusura dà **controllo totale**:
- Ogni trasferimento suggerito è **modificabile** nell'importo
- Si può **aggiungere** un trasferimento tra due persone qualsiasi, di qualsiasi importo
- Si può **eliminare** un trasferimento
- Vista chiara di **chi deve a chi**: tutti i `from → to → importo`

L'automatico (§7) è solo un punto di partenza: l'utente lo può stravolgere.

---

## 9. Check bilanciamento (non bloccante)

Per ogni giocatore l'app calcola la sua posizione risultante dai trasferimenti
attuali e la confronta col suo `netto`:
- ✓ verde se quadra (entro €0,01)
- ⚠ con la differenza se non quadra

Mostra anche lo **sbilancio globale** (`somma netti`): se ≠ 0, le fiche sono
state contate male.

Il check **non blocca mai**: si può sempre confermare e salvare, con un avviso
riepilogativo. L'utente ha l'ultima parola.

---

## 10. Casi limite

- **< 2 giocatori entrati** → chiusura bloccata con avviso.
- **Fiche non quadrano** (`somma netti ≠ 0`) → si segnala, si procede comunque.
- **Arrotondamenti**: tutti gli importi a 2 decimali; i trasferimenti arrotondati
  possono lasciare residui di €0,01, tollerati dai check.
- **`entrata` enorme o strana** (es. 10000) → nessun trattamento speciale, il
  modello è agnostico agli importi.
- **Giocatore che pareggia senza aver pagato** (`debito = fiche`, `netto = 0`) →
  si auto-compensa al Passo 2 ed esce dal settlement senza trasferimenti.

---

## 11. Torneo — fuori scope

Il torneo ha già un modello suo (`contributo_residuo` / `premio_residuo`) e qui
**non si tocca**. Le regole ricarica torneo (rebuy solo durante la late reg, a
quota fissa; add-on quando si vuole; tutto gestito da admin) sono già nell'app.

---

## 12. Esempi lavorati = test obbligatori

Buy-in default 25. Importi in €. Ogni riga va resa un test automatico.

| # | Input | netto atteso | Trasferimenti attesi |
|---|-------|-------------|---------------------|
| 1 | A: entrata 25 pagata, fiche 40 · B: entrata 25 pagata, fiche 10 | A +15, B −15 | B→A €15 |
| 2 | A: entrata 25 **non** pagata, fiche 10 · B: entrata 25 pagata, fiche 40 | A −15, B +15 | A→B €15 |
| 3 | A: entrata 25 + ricarica 25, **entrambe non pagate**, fiche 110 · altri perdono 60 | A +60 | altri→A, totale €60 |
| 4 | A: entrata 25 pagata + ricarica 20 **non** pagata, fiche 80 · altri perdono 35 | A +35 | altri→A, totale €35 |
| 5 | A: entrata 10 pagata, fiche 0 · B: entrata 100 pagata, fiche 110 | A −10, B +10 | A→B €10 |
| 6 | A: entrata 25 **non** pagata, fiche 25 (pareggia) · B,C in pari | A 0 | nessuno (A si auto-compensa ed esce) |

**Dettaglio ES.3** (auto-compensazione): A ha `dovuto 50, versato 0, mancante 50,
fiche 110`. `surplus 0, bisogno 110, debito 50`. Passo 2: `conguaglio = min(50,110)
= 50` → `debito 0, bisogno 60`. A diventa destinazione pura da €60. Il debito di
50 si è eliso contro le sue vincite. ✓

**Dettaglio ES.4**: A ha `dovuto 45, versato 25, mancante 20, fiche 80`.
`surplus 0, bisogno 55, debito 20`. Passo 2: `conguaglio 20` → `bisogno 35`.
A riceve €35. Il vincitore ha comunque "pagato" il suo mancante via compensazione. ✓

---

## 13. Note implementative

- Fase dedicata. Calcolo puro (fonti/destinazioni/greedy) in una funzione
  testabile isolata, separata dalla UI.
- Test automatici (Vitest) sulla tabella §12 — sono il collaudo del modello.
- La funzione di calcolo non deve dipendere da React: input = lista giocatori
  con le grandezze §4, output = lista trasferimenti.
