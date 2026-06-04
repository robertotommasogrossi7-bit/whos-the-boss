# USCITA & SOLDI LIVE — SPEC (cash + torneo)

> Feature: gestire **i soldi durante la partita** (non solo alla chiusura). Un
> giocatore può **uscire dal tavolo a metà**, vincente o perdente, incassando da
> chi è già uscito, dagli altri o dalla cassa; i movimenti sono **a debito di
> default** e si **rivedono a fine partita**.
> Logica **identica per cash e torneo** (cambia solo come si calcola il "valore").
> È **logica di soldi** → questo SPEC ha gli esempi-test (§6) da rispettare PRIMA
> del codice. Stato: **modello deciso 2026-05-31**, da validare in review con gli
> esempi.
> UI del tavolo / cassa al centro → `TAVOLO_LIVE_SPEC.md`. Math di base esistente
> → `SETTLEMENT_SPEC.md`.

---

## 1. Principi (decisi con l'utente)

1. **Velocità prima di tutto** (telefono in mano, si gioca): far uscire qualcuno
   = **1 tap** ("è uscito"). Tutto il dettaglio soldi è **opzionale** e si può
   rimandare. Solo se uno **caccia davvero** dei soldi fai i tap in più.
2. **Default = DEBITO.** Ogni movimento di denaro tra due persone si registra
   come debito (sistema `debiti` già esistente), con un pulsante **"pagato ora"**
   per segnarlo subito in contanti.
3. **Provvisorio e rivedibile.** I numeri dell'uscita sono congelati ma
   **modificabili nella review di fine partita** (a fine serata succede qualcosa
   e i conti cambiano → si aggiusta lì).
4. **La cassa resta** (per i gruppi dove tutti cacciano subito): è il piatto
   contante disponibile, **visibile al centro del tavolo** (vedi TAVOLO_LIVE_SPEC).
5. **Stessa logica cash e torneo.** Si unifica il livello "chi-deve-a-chi";
   cambia solo come si ottiene il `valore` (cash = fiche contate; torneo = premio
   della posizione).

---

## 2. Grandezze (per giocatore P, in qualunque momento)

- `dovuto_P` = quanto P **deve** mettere. Cash: `entrata + Σ ricariche`. Torneo:
  `buy_in + Σ rebuy + add_on` (= `contributo_dovuto`).
- `versato_P` = quanto P ha **realmente** messo nel piatto.
- `mancante_P = max(0, dovuto_P − versato_P)` (quota non ancora versata).
- `valore_P` = quanto P porta via uscendo. Cash: **fiche contate all'uscita**
  (`fiches_uscita`). Torneo: **premio** per la posizione (0 se fuori dai premi).

---

## 3. Formula chiave (UNICA, cash + torneo)

```
saldoUscita_P = valore_P − mancante_P
```
- `saldoUscita_P > 0` → P **incassa** quell'importo.
- `saldoUscita_P < 0` → P **versa** `|saldoUscita_P|`.
- `= 0` → P è pari, esce senza movimenti.

P&L informativo (per le statistiche, non per il cassa): `netto_P = valore_P −
dovuto_P = saldoUscita_P − versato_P`.

> ⚠️ **Overpay (eccedenza) — caso raro, da non sbagliare.** `valore − mancante`
> vale quando `versato ≤ dovuto` (il caso normale). Se uno ha versato **più** del
> dovuto (`eccedenza = versato − dovuto > 0`, es. "non avevo da cambiare"), quella
> eccedenza gli rientra dal piatto come in `SETTLEMENT_SPEC §6/§8`, quindi
> `saldoUscita = valore + eccedenza`. **Forma generale sempre valida** (cash +
> torneo, con o senza overpay): `saldoUscita = valore − dovuto + versato`
> (= `netto + versato`); con `versato ≤ dovuto` si riduce esattamente a
> `valore − mancante`. È così che l'identità del P&L qui sopra resta vera **sempre**.

### Perché questa formula copre tutto
- **Auto-compensazione** (vincitore che non ha versato): `mancante` è già
  sottratto → "i soldi che avrebbe dovuto cacciare per darli a sé stesso non li
  caccia". Il `versato` NON è sottratto → "quelli già messi nel piatto rientrano
  per primi".
- `mancante` si "incassa" **solo dai net-loser**; per i net-winner è
  auto-cancellato (è dentro la formula, non serve codice speciale).
- Un **perdente di P&L che aveva già versato** può comunque **incassare** (riprende
  le fiche): paga solo chi ha `mancante > valore`. (Caso che di solito si sbaglia.)

---

## 4. Flusso d'uscita

Quando P esce:
1. **1 tap "esce"** → P viene tolto dal tavolo (posto liberato, vedi TAVOLO_LIVE).
   Si registra `valore_P` (cash: conta fiche ora; torneo: premio posizione).
