# FASE #4.5 — Utente-giocatore ("sei tu") — PROMPT di fase

> **Chi sei**: chat di fase **Sonnet**. Prima leggi `METODO.md` (Desktop) e `_processo/CONTESTO.md`.
> Poi questo prompt. **Implementi solo questa fase**, in micro-commit, push dopo OGNI commit.
> **NON** mergi in `main` (lo fa una chat di review separata).
> Decisioni di riferimento: `DECISIONI.md` **2026-06-04 (b)** e **(f)**.

## Obiettivo
Rendere vera la promessa "vedi le TUE prestazioni": l'utente loggato diventa un **giocatore reale**
nel **Personale**, riconosciuto come **"sei tu"**, sempre presente quando gioca. Effetto collaterale
voluto: la Classifica globale **"La tua situazione"** si popola da sola.

**Niente soldi, niente logica delicata** → UI + store + due funzioni pure con test.

## Modello (deciso — non re-inventarlo)

### Identità
- I giocatori sono `NomeGiocatore {id, nome}` con **`id` numerico stabile per-lega** (`_nid`). Tutto
  il gameplay riferisce per `id`. **Non toccare questo modello.**
- **"sei tu" è CALCOLATO, non un flag salvato.** Un giocatore "sei tu" ⇔
  `normalizzaNome(g.nome) === normalizzaNome(utente.username)`. Niente campo `seiTu` nei dati
  (i nomi sono già unici per-lega → il match è univoco; e così non c'è stato da corrompere quando,
  nella beta, lo username cambia).
- **`utente`** vive in `sessionStorage` (effimero) e il **login demo accetta qualunque username**.
  È accettato che ogni login con un nome diverso sia **"un tu pulito"** (vedi `DECISIONI.md` (b)).

