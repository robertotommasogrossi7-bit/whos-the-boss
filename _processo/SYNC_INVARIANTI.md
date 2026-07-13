# INVARIANTI DI SYNC — le regole assolute (R7.2d-1, 2026-07-13)

> Deliverable chiesto da ENTRAMBI i red team R7.2 (`REDTEAM-R72-SYNC.md`). Queste sono le regole
> che **nessuna fase futura può violare senza passare da qui** (e da `DECISIONI.md`). Ogni
> invariante dice anche **dove è imposto OGGI** — "pendente" = promesso ma non ancora nel codice,
> con la fase che lo implementa. Chiude a verbale S6, S7, S8, S14.
>
> Lessico: **push** = locale→cloud · **pull** = cloud→locale · **tombstone** = `deleted_at`
> valorizzato (cancellazione logica) · **ledger** = `poker_movimenti` (movimenti soldi append-only).

## Le 10 invarianti

- **I1 — Identità: ogni record sincronizzato ha un `uid` immutabile.** UUIDv7 generato dal client
  **alla creazione**, mai rigenerato, mai riusato; un retry ripusha **lo stesso uid con lo stesso
  payload**. L'`uid` è **l'unica chiave di sync**: gli id interi locali non attraversano mai il
  confine come chiavi. *Imposto: creazione uid su 9 entità (R7.2a) + UNIQUE su uid nel DB (R6-B5).
  Pendente: uid sui movimenti del ledger → **d3**; upsert-by-uid nel push → **R7.4**.*

- **I2 — Tempo: `updated_at` è SOLO del server** (trigger `now()` su INSERT/UPDATE). Nessun clock
  di device partecipa MAI alla risoluzione dei conflitti. **Semantica dichiarata (S8)**:
  `updated_at` = *"quando il server ha ricevuto la scrittura"*, NON *"quando l'utente ha editato"*.
  Conseguenza accettata: tra due device offline vince chi **pusha** per ultimo, anche se il suo
  edit è avvenuto prima. *Imposto: trigger DB (R7.1). Vedi verbale V-S8.*

- **I3 — Conflitti: LWW per-RIGA** (non per-campo). Due device che editano **campi diversi della
  stessa riga** offline → il perdente viene sovrascritto in silenzio. **Accettato by design (S6)**
  per single-user-multi-device; vedi verbale V-S6 con la watchlist dei campi a rischio. **Regola
  attiva**: ogni NUOVO campo mutabile su una tabella sincronizzata va valutato contro la watchlist
  prima di aggiungerlo. *Imposto: `mergeLWW()` per-riga (R7.2c).*

- **I4 — Cancellare = tombstone, e il tombstone VINCE (delete-wins).** Sulle tabelle sincronizzate
  mai DELETE fisico, solo `deleted_at`. In conflitto delete-vs-edit vince il tombstone **a
  prescindere dai timestamp**; la "resurrezione" è vietata nei due sensi (un pull non pulisce un
  tombstone locale; un push non riporta in vita una riga tombstonata sul server). Il tombstone di
  un padre tombstona i figli application-side **nella stessa transazione**. *Imposto (R7.2d-2):
  `mergeLWW` applica delete-wins (un tombstone locale o cloud vince sempre). Pendente: guardia lato
  push + cascade dei tombstone sui figli = **R7.4**.*

- **I5 — Il ledger non si tocca: `poker_movimenti` è solo-INSERT.** Mai UPDATE/DELETE (imposto
  anche da trigger DB, R6-B5); correggere = **movimento inverso**, quindi i movimenti non hanno
  `deleted_at`. Push del ledger = `INSERT … ON CONFLICT (uid) DO NOTHING`. *Imposto: trigger DB +
  modello locale (annullo = inverso). Pendente: uid + push mapping → **d3**.*

- **I6 — Idempotenza: ogni push e ogni pull sono ripetibili senza danni.** Un doppio push non
  duplica e non cambia dati (upsert su uid, I1); un doppio pull converge allo stesso stato
  (`merge(a,a)=a`). *Imposto: `mergeLWW` sul pull + **property-based test** (500 input casuali,
  R7.2d-2). Pendente: lato push → **R7.4**.*

