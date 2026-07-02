# AUDIT R6+R7.1 — registro indicizzato (2026-07-03)

> **Cos'è**: l'esito dell'audit multi-agente "ALTO" su tutto il lavoro fatto (codice core/state/mobile,
> 5 migration SQL applicate, documenti di processo) + confronto con le best practice online.
> **Come è stato prodotto**: workflow di 67 agenti — 6 revisori paralleli → ~50 verifiche adversariali
> (ogni finding attaccato da un secondo agente che prova a confutarlo) → 4 ricercatori online → 1 sintesi.
> Eseguito in 2 sessioni (Fable, interrotta per limite contesto → resume su Opus con cache; vedi
> `METRICHE.md`). **45 finding confermati, 11 confutati e scartati.**
> **Stato**: ogni finding ha un ID stabile e una FASE assegnata nella LINEA v3 (`CONTESTO.md`).
> Spuntare qui quando risolto. I dettagli completi (righe esatte) sono nel report del workflow.

## Verdetto in una riga
Zero catastrofi; 3 bug ALTA che rompono flussi reali oggi; le scelte architetturali per il sync sono
allineate allo stato dell'arte 2025-26; il debito più grosso è documentale (5 doc descrivono un mondo
che non esiste più).

---

## 🔴 ALTA — rompono flussi vivi (fase: R6-B1, subito)

| ID | Cosa | Dove | Fix | Stato |
|----|------|------|-----|-------|
| **A1** | `confirm()` browser-global in **6 azioni store** → `ReferenceError`/crash su RN-Hermes (annulla sessione, avanza livello, stop torneo, chiusure) | `packages/state/src/store.ts:411,958,964,1277,1401,1466` | Store puro senza global DOM: ritorna `{needsConfirm}` o param `force`; `Alert.alert` in UI. + test che vieta i global DOM nello store | ☐ |
| **A2** | **Add-on dopo il consolidamento premi**: montepremi cresce ma `premi` è congelato → i vincitori reclamano più del piatto | `store.ts:1076-1092` (`torneoAddOn`) | Gate dopo `premi_consolidati` **oppure** ricalcolo premi in `apriChiusuraTorneo` se il montepremi diverge | ☐ |
| **A3** | **Personale+poker: impossibile includerti** — `SetupForm` passa `username` a `idBloccatiInclusi` che da R6.5 vuole l'`accountId` | `apps/mobile/src/components/poker/SetupForm.tsx:60` | `idBloccatiInclusi(lega, utente?.id)` | ☐ |

## 🟠 MEDIA — identità R6.5 alla radice (fase: R6-B2)

| ID | Cosa | Dove | Fix | Stato |
|----|------|------|-----|-------|
| **M7** | **Causa radice**: nelle leghe non-Personale nessun record riceve mai `accountId` (il creatore nasce `{id,nome}`) | `apps/mobile/src/app/nuova-lega.tsx:41` | Creatore con `accountId: utente?.id` + **migrazione one-shot claim-by-name** per le leghe esistenti | ☐ |
| **M5** | Lock "sempre incluso" rotto nei **picker multigioco** (3 call-site passano ancora `username`) | `SheetNuovaSessione.tsx:33` · `SheetNuovaSerata.tsx:31` · `SchermataGioco.tsx:47` | `utente?.username` → `utente?.id` nei 3 file | ☐ |
| **M6** | Stats "Le tue leghe" (Vittorie/Netto) **sempre 0** nelle leghe normali | `(tabs)/leghe.tsx:15` | Si risolve con M7 (nessun cambio qui). Verifica: stats riappaiono | ☐ |
| **B13** | Badge "sei tu" mai mostrato nelle leghe normali (+ matita rinomina visibile sul tuo record) | `LegaGiocatori.tsx` | Si risolve con M7 | ☐ |
| **M8** | `assicuraGiocatorePersonale` può creare un **doppione** (claim solo per username, non per displayName) | `packages/core/src/utils/personale.ts:66-71` | Claim anche per `displayName` normalizzato, o disambigua alla collisione | ☐ |

## 🟠 MEDIA — store & auth (fase: R6-B3)

