# AUDIT S5 — R7.4 delta-sync (2026-07-18, pre-merge in main)

> Audit multi-agente livello **MEDIO** (metodo: 3 revisori paralleli Sonnet con cacce mirate su
> core-sync / SQL / cablaggio-app · dedup Haiku · verifica ADVERSARIALE Sonnet solo su ALTA/MEDIA ·
> sintesi in chat). 10 agenti, ~1,04M token, 24 minuti. Chat orchestratrice: Fable (WTB/Base_8).
> Esito: **5 finding confermati (1 ALTA, 4 MEDIA), 1 confutato.** Bonifica eseguita subito,
> PRIMA del merge di `rn-r74-sync` in `main` (regola: blocco bonifica prima della fase successiva).

## Registro (fonte di verità per lo stato)

| ID | Sev | Dove | Problema (confermato dalla verifica adversariale) | Fix | Stato |
|----|-----|------|------|-----|-------|
| S5-R1 | MEDIA | `packages/core/src/sync/pull.ts` | **C4 ("mai resurrezione") valeva solo per i figli NUOVI**: il ramo *merge* di `riconciliaPartiteGioco` non applicava `ancestorDeleted` (una partita-gioco GIÀ locale sopravviveva al padre tombstonato dal cloud), e al livello **Serata→Sessione** il controllo non esisteva proprio — una sessione creata da un altro device sotto una serata cancellata restava viva per sempre e **contata nelle stats** (nessun filtro a valle guarda il padre). | Cascade ancestor-aware in ENTRAMBI i rami (nuova+merge) e al livello serata (`serataMorta` map, uid→deletedAt). 3 test nuovi in `pull.test.ts`, scritti PRIMA del fix (rosso→verde). | ✅ bonificato |
| S5-R2 | MEDIA | `orchestraSync.ts` + `lib/sync.ts` | **L'adozione ignorava lo stato LIVE**: `haDatiSignificativi` non guardava `sessioneAttiva`/`serate_bg` → un "telefono nuovo" con una serata poker IN CORSO poteva adottare in automatico e la serata spariva dalla UI; l'Alert non avvisava. | `haDatiSignificativi` ora conta anche il live (mai adozione silenziosa sopra una sessione in corso) + guardia in app: con una serata aperta l'adozione non si propone proprio — Alert "finisci la serata, poi sincronizza". Test in `orchestraSync.test.ts`. | ✅ bonificato |
| S5-R3 | MEDIA | `orchestraSync.ts:178` | **Un conflitto CAS su UNA lega interrompeva il push di TUTTE le successive** nello stesso ciclo (`return` invece di `continue`), contro l'indipendenza per-lega dichiarata (S9/P.2). | Il loop ora tenta comunque le altre leghe e ritorna `conflitto` a fine giro. Test multi-lega nuovo (2 tentativi RPC, la seconda lega stampata). | ✅ bonificato |
| S5-R4 | **ALTA** | `_layout.tsx:87` | **Regressione di R7.2b sul logout** (confermata via `git show cd0bf85`): il ramo `!accountId` non azzerava `utente` → il gate UI non tornava alla LoginScreen e `accountAttuale()` del sync restava sul vecchio id (S20 monca). PEGGIO (trovato dal verificatore): `persist.setOptions` non veniva ri-puntato → `clearDbLocale()` **sovrascriveva il blob AsyncStorage dell'account con un db vuoto** — perdita permanente degli edit locali non ancora sincronizzati. | Nel ramo logout, in quest'ordine: `persist.setOptions({name: STORE_KEY+':sloggato'})` (sgancia la chiave: le scritture a vuoto cadono su una chiave-parcheggio) → `applyUtente(null)` (gate UI + S20) → `clearDbLocale()`. Verifica finale sul device nella prova telefono (passo 8 del protocollo). | ✅ bonificato |
| S5-R5 | MEDIA | `lib/sync.ts:49` | **Il backup pre-adozione (DS9) leggeva il blob su disco**, che zustand persist scrive async e senza conferma: poteva fotografare uno stato PIÙ VECCHIO dell'ultimo edit che l'adozione stava per buttare (stesso rischio che l'import tratta con `confermaPersist`). | Il backup ora serializza lo **stato live** (`getState()`, stesso formato JSON di zustand persist → ripristinabile copiandolo sulla chiave dell'account). | ✅ bonificato |

## Confutato (verifica adversariale)

- **`costruisciPayloadPush` lancia se un giocatore non ha uid** → *reale=false*: nessun percorso
  utente reale lo produce oggi (tutte le creazioni passano da `nuovoSync()`, l'eliminazione è
  tombstone con guardia `giocatoreInUso`), ed è già presidiato dal test-gate
  `sync-cablaggio.test.ts` che fallirebbe in CI su qualsiasi punto di creazione che dimentichi
  `nuovoSync()`. Resta annotato come nota di robustezza per il futuro, non bug da correggere.

## Lezioni per il metodo

- La **verifica adversariale ha pagato due volte**: ha confutato 1 finding su 6 e ha AGGRAVATO
  S5-R4 (il revisore aveva visto la guardia S20 monca; il verificatore, provando a confutarla, ha
  scoperto la sovrascrittura dello storage — il pezzo davvero pericoloso).
- Le **cacce mirate** hanno reso: 4 dei 5 confermati nascono dai sospetti seminati nei prompt, non
  dallo sweep libero.