- **I7 — Il server non riscrive il payload** (eccezione unica: `updated_at`). Niente default,
  trigger o normalizzazioni server-side che modificano campi pushati: ciò che un device pusha è
  ciò che tutti gli altri pullano. I trigger di guardia (append-only, R6-B5) **rifiutano**, non
  modificano. *Imposto: schema R7.1 così com'è. Regola attiva per ogni migration futura.*

- **I8 — L'import iniziale gira UNA volta sola** (guardia `profiles.imported_at`), in una RPC
  transazionale all-or-nothing, ed è **codice separato dal delta-sync**. Un re-import è vietato:
  sovrascriverebbe gli edit già sul server. *Pendente: è l'oggetto di **R7.3**.*

- **I9 — I tombstone non si purgano (per ora), ma con un PIANO** (S14, G4/DS7 — verbale V-S14).

- **I10 — Il "cosa pushare" lo decide un flag locale, mai un confronto di orologi.** Il dirty
  tracking è un marcatore locale (`needsSync`-style: set a ogni scrittura, clear solo a push
  confermato); i timestamp servono al massimo per diagnostica. *Imposto (R7.2d-2):
  `haCambiamentiLocaliNonSincronizzati()` confronta i contatori `syncRev`/`syncedRev` — zero
  orologi; helper `touchSync()`/`nuovoSync()` pronti e testati. Pendente: cablaggio del bump nelle
  azioni dello store = **R7.4** (insieme al push, che scrive `syncedRev`).*

## Verbale delle decisioni (chiude S6, S7, S8, S14)

| # | Decisione | Perché | Si riapre se… |
|---|-----------|--------|---------------|
| **V-S6** | **LWW per-riga ACCETTATO**; niente merge per-campo generico. **Watchlist campi a rischio** (candidati a merge per-colonna SE il clobber morde davvero): `settlements.pagato` (toggle da device diversi), `giocatori.nome`/`soprannome` (rename), `leghe.nome`/`foto`. | Un solo proprietario dei dati (R7), concorrenza reale rara; il per-campo è complessità da editor collaborativo che a questa scala non ripaga. | Nel test con gli amici sul cloud qualcuno perde davvero un edit → si fa merge per-colonna SOLO sui campi della watchlist. |
| **V-S7** | **Delete-wins**: il tombstone batte l'edit concorrente, sempre, senza guardare i timestamp. | Regola semplice e prevedibile; il caso inverso (edit-wins) resuscita righe che l'utente crede cancellate — peggio. Rischio basso: il locale non cancella giocatori con storico (li disattiva). | Emergesse un flusso dove la cancellazione è "leggera" e ripensabile → si valuta un restore esplicito (mai automatico). |
| **V-S8** | `updated_at` = **momento di ricezione server**, documentato come tale. Nessun campo "edited_at client" nel DB. | Un timestamp client nel conflict-resolution reintroduce il clock skew che C1 ha eliminato. "Vince chi pusha per ultimo" è accettabile per lo stesso utente sui suoi device. | R9 (realtime/multi-utente) se servisse mostrare "chi ha editato quando" → campo informativo separato, MAI usato per i conflitti. |
| **V-S14** | **Tombstone mai purgati in R7** (volumi irrisori: partite tra amici = migliaia di righe in anni). **Piano GC (R10)**: purge dei tombstone più vecchi di N mesi **solo quando** tutti i device dell'account hanno un cursore di sync oltre quella data (prerequisito: cursore per-device, da costruire in R7.4). Trigger di revisione: pull percettibilmente lento o >~50k righe per account. | Purgare senza cursore per-device = un device rimasto offline a lungo "resuscita" righe cancellate al suo primo push. | Il trigger di revisione scatta prima del previsto. |

## Come si usa questo documento
- **d2/d3/d4/d5 e R7.4** citano l'invariante che implementano nel commit (es. "impone I4 nel merge").
- Una modifica che viola un'invariante **non si fa**: prima si cambia questo file (con ok utente) e
  si registra in `DECISIONI.md`, poi si scrive il codice.
- Il gate d5 (DB reale) verifica dal vivo almeno: I1 (upsert su uid), I2 (round-trip `updated_at`),
  I6 (doppio push), I7 (payload intatto).
