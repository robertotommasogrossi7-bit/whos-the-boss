# TAVOLI POKER — SPEC

> Feature "tavolo interattivo" per il poker (cash + torneo). Da fare PRIMA della
> trasformazione Card Tracker. Contiene **logica delicata** (bilanciamento
> tavoli): l'algoritmo §5-§10 è il contratto, gli esempi §11 sono test
> obbligatori sulla funzione pura. Per ora **senza fiche di gioco**.
>
> Stato: requisiti raccolti dall'utente 2026-05-22. Non avviato.

---

## 1. Scopo
Sostituire la sub-tab "giocatori che entrano" con un **tavolo di poker
interattivo** che mostra i giocatori seduti e gestisce l'assegnazione e il
bilanciamento automatico dei posti, con override manuale.

---

## 2. Schermata tavolo (sostituisce la sub-tab giocatori)
Rappresentazione visiva di **uno o più tavoli** con posti (max 9 per tavolo).
Per ogni giocatore seduto mostra:
- nome;
- **soldi totali** (dovuto = entrata/buy-in + ricariche + add-on + rebuy);
- **versato** (quanto ha messo nel piatto finora).

Azioni nella schermata:
- **Far entrare** un partecipante già selezionato a inizio serata.
- **Aggiungere un giocatore non presente** alla serata in corso.
- **Aggiungere un nuovo giocatore alla lega** (rubrica) e farlo entrare subito
  nella sessione in corso.
- **Spostare** un giocatore in un altro posto/tavolo (override manuale).

> Fattibilità dati: le azioni store esistono già (`aggiungiGiocatore`,
> `addGiocatoreSessione`, `torneoAggiungiGiocatore`). La feature aggiunge la UI
> e la logica di assegnazione/bilanciamento.

---

## 3. Modello dati
Riusa l'esistente: `GiocatoreSessione.seat = { tavolo, posto } | null`,
`Sessione.num_tavoli`. La logica di bilanciamento è una **funzione pura**
separata (vedi §12); lo store la usa per scrivere i `seat`.

---

## 4. Numero di tavoli
`tavoliNecessari(n) = max(1, ceil(n / 9))` dove `n` = giocatori entrati.
- 1–9 → 1 tavolo; 10–18 → 2; 19–27 → 3; ecc.
- Esempi: 10 → 2, 18 → 2, 19 → 3, 23 → 3.

Distribuzione **equa**: differenza massima 1 giocatore tra i tavoli.
- 10 → 5/5 · 18 → 9/9 · 23 → 8/8/7 · 19 → 7/6/6.

---

## 5. Assegnazione all'ingresso (un giocatore entra)
1. Calcola `tavoliNecessari(nDopoIngresso)`. Se serve un tavolo in più,
   crealo.
2. Siede il nuovo giocatore nel **tavolo meno popolato** (priorità a
   equilibrare), nel primo posto libero.
3. Sposta il **minor numero** di persone già sedute (idealmente zero
   all'ingresso: si aggiunge soltanto).

---

## 6. Riallocazione manuale
L'utente può spostare qualunque giocatore in un posto/tavolo a scelta. Override
totale: l'app non annulla la scelta manuale (ricalcola solo se richiesto o al
prossimo trigger di squilibrio).

---

## 7. Vincoli (sempre validi)
- Capienza massima **9** per tavolo.
- **Nessun tavolo con ≤ 3 giocatori** (a regime). Un tavolo da **4** è tollerato
  ma è un segnale: valuta se esiste una disposizione migliore.
- **Spostare meno persone possibile**: ogni riequilibrio deve minimizzare i
  movimenti.
- **Mai più del ~40%** dei giocatori spostati di tavolo in una singola
  operazione di riequilibrio.

---

## 8. Riequilibrio automatico (trigger)
Scatta quando, dopo un'uscita/ingresso, si verifica:
- un tavolo scende a **≤ 3**, OPPURE
- lo squilibrio tra tavoli supera 1 (max − min ≥ 2) in modo stabile.

Azione (minimale):
- Se il numero di tavoli attuale **> `tavoliNecessari(n)`** → **accorpa** (§9).
- Altrimenti → sposta dai tavoli più pieni a quelli più scarsi **il minimo**
  necessario per riportare tutti > 3 e differenza ≤ 1.
  - Es. 8/8/3 (n=19): muovi **1** giocatore da un tavolo da 8 → 8/7/4 (nessun
    tavolo ≤3, 1 solo spostamento). 4 è tollerato (§7).

---

## 9. Accorpamento di tavoli (table breaking)
"Riunire i tavoli quando 2 tavoli possono stare in 9":
- Se `tavoliNecessari(n)` è sceso, **rompi il tavolo più piccolo** e redistribuisci
  i suoi giocatori nei posti liberi degli altri (riempiendo i tavoli più scarsi).
- **Eccezione**: se esiste un tavolo molto piccolo (≈2), smista prima quello
  invece di accorpare in blocco.
- Vincolo §7 sul 40% resta valido: se l'accorpamento muoverebbe troppe persone,
  preferisci spostamenti parziali.

---

## 10. Principio guida
Tra più disposizioni valide, scegli **quella che muove meno giocatori** rispetto
alla disposizione attuale. La stabilità dei posti conta più dell'equilibrio
perfetto.

---

## 11. Esempi-test obbligatori (funzione pura)
Ogni riga = un test Vitest su `bilanciaTavoli`.

| # | Input (entrati / disposizione attuale) | Output atteso |
|---|---|---|
| 1 | 10 entrati, da zero | 2 tavoli 5/5 |
| 2 | 23 entrati, da zero | 3 tavoli 8/8/7 |
| 3 | 18 entrati, da zero | 2 tavoli 9/9 |
| 4 | 19 entrati, da zero | 3 tavoli 7/6/6 |
| 5 | ingresso n°10 con tavolo 9 pieno | crea 2° tavolo, nuovo siede lì (9/1), nessuno spostato |
| 6 | disposizione 8/8/3 (n=19), trigger ≤3 | muovi **1** da un tavolo da 8 → 8/7/4 (1 spostamento) |
| 7 | disposizione 4/4/4 (n=12), tavoliNecessari=2 | accorpa a 2 tavoli 6/6 (4 spostati = 33% ≤ 40%) |
| 8 | disposizione 9/9/2 (n=20) con un tavolo da 2 | smista il tavolo da 2 (non accorpa in blocco): risultato 3 tavoli equi 7/7/6 muovendo il minimo |

(Se un caso ammette più output a pari numero di spostamenti, qualunque va bene
purché rispetti §7.)

---

## 12. Implementazione (fase dedicata)
- **Funzione pura** `bilanciaTavoli(...)` separata dalla UI, con i test §11.
  Input: lista giocatori entrati + disposizione corrente (seat) → Output: nuova
  disposizione (seat) minimizzando gli spostamenti.
- Solo dopo che i test sono verdi: la **UI del tavolo** (§2) + azioni store per
  entrata/spostamento/aggiunta giocatore.
- Fasi suggerite: (T1) funzione pura + test; (T2) UI tavolo + entrata/sit;
  (T3) spostamento manuale + aggiunta giocatori in corso.

---

## 13. Cosa NON toccare
- Calcoli settlement (`calcolaSettlement`, `calcolaSettlementTorneo`).
- `vanillaCompatStorage`. Modello soldi (entrata/versato/ricariche): la
  schermata li **mostra**, non cambia come sono calcolati.
