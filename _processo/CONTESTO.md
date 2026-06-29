# CONTESTO — Card Tracker (ex poker-tracker)

> Ogni chat base del progetto legge PRIMA questo file. Aggiornare quando cambia
> qualcosa di significativo (fase mergeata, spec nuovo, decisione importante).
>
> ℹ️ I file di processo (`*_SPEC.md`, `*_PROMPT.md`, `*_MAP.md`, CONTESTO, IDEE,
> DECISIONI) vivono nella cartella **`_processo/`** (gli spenti in **`_processo/archivio/`**).
> **Aggiornamento 2026-06-04: `_processo/` è ora PUBBLICO su GitHub** (showcase del processo;
> prima — dal 2026-05-31 — era gitignorato/locale). I riferimenti qui sotto sono per **nome
> file** (sono tutti dentro `_processo/`).

## Cos'è
App React per **segnare le partite** che fai con gli amici a qualsiasi gioco di
carte/tavolo. Nasce come tracker di poker (cash + torneo, settlement, timer,
classifiche) ed è in **trasformazione verso un tracker multi-gioco "Card
Tracker"** (vedi `MULTIGIOCO_SPEC.md`). Il poker resta dentro, com'è, con un
restyle grafico.

## Path
`C:\Users\rober\Desktop\Programmi\poker\` — `poker-react/` per l'app React.
I `.md` di processo stanno in `_processo/` (attivi) e `_processo/archivio/` (spenti).
Node in `C:\Program Files\nodejs` (se `npm` non è nel PATH, usa il path completo).

## Stack
Vite 6 + React 19 + TypeScript strict + Zustand (persist localStorage) +
React Router 7 + Vitest. ESLint flat config. CSS con variabili (no Tailwind, no
inline style — vedi memoria feedback).

## File di riferimento (tutti LOCALI, leggere quando servono)
- `METODO.md` (sul Desktop) — come si lavora: chat base orchestra, chat di fase implementano.
- `MULTIGIOCO_SPEC.md` — **contratto della trasformazione Card Tracker** (ambiti
  Personale/Leghe, gerarchia Gioco→Sessione→Partita, IA dell'app §5, routing, fasi M1-M5).
- `DESIGN_SPEC.md` — **sistema grafico** (tema scuro + accento per gioco, poker
  feltro, icone originali no-emoji no-loghi, token, restyle). Lo leggono le fasi UI.
- `archivio/MULTIGIOCO_M1_PROMPT.md` — prompt di Fase M1 (**fatta e mergiata** 2026-06-01).
- `DECISIONI.md` — log delle scelte (per non ri-discuterle).
- `USCITA_CASH_SPEC.md` — **soldi d'uscita** (lasciare il cash/torneo in corso):
  formula unica `saldoUscita = valore − mancante`, esempi-test, review finale. Pronto.
- `TAVOLO_LIVE_SPEC.md` — **UI sessione viva**: tavolo virtuale (cash+torneo),
  cassa al centro, menù soldi sul posto, timer per-persona, naming "Sessioni",
  impostazioni GameBar. Bozza (estende `TavoloView.tsx` già in `main`).
- `POKER_MAP.md` — mappa del codice React attuale (routing, store, componenti, utils).
- `SETTLEMENT_SPEC.md` — contratto settlement cash v2 (implementato, in main).
- `archivio/` — storici **fatti e mergiati** (TAVOLI_SPEC + T1/T2/T3, SERATA_PROGRAMMATA
  SPEC+PROMPT, REACT_MIGRATION/ENTRATA_V2/CLEANUP prompt) + **`IDEE.md`** (ragionamento
  storico/post-backend, citato dalla fase 8). Reference, non si toccano.
- `README.md` — descrizione pubblica (resta su GitHub).

## Stato attuale (2026-06-04)

Su `main`: migrazione React (Fasi 1-5) + overlay + **settlement cash v2 +
`entrata` per giocatore** + **fix settlement torneo** (auto-compensazione
contributo↔premio) + **serata programmata** + **cleanup codice morto** +
**feature tavoli COMPLETA** (T1+T2+T3) + **SPINA MULTIGIOCO COMPLETA**: M1 (modello+stats)
→ R/M2 (design system scuro + shell + Personale) → M3 (segna-partita + sezione lega a 4
schede) → **M4** (classifiche) → ✅ **RIFINITURE 4.x COMPLETE**: #4.5 (utente-giocatore "sei tu") +
#4.6 (layer-dati) + #4.7a (classifica condivisa) + #4.7b (storico condiviso) + #4.7c (soprannome +
normalizzazione ovunque). Ultimo merge `c242c1c`.
Logica poker invariata, `vanillaCompatStorage` intatto.
**147/147 test verdi**, TSC + lint + **build di produzione verdi** (vite build ok). Solo branch `main` (+ i `claude/*` ambiente).

**Git ripulito (2026-05-31)**: i documenti di processo `.md` sono stati tolti dal
versionamento (`git rm --cached`) e messi in `.gitignore`. Su GitHub ora restano
solo **app (`poker-react/`) + `_legacy/` (storia) + README + LICENSE**.

**Riordino file (2026-05-31)**: tutti i `.md` di processo sono stati spostati dalla
root nella cartella **`_processo/`** (attivi) e **`_processo/archivio/`** (spenti).
La root del repo ora ha solo `README.md`. `_processo/` è gitignorata (regola
`/_processo/`). I riferimenti incrociati tra documenti restano per **nome file**
(quelli in archivio si citano come `archivio/<file>`).
Aggiornamento **2026-06-01**: `IDEE.md` spostato in `archivio/` (storico/superato);
attivi: **9**, archivio: **10**.

**Direzione presa (2026-05-31)**: trasformazione **Card Tracker** (multi-gioco),
grafica decisa (scuro + accento per gioco; poker = feltro; icone originali, niente
emoji, niente loghi di marca). Vedi `DECISIONI.md`, `MULTIGIOCO_SPEC.md`, `DESIGN_SPEC.md`.

## Roadmap (ORDINE DECISO 2026-05-31)

> Ordine **definitivo** scelto con l'utente: spine multigioco prima, poi poker-live,
> infine rebranding. **Esecuzione sequenziale** (una chat di fase alla volta — niente
> chat in parallelo). La chat base può riordinare solo con l'utente.

1. **M1 — Modello dati + statistiche** (NO UI) — ✅ **FATTA e MERGIATA** (2026-06-01,
   merge `7e0430b`, 40/40 test). Tipi `GiocoLega/SessioneGioco/PartitaGioco` + estensione
   `Lega`, catalogo `giochi.ts`, `migrateLega` pura **non agganciata** (la collega M2),
   `calcolaStatsGioco`. Prompt in `archivio/MULTIGIOCO_M1_PROMPT.md`. Vedi `DECISIONI.md` 2026-06-01.
2. **R/M2 — Design system + Shell + routing + Personale** — ✅ **FATTA e MERGIATA**
   (2026-06-02, merge `df738b9`, 48 test). Token scuri + tema dinamico per gioco (feltro
   poker), libreria UI + icone SVG, bottom nav 4 voci + routing (poker sotto
   `/leghe/:id/poker`), GameBar persistente, lega **Personale** + `migrateLega` agganciata,
   Hub di lega. Poker invariato. ⚠️ Lega resa come **Hub singolo**; la **sezione lega a 4
   schede** (Home/Classifica/Storico/Giocatori) è stata decisa dopo → si fa in M3 (vedi
   `DECISIONI.md` 2026-06-02). Prompt in `archivio/MULTIGIOCO_R_M2_PROMPT.md`.
3. **M3 — Schermata comune del gioco** (il cuore "segna partita") — ✅ **FATTA e MERGIATA**
   (2026-06-03, merge `df13abd`, 57 test). Flusso segna-partita non-poker
   (SessioneGioco→PartitaGioco: crea/avvia sessione, ciclo partita con vincitori/pareggio/
   partecipanti/nomeLibero, chiudi sessione + esito, storico), **sezione lega a 4 schede**
   (Home/Classifica/Storico/Giocatori), Home Personale, `NuovaLega` init. Verificato a browser
   (Personale + lega + poker intatto). Prompt in `archivio/MULTIGIOCO_M3_PROMPT.md`.
   ↪ Naming "Sessioni" poker (contenitore vs rename) **disaccoppiato** → resta con la fase
   tavolo-live (#6), dove c'è il rename UI. M3 non ha toccato il poker.
4. **M4 — Classifiche** — ✅ **FATTA e MERGIATA** (2026-06-04, merge `d032dca`, 75 test).
   `utils/classifiche.ts` (`sommaStats` con % ricalcolata, `statsPersonaCrossContesto` per
   nome, `classificaGioco`). Classifica di lega per gioco (corona al leader) + globale
   **centrata sulla persona** (prima riga = totale aggregato Personale + tutte le leghe;
   breakdown per contesto a scomparsa; classifica Personale; avviso identità). Prompt in
   `archivio/MULTIGIOCO_M4_PROMPT.md`. Poker invariato.
4.5 **Utente-giocatore ("sei tu")** — ✅ **FATTA e MERGIATA** (2026-06-04, merge `6515bd5`, **95 test**).
   ⭐ Richiesta utente: il nome
   di login diventa un **giocatore reale**, auto-inserito nel Personale e marcato **"sei tu"**
   (badge, es. bandierina rossa). **Personale**: sempre incluso, **non deselezionabile**. **Quando
   CREI una lega**: non deselezionabile *durante la creazione*, **dopo** sì; entri come **unico
   admin** (i poteri multi-livello sono la fase #7.5). **Lega/sessioni** in generale:
   deselezionabile (segnapunti). Popola da sola "La tua situazione". UI + store → **Sonnet**.
   Testabile anche col login demo (funzioni pure + browser con nome nuovo). **Impl. (f)**: "sei tu"
   **calcolato** da `normalizzaNome(username)` (niente flag stored → robusto alla beta; ogni login
   demo = un "tu" pulito), auto-add a Personale al login; nasce qui la util condivisa `normalizzaNome`
   (riusata da #4.7); creazione lega → `Lega.adminIds:[tuo id]` (solo marcatore, poteri = #7.5); il
   *tuo* nome = account/impostazioni → #8. Prompt in `archivio/MULTIGIOCO_4_5_SEI_TU_PROMPT.md`. Vedi `DECISIONI.md` (b)+(f)+(g).
4.6 **Layer-dati classifiche/storico** — ✅ **FATTA e MERGIATA** (2026-06-04, merge `3598a2e`, **138 test**, ri-scopata (f)): SOLO utils testabili — espone il
   **poker in un modello-riga unificato** (col **netto €**) e la **logica filtri** (gioco + nome),
   **senza toccare la UI vecchia**. Sblocca "poker inline" + filtro-gioco-storico, ma la UI arriva col
   #4.7 (che ci costruisce sopra → niente lavoro buttato). Test-first. Sonnet.
   Prompt in `archivio/MULTIGIOCO_4_6_LAYER_DATI_PROMPT.md`. Vedi `DECISIONI.md` (d)+(f)+(h).
4.7 **Componenti condivisi Classifica/Storico + nickname** — **SPLIT in sub-fasi** (deciso (i):
   fase grande/UI su 4 contesti). Sul layer-dati del #4.6, tutte **Sonnet**, una alla volta:
   - **4.7a — Classifica condivisa** — ✅ **FATTA e MERGIATA** (merge `8da1854`, 138 test): UN componente tabella per tutti i contesti
     (Personale/lega/poker), **KPI parametriche** (poker = **netto + %**; giochi = **% + sess.**),
     **filtro nome** (`ordinaMatchInCima`, match in cima), **poker inline** in LegaClassifica +
     ClassificaShell ("La tua situazione" poker via `classificaPokerCrossContesto`; il redirect alla
     schermata poker resta come accesso rapido). "ci sei/sei stato" = best-effort (vedi (i)).
     Prompt in `archivio/MULTIGIOCO_4_7A_CLASSIFICA_PROMPT.md`. Review: DECISIONI (j).
   - **4.7b — Storico condiviso** — ✅ **FATTA e MERGIATA** (merge `e64d9e9`, 138 test): UN componente
     `StoricoLista` su `vociStorico`, **filtro gioco** in LegaStorico (Tutti/poker/giochi, colma (d)) +
     **filtro nome secco**; poker inline (no redirect); `StoricoSessioni` rimosso. Prompt in
     `archivio/MULTIGIOCO_4_7B_STORICO_PROMPT.md`. Review: DECISIONI (k).
   - **4.7c — Nickname + normalizzazione** — ✅ **FATTA e MERGIATA** (merge `c242c1c`, **147 test**):
     `rinominaGiocatore` (`validaRinomina` puro: dedup normalizzato, blocco sul "sei tu") + edit soprannome
     inline in Giocatori (id stabile, cosmetico, **NON** sul "sei tu"); **`normalizzaNome` ovunque**
     (`statsPersonaCrossContesto`, dedup `aggiungiGiocatore`, serata/SheetNuovaSessione/ListaLeghe). Prompt in
     `archivio/MULTIGIOCO_4_7C_NICKNAME_PROMPT.md`. Review: DECISIONI (l).
   ✅ **#4.7 COMPLETA (a+b+c).** **Dipendeva da #4.5/#4.6.** Vedi `DECISIONI.md` (e)+(f)+(i)+(j)+(k)+(l).
5. **Soldi d'uscita** (poker, logica soldi — chat Opus): funzione pura `saldoUscita`
   + esempi-test (`USCITA_CASH_SPEC §6`) → modello/store → azioni. Primo pezzo del
   blocco poker-live (sblocca l'azione "esce" del tavolo).
6. **Tavolo live + cassa + timer + "Sessioni"** (`TAVOLO_LIVE_SPEC`): UI che
   **estende `TavoloView.tsx`** (cassa al centro, menù soldi sul posto, timer
   per-persona, settlement live, naming "Sessioni", GameBar settings). Dipende dalla
   shell M2 e dalla funzione pura del punto 5.
7. **M5 — Rebranding "Card Tracker"** + UI giochi custom + rifinitura identità/icone.
7.5 **Ruoli e poteri (BASE LOCALE, pre-backend)** — ⭐ (richiesta utente 2026-06-04): admin a
   **più livelli** dentro la lega. Chi crea la lega è l'**unico admin** col potere massimo; può
   **nominare admin** altri e **condividere anche il potere massimo**; chi ha il massimo può
   **revocarlo (anche a te) ed espellere** dal gruppo (a tua discrezione darlo solo a chi ti fidi).
   Versione **locale** (single-device) come **base**, da ampliare col **backend** (#8). Timing
   flessibile ma **prima del backend**. Vedi `DECISIONI.md` 2026-06-04 (c).
8. **(Post-backend, Supabase)**: ruoli/permessi per-gioco, dati personali
   cross-device, spettatori del tavolo. Vedi `archivio/IDEE.md`.

**Prossima azione concreta** (chat base, 2026-06-04): ✅ **RIFINITURE 4.x TUTTE CHIUSE** — #4.5, #4.6,
#4.7a/b/c FATTE e MERGIATE (da `6515bd5` a `c242c1c`; **147 test**, tsc+lint+**build di produzione** verdi;
review chat base OK). Controllo generale fatto (build prod ok, `main` allineato/pulito, branch di fase cancellati).

✅ **Collaudo a browser fatto (2026-06-12, chat base)** con dati di test: classifica condivisa + poker
inline + ricerca match-in-cima, storico filtro gioco, "sei tu", soprannome → **tutto ok, zero errori console**.

🔀🔀 **PIVOT a REACT NATIVE (Expo) — 2026-06-13 (b), deciso con l'utente**: l'app va portata su **React
Native** (più mercato, obiettivo CV). Dettaglio completo + reuse/rebuild in **`DECISIONI.md` 2026-06-13 (b)**.
- **Stack**: **Expo (managed)** + TS + Expo Router. **Aggiornamenti veloci PRESERVATI** via **EAS Update (OTA)**.
- **Si RIUSA il "cervello"** (TS puro, già scritto): `utils/`, `types/`, **store Zustand** (persist →
  AsyncStorage), `lib/supabase.ts` (AsyncStorage), i **147 test**, tutto `_processo/` (design/decisioni).
- **Si RICOSTRUISCE la "pelle"**: `components/*`, `styles.css` (→ StyleSheet), routing (→ Expo Router),
  auth UI (conferma email via **deep link**). L'architettura era già RN-friendly (logica separata, no Tailwind).
- **Il backend resta valido** (`BACKEND_SPEC.md`: auth/RLS/profiles/dati): cambia **solo il client** (RN).
- **Strategia: PIVOT ORA** (non costruire altra UI web) → ricostruisci le schermate esistenti in RN, poi
  tutto il resto (auth, settings, ruoli, feature) **direttamente in RN**. **App web = riferimento congelato**.
- **Roadmap RN** (sostituisce il piano "backend su web B0-B4"; il **design** backend si riusa):
  **R0** fondazione Expo + logica condivisa (147 test verdi) → **R1** port schermate core (shell/lega/poker/
  classifica/storico/giocatori) → **R2** Auth Supabase RN (deep link; riusa la logica del branch
  `backend-b1-auth`) → **R3** username univoco (`profiles`) → **R4** sync dati → **R5** ruoli/condivisione
  → **settings + feature locali in volo** → **RP** pubblicazione (EAS Build + EAS Update, Play Store).
- ✅ **DECISO (2026-06-13/29)**: **monorepo** (pnpm workspaces + Turborepo, `.npmrc` hoisted per Metro).
  **B1 auth mergiato in `main`** (`08364dc`) come riferimento riusabile.
- ✅ **R0 CHIUSO** (mergiata in `main` il 2026-06-29, merge `dfa2989`; branch di fase cancellato):
  - **R0.1 FATTO** (`9d6328e`,`3c226a4`): scaffold monorepo. `apps/web` = ex web congelata (`@poker/web`);
    `packages/` per la logica; root `package.json`/`pnpm-workspace.yaml`/`turbo.json`/`.npmrc`. Turbo verde.
  - **R0.2 FATTO** (`034974d`,`a8ab1d4`): estratto **`@poker/core`** = logica pura (`utils/`+`types/`+**138 test**,
    barrel `src/index.ts`). La web importa `@poker/core` (44 file riscritti). **147 test** verdi (138 core + 9 web),
    build+lint verdi. `giochi.test` (cross-check coi glifi web) tenuto in `apps/web`.
  - **R0.3 FATTO** (`90c3732`): scaffold **`apps/mobile`** = Expo **SDK 56** (Expo Router, TS, React 19.2 / RN 0.85)
    che consuma `@poker/core`; `metro.config.js` per monorepo (watchFolders root + nodeModulesPaths hoisted);
    schermata fondazione (`normalizzaNome` + `calcolaSettlement`). Demo del template rimossa. Verde:
    `tsc --noEmit` + **`expo export`** (Metro: 1536 moduli, bytecode Hermes). Turbo test monorepo verde (147).
  - **R0.4 FATTO** (`dfa2989`): merge `rn-r0-monorepo` → `main` (`--no-ff`); **147 test verdi su `main`**; branch cancellato.
  - **PROSSIMO → R1**: port delle schermate core in RN (shell/lega/poker/classifica/storico/giocatori) su
    `apps/mobile`, riusando `@poker/core`. È il blocco grosso → **consigliata una chat nuova** (legge METODO + CONTESTO).
  - ⏳ **Debito R0.3**: il template ha portato dep Expo non ancora usate (`@expo/ui`, `expo-glass-effect`,
    `expo-symbols`, `expo-image`, `expo-device`, `expo-web-browser`) e icone generiche Expo → sfoltire/brandizzare
    in R1/RP. `reactCompiler` experiment lasciato ON (bundle ok).
  - ⏳ **Rimandato apposta da R0.2 → R2/mobile**: astrarre lo **storage** dello store (localStorage web /
    AsyncStorage mobile) e il **client Supabase** (env per-app: `import.meta.env` web / `process.env.EXPO_PUBLIC_*`
    mobile). Oggi `store/` + `lib/supabase.ts` stanno **ancora in `apps/web`** (hanno pezzi platform-specifici).
> Storia (superata dal pivot RN): "backend su web B0-B4" + "Play Store via PWA/TWA" → ora l'OTA è **EAS
> Update**. Il branch `backend-b1-auth` (auth web, verde, non mergiato) resta come **logica-sorgente riusabile**.

## Debito tecnico noto (segnalato, da fare al momento opportuno)
- **`nuovoGiocoCustom` usa id `custom-${Date.now()}`** → collisione possibile (teorica).
  Irrobustire (contatore/uuid) **quando nasce la UI giochi custom → M5** (prima nessun chiamante).
- **`getNome` re-implementato inline** in alcuni punti dello store (`lega.nomi.find(n => n.id === …)?.nome
  ?? '?'`, ≈3 punti) invece di chiamare `getNome(lega, id)` da `format.ts`. Cleanup banale, basso rischio
  → **assorbito da #4.7** (passa comunque su nomi/lookup; non aprire un task a sé). Scansione 2026-06-04 (f).
- ~~`NuovaLega` non inizializza i campi multigioco~~ → **risolto in M3** (chiama `migrateLega`).
- ~~`utils/giochi.ts` senza test~~ → **risolto in R/M2** (`giochi.test.ts`).

## Promemoria attivi (la chat base li controlla e li ricorda all'utente)
- **Screenshot README**: si fanno **quando si arriva al backend** (app "tutto pronto"). Guida in
  `docs/screenshots/README.md`. La chat base **lo ricorda** all'utente al momento giusto.
- **Showcase aggiornato**: `_processo/` è pubblico/tracciato → committare+pushare le modifiche ai
  doc alla chiusura di ogni fase (così GitHub resta allineato).

## Workflow del progetto
- Branch per ogni fase (es. `multigioco-m1`), cancellato dopo il merge (il codice
  resta in `main`; eventuale lavoro scartato si archivia in un tag).
- Commit a checkpoint logici, **push dopo OGNI commit**.
- Chat dedicata per ogni fase (Opus per logica delicata/soldi, Sonnet per il resto).
- Review in chat separata prima di mergiare in `main`. Niente merge alla cieca.
- Logica di soldi → SPEC con esempi-test PRIMA del codice.

## Cose da NON toccare senza spec
- Settlement cash (`calcolaSettlement`) e torneo (`calcolaSettlementTorneo`,
  modello `contributo_residuo/premio_residuo`).
- `vanillaCompatStorage` in `src/store/useStore.ts` (legge localStorage vanilla, retrocompat).
- La logica del poker in generale: nella trasformazione si **sposta** sotto
  `/poker` e cambia solo aspetto (tema feltro), non comportamento.

## Comandi rapidi (dalla root del monorepo)
```
pnpm dev:web        # server dev web (Vite, porta 5173)
pnpm run test       # tutti i test via Turbo (147: 138 @poker/core + 9 web)
pnpm run lint       # ESLint via Turbo
pnpm run build      # build di tutti i pacchetti via Turbo
pnpm --filter @poker/core test   # solo i test della logica condivisa
```
(serve `pnpm` sul PATH: `npm i -g pnpm@9`. Turbo orchestra i pacchetti.)

## Repo
GitHub **pubblico**: `https://github.com/robertotommasogrossi7-bit/whos-the-boss`
(Su GitHub: **monorepo** `apps/web` + `packages/core` + `_legacy/` (storia) + **`_processo/` pubblicato** (showcase del
processo AI) + README + LICENSE. Default branch `main`.)