| ID | Cosa | Dove | Fix | Stato |
|----|------|------|-----|-------|
| **M9** | `eliminaGiocatore` controlla solo le partite poker → **orfani multigioco** (sessioniGioco/serate/sessioneAttiva) | `store.ts:490-507` | Estrai `giocatoreInUso(lega,idNome)` puro + test, copre tutti i contenitori | ☐ |
| **M10** | `apriChiusuraTorneo` **persiste posizioni provvisorie** prima della conferma → tornando al live restano | `store.ts:1273-1288` | Provvisorie solo nella copia `settlement.sessione`; persisti in `confermaChiusura` | ☐ |
| **M11** | Rientro dopo `esceDalTavolo`: **giocatore fantasma** (seat riassegnato ma `uscito/valore_uscita` non azzerati) | `store.ts:625-650` | Azzera i campi al rientro (o vieta il rientro) | ☐ |
| **M13** | `updateEmail` senza `emailRedirectTo` → il link cambio-email finisce sulla Site URL (pagina morta) | `authSlice.ts:118` | `updateUser({email},{emailRedirectTo: Linking.createURL('auth-callback')})` | ☐ |
| **B19** | `addGiocatoreSessione` ritorna `null` sia per successo sia per "già in serata" → seat sbagliato possibile | `store.ts` | Esito discriminato `{ok,idNome}` | ☐ |
| **B21** | `runMigrations` muta in place e non persiste le migrazioni sessioni | `store.ts` | Funzioni core pure che ritornano copia+`changed` | ☐ |
| **B22** | Commenti stantii (riferimenti ad apps/web rimossa, helper inesistente) | `store.ts` | Pulizia | ☐ |

## 🟠 MEDIA — documenti da riallineare (fase: R6-B4)

| ID | Cosa | Dove | Fix | Stato |
|----|------|------|-----|-------|
| **M15** | `R7_SCHEMA` descrive `poker_movimenti` **diverso dall'SQL applicato** (enum {buyin,rebuy,addon,cashout}+`unita` vs 3 tipi reali; §3.2 mostra ancora JSONB) | `_processo/R7_SCHEMA.md` §3.2+B1+B2 | Riscrivi §3/B1/B2 sull'SQL effettivo **prima di R7.2** (rischio: implementare il sync su uno schema fantasma) | ☐ |
| **M16** | `BACKEND_SPEC` dice ancora "online-required (A) CONFERMATA" + tabelle mai nate (`sessioni_poker`,`debiti`,`lega_membri`) | `_processo/BACKEND_SPEC.md` | Banner "⚠️ SUPERATO 2026-07-01 → vedi R7_SCHEMA + DECISIONI (f)" | ☐ |
| **M17** | `README.md` pubblico si contraddice (status "pre-backend/demo login" vs "Auth is real"; stack = web rimossa) | `README.md` + `README.it.md` | Riallinea a Expo-only + auth reale + schema R7 applicato | ☐ |
| **M18** | `CONTESTO.md` cita `apps/web` viva, `pnpm dev:web` inesistente, azioni dashboard "pendenti" (fatte), R7.1 non registrata | `_processo/CONTESTO.md` | Riallinea (la LINEA v3 già corregge lo stato; ripulire i §vecchi) | ☐ |
| **B44** | `MAPPA_CODICE`: web "congelata", azioni "pendenti", backend fermo a R6 | `_processo/MAPPA_CODICE.md` | 3 ritocchi | ☐ |

## 🟠 MEDIA+BASSA — SQL hardening (fase: R6-B5, una migration forward + CLI)

| ID | Cosa | Fix | Stato |
|----|------|-----|-------|
| **M14** | **Cancellazione account rotta**: `giocatori.account_id`/`created_by_account_id` → profiles senza `ON DELETE` → il cascade da auth.users fallisce (requisito store Apple/Google) | Migration: `ON DELETE SET NULL` su entrambe (il claimed torna ospite, storico preservato) | ☐ |
| **B31** | `set_updated_at` bumppa anche su UPDATE no-op → il sync incrementale fa echo | Trigger `BEFORE UPDATE ... WHEN (old.* IS DISTINCT FROM new.*)` | ☐ |
| **B32** | `poker_movimenti`: append-only **dichiarato ma non enforced** (policy FOR ALL) né rappresentabile (CHECK vieta lo storno) | Decidere UNA semantica: append-only vero (policy split insert-only + movimento inverso) o mutabile documentato | ☐ |
| **B33** | Manca `UNIQUE(partita_id, giocatore_id)` su partita_poker_giocatori | Unique index parziale `WHERE deleted_at IS NULL` | ☐ |
| **B34** | RLS: `auth.uid()` nudo (niente initplan caching, lint 0003) + nessun `TO authenticated` + `owns_lega` in schema public (lint 0029) | `(select auth.uid())`/`(select owns_lega(...))` + `TO authenticated` su tutte le policy; valutare schema `private` | ☐ |
| **B35** | `set_updated_at` senza `SET search_path` (unica funzione del progetto senza) | `set search_path = ''` | ☐ |
| **R-mig** | Migration applicate incollando in dashboard → la **history remota non le traccia**, un futuro `db push` fallirebbe | `supabase migration repair` + d'ora in poi solo `db push` | ☐ |
| **R-flow** | `flowType` non esplicito nel client (oggi default `implicit` = ok; un major bump può cambiarlo e rompere il parser) | `flowType:'implicit'` esplicito in `createClient` (mobile) | ☐ |
| **B24** | `useDeepLinkAuth` senza dedup URL → doppio `setSession` possibile (getInitialURL+listener) | `useRef` con ultimo URL processato | ☐ |

