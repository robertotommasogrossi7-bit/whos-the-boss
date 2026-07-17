# RED TEAM — Delta-sync R7.4 (design review, 2026-07-17)

> **Formato metodo v1.6**: red team di design fatto da **agente interno con accesso al codice**
> (l'esterno cieco si usa solo per meta-review e pre-pubblicazione). La spec attaccata è
> **`R7_SCHEMA.md` sez. P** (P.1–P.7). Calibrazione utente vincolante: fase corta, niente
> enterprise, solo difetti strutturali (perdita/duplicazione, race, semantiche sbagliate sui soldi).
> Il registro dei finding si compila qui sotto al ritorno.

## Le decisioni da attaccare (riassunto — il dettaglio è in sez. P)
1. **P.1** Ciclo pull→merge→push→stamp; **pull COMPLETO** (niente cursore, volumi KB–MB).
2. **P.2** Push CAS per-riga (`expected_updated_at` = `lastSyncedAt`), **una transazione per lega**,
   conflitto → **abort totale** → re-pull → re-push (stile WatermelonDB). Ledger solo-INSERT.
3. **P.3** Materializzazione righe nuove dal cloud (id locali freschi, parent-first, idMap) +
   **regola del pegno**: sul pull, se il locale dirty vince, `lastSyncedAt` si aggiorna COMUNQUE
   al valore cloud (altrimenti CAS in deadlock; con refresh → il push dopo sovrascrive = LWW vero).
4. **P.4** Cablaggio dirty (touchSync/nuovoSync/uid movimenti) + **cancellazioni locali da fisiche
   a tombstone** con filtri nelle viste.
5. **P.5** Trigger boot/foreground/manuale · mutex skip · logout guard · version sul payload push.

## Angoli d'attacco specifici (oltre a "dove perde/duplica soldi?")
- La **regola del pegno** (P.3): è giusta? C'è un caso in cui "rinfrescare il pegno di una riga
  dirty" fa vincere il device SBAGLIATO o perde un edit? Alternativa migliore a parità di semplicità?
- **Pull completo + materializzazione**: eco del proprio push, righe già viste, id locali freschi
  che collidono coi contatori (`_nid`/`_pid`), referenze `id_nome` dentro partite/settlement che
  puntano a giocatori materializzati DOPO — l'ordine parent-first basta davvero?
- **Cancellazioni → tombstone** (P.4): quali viste/calcoli (classifiche, storico, debiti, stats)
  oggi contano righe che domani saranno tombstonate? Il filtro va in un punto solo o in venti?
  (Verifica su codice: selettori/utils reali.)
- **Abort totale del push per UNA riga in conflitto**: a questa scala è accettabile o produce un
  loop pull/push infinito in qualche caso (es. riga che cambia sul server a ogni giro)?
- **Stamp col contatore** durante push in volo (identico all'import ma su push ripetuti): buchi?
- **Il ciclo contro l'import**: interazioni brutte tra `orchestraImport` e `orchestraSync` (es.
  sync che parte PRIMA dell'import sullo stesso account; import su device B mentre A sincronizza)?
- Cosa manca **del tutto** che a questa scala servirebbe davvero?

## Registro finding R7.4 (compilato 2026-07-17 — agente Opus interno, tutti verificati su file:riga)

| ID | Sev | Finding | Verdetto | Fix (recepito in sez. P emendata) |
|----|-----|---------|----------|-----------------------------------|
| **S4-R1** | **CRITICO** | Il sync per-uid **non può unire** i dati di un 2° device (uid nati per-device → le stesse entità reali hanno uid diversi): li **DUPLICA** — la promessa "li unirà R7.4" scritta nell'import è falsa | **CONFERMATO** (`orchestraImport.ts` ramo `gia_importato`; merge uid-keyed) | **P.8 — adozione del 2° device** (decisione di prodotto, all'utente): il caso comune "telefono nuovo, locale vuoto" fila liscio da solo; se il locale HA dati e l'account ha già importato altrove → il sync NON parte, si passa da un flusso esplicito di adozione. Correggere anche i testi/commenti che promettono l'unione. |
| **S4-R2** | **CRITICO** | **Deadlock permanente**: la Personale del 2° device pushata come INSERT sbatte su `leghe_personale_uniq` → abort dell'intera transazione **a ogni ciclo, per sempre** (il CAS non c'entra: è un vincolo natural-key) | **CONFERMATO** (`r7_core.sql:42`) | Risolto a monte da P.8 (l'adozione evita il push di una seconda Personale) + difesa in profondità: la RPC intercetta `unique_violation` e torna un errore parlante, mai un abort muto ripetuto. |
| **S4-R3** | ALTO | Passando a tombstone, **nessun** util filtra `deletedAt`: partite "cancellate" contate in classifiche/storico/stats (soldi sbagliati a video) | **CONFERMATO** (grep: zero filtri in `packages/core/src/utils`; classifiche/storico iterano le collezioni intere) | Filtro **al confine, in un punto solo**: helper core `soloVive()` dentro gli utils che calcolano (classifiche/storico/personale/giocatori), NON in 20 viste. + test anti-regressione. |
| **S4-R4** | ALTO | Tombstone del padre **senza cascade**: figli vivi sul server, figlio dirty che "resuscita" sotto un padre cancellato | **CONFERMATO** (eliminaPartita oggi fisica; I4 esige cascade nella stessa transazione) | `elimina*` → `deletedAt`+`touchSync` su TUTTO il sottoalbero (giocatori-partita, settlement) nella stessa azione. I movimenti (senza deletedAt, I5) si escludono via il padre. |
| **S4-R7** | ALTO | **Non-sync silenzioso**: le creazioni odierne settano uid ma NON `syncRev` → `0>0=false` → il push le salta; una partita salvata dopo l'import non lascia mai il telefono | **CONFERMATO** (`store.ts` creazioni senza syncRev; `merge.ts` contatore) | Cablare `nuovoSync()` (non i campi a mano) + **test anti-regressione**: "creo una partita → è dirty → compare nel payload push". Non fidarsi di 12 chiamate manuali senza rete di test. |
| **S4-R5** | MEDIO | idMap "costruita una volta" → i riferimenti a giocatori **materializzati durante il pull** non si risolvono | **CONFERMATO** (design P.3 + `idMap.ts`) | idMap **estesa live**: ogni entità materializzata registra subito `uid→id locale` prima di risolvere i figli. |
| **S4-R6** | MEDIO | `lastSyncedAt` si riallinea solo col pull successivo (la RPC torna solo conteggi) → dipendenza nascosta "pull sempre prima del push"; un riordino futuro reintroduce il deadlock CAS | **CONFERMATO** (design P.2) | La RPC push ritorna **`updated_at` per-riga**; `lastSyncedAt` si stampa **al push**, insieme a `syncedRev`. Dipendenza implicita eliminata. |

**Q1 (regola del pegno)**: **corretta e necessaria** — verdetto del revisore: senza, il CAS va in deadlock; con, si risolve in ≤1 retry e realizza il "LWW dichiarato". **Q4 (loop abort)**: impossibile da sostenere a questa scala (niente timer di background). **Alternativa senza CAS** (upsert LWW incondizionato) considerata e **SCARTATA**: DS3 resta, il CAS costa poco ed è protezione in più.

**Scartati dal revisore** (una riga): clobber per-campo watchlist = già accettato V-S6 · livelock CAS da peer insistente = non si sostiene senza timer · collisione local_id in materializzazione = non è chiave · eco del proprio push = si auto-risana via uid · stamp durante push in volo = pattern import già provato · crescita tombstone/ledger = fuori scope I9/R10.

**Verdetto d'insieme**: P.1/P.5/P.6 TIENI · P.2 CAMBIA (natural-key + updated_at per-riga) · P.3 TIENI con fix (idMap live) · P.4 CAMBIA (cascade + filtro al confine + test) · P.7 CAMBIA (R7.4a spezzato, è la superficie più rischiosa). **La cosa che mancava del tutto: P.8** (il ponte d'identità del 2° device).