### Cosa fa la fase
1. **`normalizzaNome(s)`** — util **condivisa NUOVA** (la riuserà #4.7 ovunque): `trim` → minuscolo →
   collassa spazi multipli → rimuove accenti/diacritici. Pura, con test.
2. **Auto-add al login**: a `login`/`register` riusciti, assicura che nel **Personale** esista un
   `NomeGiocatore` col tuo username (se un nome che normalizza uguale **esiste già**, NON duplicare:
   è già "te"; altrimenti crealo, bumpando `_nid`). Funzione pura `assicuraGiocatorePersonale`.
3. **Badge "sei tu"** dove compaiono i giocatori (vedi UI sotto).
4. **Lock di partecipazione**:
   - **Personale** (poker e non-poker): il tuo record è **sempre incluso e non deselezionabile**.
   - **Creazione lega** (`NuovaLega`): sei **pre-incluso e bloccato DURANTE la creazione**; **dopo**,
     nelle sessioni di quella lega, torni deselezionabile. Alla creazione entri come **unico admin**:
     marca `Lega.adminIds = [tuo id]` (**solo dato, nessun potere/azione** — i poteri sono #7.5).
   - Non puoi **eliminarti** dal Personale (`eliminaGiocatore` lo blocca se è "sei tu").
5. **"La tua situazione"** (`ClassificaShell`): verifica/garantisci che la persona di default sia
   `utente.username` → ora trova dati. (Probabile già così; semmai una riga di fix.)

## Tipi (`src/types/index.ts`)
- **Aggiungi** `adminIds?: number[];` a `Lega` (opzionale, predisposizione — commenta "marcatore creatore=admin, poteri in #7.5"). **Nessun altro** campo nuovo (niente `seiTu`).

## Funzioni pure + util (con test)
- **`src/utils/normalizzaNome.ts`** (+ `.test.ts`):
  ```
  normalizzaNome("  giuliA ") === "giulia"
  normalizzaNome("José")      === "jose"
  normalizzaNome("Mario  Rossi") === "mario rossi"
  normalizzaNome("ANNA")      === "anna"
  ```
  (accenti via `.normalize('NFD').replace(/\p{Diacritic}/gu,'')`).
- **`èSeiTu(nome: string, username?: string|null): boolean`** — `false` se username nullo/vuoto;
  altrimenti confronto `normalizzaNome`. Mettila accanto a `normalizzaNome` (la usano UI e store).
- **`assicuraGiocatorePersonale(personale: Lega, username: string): Lega`** — pura, idempotente:
  - se esiste `n` con `normalizzaNome(n.nome)===normalizzaNome(username)` → ritorna la lega **invariata**;
  - altrimenti ritorna lega con `nomi:[...,{id:_nid, nome:username.trim()}]`, `_nid:_nid+1`.
  - Test: idempotenza (richiamata 2× non duplica), match case/accenti, creazione su Personale vuoto.

## Store (`src/store/useStore.ts`)
- In **`login`** e **`register`** (dopo `set({utente})` riuscito): trova la lega `personale`,
  applica `assicuraGiocatorePersonale`, `saveLega`. Difensivo: se il Personale non esiste ancora
  (raro: `runMigrations` lo crea al boot), salta senza crashare.
- **`eliminaGiocatore`**: se la lega è `personale` e il record è "sei tu" (`èSeiTu(nome, get().utente?.username)`)
  → ritorna messaggio "Non puoi rimuovere te stesso dal Personale" (come gli altri errori-stringa).
- **Partecipanti obbligatori**: esponi un helper/selettore che, data una lega, dice **quali id sono
  bloccati-inclusi** (Personale → l'id "sei tu"; lega normale → nessuno; serve invece in `NuovaLega`,
  vedi sotto). Riusa `setupPartIds`/`toggleSetupPartId` esistenti: il toggle sull'id obbligatorio
  dev'essere **no-op** e l'id va **pre-selezionato** all'apertura del picker.

## UI (componenti coinvolti — dall'inventario in `POKER_MAP.md`)
- **`components/giocatori/TabPartecipanti.tsx`** (condiviso lega `/giocatori` + poker `/partecipanti`):
  badge **"sei tu"** accanto al nome che matcha; il tuo record in Personale non mostra il cestino.
- **Picker partecipanti — Personale (lock + preselect non deselezionabile)**:
  - **Poker**: `components/serata/SetupForm.tsx` (usa `setupPartIds`).
  - **Non-poker**: `components/gioco/SheetNuovaSessione.tsx` (partecipanti sessione) e l'override
    partecipanti della singola partita in `components/gioco/SchermataGioco.tsx` / `SheetEsitoPartita.tsx`.
  - In **Personale** l'id "sei tu" è spuntato e disabilitato (chip/checkbox non cliccabile).
- **`components/leghe/NuovaLega.tsx`**: pre-include il tuo nome (`assicuraGiocatorePersonale`-style sulla
  nuova lega: aggiungi un `NomeGiocatore` col tuo username), **bloccato durante la creazione**, e set
  `adminIds:[quel id]`. (Dopo, nelle sessioni di quella lega, deselezionabile: NON propagare il lock lì.)
- **`components/shell/ClassificaShell.tsx`**: persona default = `utente.username` (verifica; fix minimo se serve).
- **Badge "sei tu"**: stile in CSS (NO inline style — vedi memoria/`DESIGN_SPEC.md`). Bandierina rossa
  o chip curato; segui i token di `DESIGN_SPEC.md`. Classe es. `.badge-sei-tu`.

## Fuori scope (NON fare qui)
- **Soprannome/nickname** e `rinominaGiocatore` → **#4.7**.
- **Poteri admin** (nomina/revoca/espulsione) → **#7.5** (qui solo il dato `adminIds`).
- **Identità cross-device / cambio nome account** → **#8 backend**.
- Componenti condivisi classifica/storico, filtri → **#4.6/#4.7**.
- Qualunque cosa tocchi soldi/settlement.

## Micro-commit suggeriti (1 idea = 1 commit, push dopo ognuno)
1. `feat(4.5): normalizzaNome + èSeiTu (util condivisa) + test`
2. `feat(4.5): tipo Lega.adminIds + assicuraGiocatorePersonale (puro) + test`
3. `feat(4.5): auto-add "sei tu" al login/register; blocco auto-eliminazione`
4. `feat(4.5): lock partecipazione Personale (poker + non-poker)`
5. `feat(4.5): NuovaLega pre-include + lock creazione + adminIds`
6. `feat(4.5): badge "sei tu" + default persona ClassificaShell + CSS`

## Checklist fine-fase (obbligatoria)
1. `npx tsc -b` verde · `npm run lint` verde · `npm test` tutti verdi (i nuovi test inclusi)
2. `git push` dell'ultimo commit (branch `multigioco-4-5-sei-tu`)
3. Messaggio finale all'utente con:
   - micro-step completati
   - **cosa testare nel browser** (vedi sotto)
   - "apri chat di review separata per il merge"
4. **Non** mergiare in `main`.

## Cosa testare nel browser (per il messaggio finale)
- Login con un nome nuovo "Zelda" → in **Personale → Giocatori** compare "Zelda" con badge **"sei tu"**,
  senza cestino. In **Nuova sessione/partita** (Personale, sia un gioco non-poker sia il poker) "Zelda"
  è **spuntata e non deselezionabile**.
- **Classifica globale** → "La tua situazione" è su **Zelda** di default; dopo aver chiuso una partita
  in Personale, mostra i suoi numeri.
- **Crea una lega** → sei **pre-incluso e bloccato** mentre la crei; entrando nelle sue sessioni puoi
  **deselezionarti**. (Controlla che `adminIds` contenga il tuo id — via dati/console, non serve UI.)
- **Re-login** come "Link" → "Link" diventa il nuovo "tu" (pulito); "Zelda" resta un giocatore normale
  col suo storico. (Comportamento beta atteso.)
- Caso match: se in Personale esisti già come "anna" e fai login "ANNA" → **niente doppione**, agganci "anna".