2. Calcolo `saldoUscita_P`.
3. **Se incassa** (`>0`): l'importo è coperto, in quest'ordine e in modo
   **deferribile**:
   - dalla **cassa** disponibile (contante già versato non ancora ri-distribuito);
   - dal resto come **trasferimenti** da persone scelte (uscite o ancora in gioco),
     **default a debito** ("Tizio deve X a P"), con "pagato ora" opzionale.
   - Puoi anche **non specificare nulla ora** e risolvere alla review.
4. **Se versa** (`<0`): P può
   - **cacciare tutto** ("pagato ora"),
   - **cacciare una parte** e lasciare il resto **a debito**,
   - **non cacciare nulla** → tutto a debito verso il piatto/i vincitori.
5. P è **congelato** ma **provvisorio**: comparirà nella **review di fine partita**
   modificabile.

> Nota "Tizio se ne va vincente, Caio (ancora in gioco) gli darà i soldi domani":
> si registra subito `Caio deve X a Tizio` (debito provvisorio). Se a fine partita
> la situazione di Caio cambia, la review riconcilia (il debito può compensarsi).

---

## 5. Review di fine partita

Schermata che **sostituisce** l'attuale settlement "alla cieca" di fine serata:
- pre-compilata con tutte le uscite + i debiti provvisori già segnati live;
- mostra per ciascuno `valore / mancante / saldoUscita` e i trasferimenti;
- **tutto modificabile** (pagato/da-debito, importi, da-chi-a-chi);
- **controllo di quadratura**: `Σ incassi = Σ esborsi + cassa residua`; se non
  torna, evidenzia lo sbilancio (non blocca, segnala).
- alla conferma: i debiti non saldati finiscono nel sistema `debiti` persistente.

---

## 6. Esempi-test obbligatori (Vitest) — funzione pura `saldoUscita`

Buy-in 25 dove non diversamente detto. Verificare `saldoUscita` e segno:

1. **Cassa copre**: A versò 25, esce fiche 60 → mancante 0 → **+60** (incassa 60).
   `netto = +35`.
2. **Vincente, un altro non versò**: A versò 25, esce fiche 60 → **+60**; la cassa
   (se ≥60) copre. Se la cassa fosse 40 → 40 dalla cassa + **20 a debito** da chi
   scegli (default non pagato).
3. **Perdente non paga**: C versò 0, esce fiche 5 → mancante 25 → **−20** (deve 20).
   Default a debito; può pagare parziale (es. 10 ora + 10 debito).
4. **Auto-compensazione vincente che non versò**: C versò 0, esce fiche 80 →
   mancante 25 → **+55** (NON 80). `netto = +55`.
5. **Perdente che aveva versato**: D versò 25, esce fiche 5 → mancante 0 → **+5**
   (incassa 5, riprende le fiche). `netto = −20`. ⚠️ pur essendo in perdita, NON versa.
6. **Torneo, vincitore non pagò il buy-in**: dovuto 25, premio 100, versato 0 →
   mancante 25 → **+75**. (Coerente col fix torneo già in `main`.)

7. **Overpay (eccedenza)**: E versò 30 (dovuto 25), esce fiche 40 → mancante 0,
   eccedenza 5 → **+45** (non +40: riprende anche i 5 versati in più). `netto = +15`.

(Almeno questi 7; aggiungerne per: parziale, cassa parziale, più uscite in catena.)

---

## 7. Impatto sul codice (per la fase implementativa)

- **Modello**: nuovi campi su `GiocatoreSessione` (cash+torneo): `uscito?: boolean`,
  `valore_uscita?: number` (fiche o premio), `ora_uscita?: string`, e i
  trasferimenti provvisori (riusare `Settlement`/`debiti` esistenti).
- **Funzione pura** `saldoUscita(...)` (§3) + test (§6), **prima** della UI.
- **Riconciliazione con `SETTLEMENT_SPEC`**: la math di netting/auto-comp è già in
  `calcolaSettlement`/`calcolaSettlementTorneo`. NON duplicarla: estrarre/riusare.
  Aggiornare `SETTLEMENT_SPEC.md` e i suoi test se il flusso cambia (la review
  pre-compilata sostituisce la chiusura attuale). **Niente regressioni mute**: se
  un test storico cambia, va motivato.
- **Cassa**: stato derivato (Σversato − contante già ridistribuito) esposto alla UI.

---

## 8. Vincoli
- Solo poker (cash+torneo). Non tocca i giochi "comuni" (non hanno soldi).
- `vanillaCompatStorage`: retrocompat dati intatta.
- Ogni nuova regola di soldi → esempio-test PRIMA del codice.
- Questa feature è **grande**: va spezzata (funzione pura+test → modello/store →
  azioni live sul tavolo → review). Vedi ordine in `CONTESTO.md`.