## 🟡 BASSA — soldi: rete di test + fix (fase: R6-B6, test-first)

| ID | Cosa | Fix | Stato |
|----|------|-----|-------|
| **M4** | settlementTorneo: **debito residuo non allocabile perso in silenzio** (premi già pagati + loser moroso) | Ritorna `residuoNonAllocato` + mostra in UI + test "loser senza controparte" | ☐ |
| **B02** | `calcolaPremi`: arrotondamenti per-premio → somma premi ≠ montepremi | Residuo al 1° posto (`montepremi − Σaltri`) | ☐ |
| **B05** | Fiche negative non clampate → debito fantasma | `Math.max(0,…)` in aggiornaFiches/esceDalTavolo + difesa in settlement | ☐ |
| **B07** | Cash sbilanciato: `mancanteP` residuo scartato senza traccia | Campo `sbilancio` nel `CashSettlementResult` | ☐ |
| **B04** | Winner con netto negativo perde i `pagamenti_ricevuti` | Costruisci dai flussi delle allocazioni, senza gate sul netto | ☐ |
| **B08** | Guardia morta `sess.add_on` (invece di `.abilitato`) nel montepremi | Usa `.abilitato` nei 3 punti | ☐ |
| **B06** | `calc.ts` = unico file soldi **senza alcun test** | `calc.test.ts`: somma-premi==montepremi, soglie, consolidamento | ☐ |
| **B00** | Greedy cash multi-debitore×multi-creditore mai esercitato | 2-3 test con split+centesimi + property-test invarianti | ☐ |

## 🟡 BASSA — rimandati a fasi già previste

| ID | Cosa | Fase | Stato |
|----|------|------|-------|
| **M12** | Storage persistito per-device non per-account (2 login = dati mescolati) — **decisione da prendere PRIMA del sync** | **R7.2 kickoff** (namespace per user.id / wipe-merge / tag ownerAccountId) | ☐ |
| **B25** | Nessun **resend** email né **password dimenticata** (vicolo cieco) | **H-block** (era già deciso: recupero password rimandato) | ☐ |
| **B26** | Mapping "database error saving new user"→"Username già in uso" troppo largo | H-block | ☐ |
| **B27** | `onAuthStateChange` mai unsubscribed (innocuo in prod) | H-block | ☐ |
| **B28** | Stringa magica "Registrazione ok" tra authSlice e LoginScreen | H-block | ☐ |
| **B29** | Expo Go: deep link `exp://` fuori allowlist (non-bug, da documentare) | R6-B4 (nota in supabase/README) | ☐ |

---

## Ricerca online — scelte vs best practice (fonti nel report completo)

**✅ Allineate (11):** RLS con helper SECURITY DEFINER = fix ufficiale anti-ricorsione · indici sulle colonne dei predicati · policy FOR ALL copre il SELECT di INSERT..RETURNING · **LWW con `updated_at` server-side = "client clocks can never be trusted"** · tombstone soft-delete = standard sync · **UUID client-side = standard local-first** · import one-shot separato dal delta-sync (pattern AWS AppSync) · **il nostro protocollo coincide riga-per-riga col plugin Supabase di Legend-State** (idiomatico, non inventato) · **parser fragment-first CORRETTO** (default supabase-js v2 = implicit; pattern della doc mobile ufficiale) · ledger append-only = pattern fintech · numeric(10,2) valido a questi volumi.

**⚠️ Deviazioni → tutte assorbite nelle fasi sopra:** `(select auth.uid())`+`TO authenticated` (→B34) · owns_lega in public (→B34) · migration history da sanare con `migration repair` (→R-mig) · `flowType` esplicito (→R-flow) · getInitialURL Android inaffidabile+dedup (→B24) · **da mettere a verbale a R7.2**: LWW per-riga (vs per-campo PowerSync), UUIDv7 (vs v4, località B-tree), retention tombstone ("mai purgare" ok ma esplicito), lifecycle "disattivato" distinto dal tombstone di sync.

## Top-5 (ordine di esecuzione della bonifica)
1. **R6-B1** fix i 3 ALTA [S] → 2. **R6-B2** identità alla radice [M] → 3. **R6-B4** doc alla realtà [S]
→ 4. **R6-B5** hardening SQL + repair [M] → 5. **R6-B6** rete test soldi [M]. Poi **R7.2**.
(R6-B3 store-fix si accoda a B2 — stessi file, stessa passata.)
