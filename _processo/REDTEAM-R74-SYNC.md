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

## Registro finding R7.4 (da compilare al ritorno)

| ID | Sev | Finding | Verdetto | Fix |
|----|-----|---------|----------|-----|
| — | — | *(in attesa)* | — | — |
