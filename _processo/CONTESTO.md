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
`C:\Users\rober\Desktop\Programmi\poker\` (monorepo pnpm+Turborepo) — `apps/mobile/` (Expo, **l'app**),
`packages/core/` (logica condivisa), `packages/state/` (store condiviso), `supabase/` (schema-as-code).
⚠️ **`apps/web` è stata RIMOSSA** (2026-07-01, dopo il pivot React Native completo): archiviata al tag
git `archive/web-frozen`, recuperabile con `git checkout archive/web-frozen -- apps/web`.
I `.md` di processo stanno in `_processo/` (attivi) e `_processo/archivio/` (spenti).
Node in `C:\Program Files\nodejs` (se `npm` non è nel PATH, usa il path completo).

## Stack
**Expo (React Native) + Expo Router** + TypeScript strict + Zustand (persist → AsyncStorage) +
**Supabase** (Auth email+password + Postgres/RLS, schema-as-code in `supabase/migrations/`) +
Vitest (202 test in `packages/core`). ESLint flat config. `StyleSheet` React Native (design token,
tema scuro + accento per gioco — no Tailwind, no inline style, vedi memoria feedback).
*(Storia: era Vite+React Router web fino al pivot RN del 2026-06-13/29, vedi sotto.)*

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
  - **R0.1 FATTO** (`9d6328e`,`3c226a4`): scaffold monorepo. `apps/web` = ex web congelata (`@whos-the-boss/web`);
    `packages/` per la logica; root `package.json`/`pnpm-workspace.yaml`/`turbo.json`/`.npmrc`. Turbo verde.
  - **R0.2 FATTO** (`034974d`,`a8ab1d4`): estratto **`@whos-the-boss/core`** = logica pura (`utils/`+`types/`+**138 test**,
    barrel `src/index.ts`). La web importa `@whos-the-boss/core` (44 file riscritti). **147 test** verdi (138 core + 9 web),
    build+lint verdi. `giochi.test` (cross-check coi glifi web) tenuto in `apps/web`.
  - **R0.3 FATTO** (`90c3732`): scaffold **`apps/mobile`** = Expo **SDK 56** (Expo Router, TS, React 19.2 / RN 0.85)
    che consuma `@whos-the-boss/core`; `metro.config.js` per monorepo (watchFolders root + nodeModulesPaths hoisted);
    schermata fondazione (`normalizzaNome` + `calcolaSettlement`). Demo del template rimossa. Verde:
    `tsc --noEmit` + **`expo export`** (Metro: 1536 moduli, bytecode Hermes). Turbo test monorepo verde (147).
  - **R0.4 FATTO** (`dfa2989`): merge `rn-r0-monorepo` → `main` (`--no-ff`); **147 test verdi su `main`**; branch cancellato.
- 🟢 **R1 IN CORSO** (branch `rn-r1-port`; approccio deciso con l'utente: **port nativo fedele**, restyle visivo dopo):
  port delle schermate core in RN su `apps/mobile` riusando `@whos-the-boss/core`. Nav = Expo Router (tab native + stack).
  Sotto-fasi: R1.1 tema+nav · R1.2 design system · R1.3 fondazione stato (store→AsyncStorage, **mini-spec prima**) · R1.4… schermate.
  - **R1.1 FATTO** (`9e49827`): tema RN (token scuri+feltro come oggetto, accento per gioco riusato da `core/tema`)
    + ThemeContext/useTheme + scheletro Expo Router (root Stack + ThemeProvider; `(tabs)` 4 voci
    Home/Classifica/Storico/Leghe, tab bar nativa tematizzata, icone Ionicons placeholder) + `Placeholder.tsx`.
    Rimosso il demo R0.3. Verde: `tsc --noEmit` + `expo export` (Metro 1605 moduli).
  - **R1.2 FATTO**: design system. R1.2a (`c8514ca`) = primitive native (Button/Card/Chip/Avatar/EmptyState/
    ListRow/Sheet/Toast), colori dai token via `useTheme`; R1.2b (`12d1112`) = icone in `react-native-svg`
    (set UI completo ~30 + glifi gioco + `GameIcon`), tab bar con icone vere (`@expo/vector-icons` rimosso).
    Home = anteprima del design system. Verde (tsc + expo export 1666 moduli).
  - **R1.3 FATTO** (fondazione stato condiviso, mini-spec approvata):
    - **R1.3a** (`087f697`): scaffold `packages/state`. **R1.3b-1** (`af819f2`): `computeLive` (puro) → core.
    - **R1.3b-2** (`b80d0f2`): store → **`packages/state/src/store.ts`** come **`createAppStore({ storage, auth })`**;
      Supabase disaccoppiato (4 azioni = slice iniettata; store tiene `utente` + `applyUtente`/`setAuthLoading` puri);
      storage iniettato. `apps/web` = shim `useStore` (vanillaCompatStorage + supabaseAuth) + `authSlice.ts` +
      `vanillaCompatStorage.ts`; **import dei componenti invariati**. Store ora **DOM-free + Supabase-free**.
    - Verde: state tsc · web build (tsc -b + vite) · turbo test **147** · mobile tsc. Web invariata.
  - **R1.3c FATTO** (`59328f1`): store agganciato al **mobile** = `createAppStore({ storage: AsyncStorage })` (no auth,
    default no-op fino a R2); Home legge dallo store (prova wiring). Verde: mobile tsc + expo export (1680 moduli).
    → **R1.3 CHIUSO**: stato condiviso su web (localStorage+Supabase) e mobile (AsyncStorage), stessa logica.
  - 🟢 **R1.4 IN CORSO** (branch `rn-r1-screens`; fondazione R1.1-R1.3 già in `main`): schermate vere in RN, una alla volta.
    - **R1.4a** (`1e25c8f`): **Leghe** (`(tabs)/leghe.tsx`) — lista da store + stats utente; nav typed → `/lega/[id]`
      e `/nuova-lega` (placeholder con header nativo). Empty state su install fresca (servono Nuova lega + segna-partita).
    - **R1.4b** (`4fd1fc5`): **GameBar** (`components/GameBar.tsx`) + **tema dinamico**: `_layout` legge `giocoFiltro`
      → `themeForGame` → ri-tema app+nav (feltro poker). Completa la dinamicità del tema rimandata da R1.3. In cima alla Home.
    - **R1.4c** (`ae19e88`): **Classifica** (`(tabs)/classifica.tsx`) + sub `classifica/FiltroNome` + `classifica/ClassificaTable`
      (tabella parametrica soldi/punti, match-in-cima, corona, righe-zero). 2 sezioni: cross-contesto per nome + Classifica Personale.
    - **R1.4d** (`325a341`): **Storico** (`(tabs)/storico.tsx`) + sub `storico/StoricoLista` (card espandibili poker/gioco,
      settlement pills, elimina via Alert nativo). Riusa GameBar + FiltroNome. `vociStorico` core.
    - **R1.4e** (`965f289`): **Nuova lega** (form) + **init boot** (`runMigrations` dopo idratazione AsyncStorage).
    - **R1.4f** (`da7bd65`): **Lega** (4 schede, `app/lega/[id].tsx` + segmented control) — Home griglia giochi,
      Classifica/Storico (GiocoPills + componenti riusati), Giocatori (add/rinomina/elimina via Alert). [branch `rn-r1-lega`, **non ancora mergiato**]
    - **R1.4g** (`0cc7d30`): **Home segna-partita** = `SchermataGioco` + `SheetNuovaSessione`/`SheetEsitoPartita`/`PickChip`;
      Home tab reale (GameBar + flusso Personale); rotta `app/gioco/[legaId]/[giocoId]` dalle tile Lega. → **loop multi-gioco completo**.
    - **R1.4h** (`bfa2a4a`): **Debiti** (`app/debiti.tsx`) — debiti aperti per debitore, salda singolo/tutti; banner in LegaHome.
      → **app NON-poker COMPLETA**. [branch `rn-r1-debiti`, da mergiare]
    - 🟢 **R1.5 poker IN CORSO** (branch `rn-r1-poker`): R1.5a shell (`/poker/[legaId]`, feltro, 4 schede) ·
      R1.5b setup serata (hub + form cash/torneo, ConfigTorneo semplificata) · R1.5c **live cash** (SubGiocatoriCash
      roster + SubAttivi conto via computeLive; MoneyInput) · R1.5e **chiusura cash + settlement** (CassaView +
      ChiusuraCash "chi paga chi" + conferma → debiti). → **LOOP CASH POKER COMPLETO end-to-end**.
    - **R1.5d torneo live FATTO** (branch `rn-r1-torneo`): d1 timer+orologio (useTimer; avvia/pausa/prossimo/stop) ·
      d2 Player (SubGiocatoriTorneo: rebuy/add-on/elim/revive + PrizeModal) · d3 Premi (SubPremi) · d4 chiusura
      (ChiusuraTorneo: allocazioni loser→winner, calcolaSettlementTorneo). → **LOOP TORNEO COMPLETO**.
  - ✅✅ **R1 (PORT REACT NATIVE) COMPLETO** — multi-gioco + poker cash + poker torneo, tutto in RN, su `main`
    (manca solo il merge del branch `rn-r1-torneo`). **PROSSIMO: R2 — Auth Supabase RN** (deep link, riusa la
    logica di `apps/web` + `packages/state` applyUtente; lo store mobile oggi parte senza auth con default no-op).
    Rifiniture rimandate (non bloccanti): tavolo virtuale (seating), editor livelli torneo manuale, date-picker
    (data serata/sessione = oggi), foto lega (`expo-image-picker`), toast globale mobile.
  - 🟢 **R2 — AUTH SUPABASE RN** (branch `rn-r2-auth`, 2026-07-01; partito da `8c0ed83`). **Funzionalmente completo**:
    - **R2.0+R2.1** (`6c37a4a`): client Supabase mobile (`lib/supabase.ts`, sessione AsyncStorage, `EXPO_PUBLIC_*`,
      `react-native-url-polyfill`, `detectSessionInUrl:false`) + `store/authSlice.ts` (login/register/logout/initAuth,
      stessa logica web) iniettata nello store (`createAppStore({ storage, auth })`). `.env` gitignorato + `.env.example`.
    - **R2.2** (`38c40c9`): **LoginScreen** RN (tab Accedi/Registrati; banner inline al posto del toast globale).
    - **R2.3** (`51bfd1d`): **gate auth** nel root `_layout` (initAuth al boot; `authLoading`→loader, `!utente`→Login,
      altrimenti Stack). `utente`/`authLoading` non persistiti → niente flash del gate.
    - **R2.5** (`1fde6ab`): schermata **Profilo** (avatar in Home → `/profilo`, pattern Spotify) + **Logout** (conferma Alert).
    - **R2.6** (`f87499e`,`a59ae0c`): **cambio password/email** — contratto auth esteso (`updatePassword`/`updateEmail`,
      default no-op → web resta verde) + impl mobile (riverifica la vecchia password via `signInWithPassword`) + UI Sheet
      (vecchia pwd + nuova credenziale a doppia conferma). Verde a ogni passo: state+web tsc, mobile expo export + tsc.
    - ⏳ **DA SISTEMARE ALLA FINE** (deciso con l'utente, "sistemiamo tutto alla fine"): **R2.4 deep link conferma email**
      (scheme app + rotta callback + **config redirect nella dashboard Supabase** = azione utente); toast globale mobile.
  - ✅ **R2 MERGIATA in `main`** (`c2783db`, 2026-07-01; 147 test verdi; branch cancellato).

### 🆕 LINEA UFFICIALE post-R2 (decisa 2026-07-01 — vedi `DECISIONI.md` 2026-07-01)

> **Strategia A (sostanza prima)** con **reshape-first**: i pezzi che cambiano forma di
> schermate/modello si fanno **PRIMA del backend** (schema migrato una volta sola). **Restyle
> grande = ultima fase prima di pubblicare** (accettato). Slot dedicato per feature nuove (R11).
> Se cambiamo rotta → si registra come **lezione di costruzione** (per SideKick).
> ⚠️ Questi codici **superano** le etichette tentative del pivot (R3=username/R4=sync/R5=ruoli).

- **Quick wins** (apertura): toast globale mobile · date-picker.
- **BLOCCO 1 — reshape locale** (la forma diventa definitiva):
  - **R3 — Poker integrato**: niente sotto-app; classifica/storico restano condivisi, solo "apri sessione" = poker. *(locale)*
  - **R4 — "Tutti i giochi"**: sessione multi-gioco + classifica/storico aggregati; estende `SessioneGioco`. *(locale)*
  - **R5 — Tavolo live interattivo** ⭐ (`TAVOLO_LIVE_SPEC` + `USCITA_CASH_SPEC` soldi d'uscita + naming "Sessioni" +
    fix GameBar pin). **Base single-device** (un telefono = il banco); spettatori multi-device → R9. *(locale)*
- **BLOCCO 2 — backend** (sul modello definitivo):
  - **R6 — Identità reale**: `profiles` + username univoco + **R2.4 deep link** conferma email. *(backend + dashboard)*
  - **R7 — Sync dati cross-device** ⭐: leghe/sessioni/partite su Supabase + RLS + migrazione dal locale. *(il pezzo grosso)*
  - **R8 — Ruoli & condivisione**: admin multi-livello (nominare/revocare/espellere), inviti lega, governance GameBar.
    *(assorbe la vecchia #7.5 "ruoli locali": si va diretti sul backend)*
  - **R9 — Realtime & social**: tavolo live multi-device/spettatori (Supabase Realtime) + amicizie fra account.
- **BLOCCO 3 — rifiniture & nuove**:
  - **R10 — Rifiniture**: editor livelli torneo manuale, foto lega (Supabase Storage), sfoltire dep Expo (debito R0.3).
  - **R11 — Feature nuove** 🆕 (slot aperto): idee non ancora scritte → in `IDEE.md`; le grosse = fase a sé, prima del restyle.
- **BLOCCO 4 — traguardo**:
  - **R12 — Restyle grande**: redesign completo sulla struttura finale + brand definitivo (ricerca UX, best-in-class).
  - **RP — Pubblicazione**: dev build → EAS Build → screenshot README → Play/App Store + EAS Update (OTA).

### 🔁🔁 LINEA v3 (2026-07-03, post AUDIT MULTI-AGENTE) — **AUTOREVOLE, supera la v2 qui sotto**

> Audit "ALTO" (67 agenti: 6 revisori → verifiche adversariali → 4 ricerche online → sintesi) su tutto
> il lavoro: **45 finding confermati / 11 confutati**. Registro indicizzato con ID e fasi:
> **`_processo/AUDIT_R6_R7.md`** (spuntare lì). Scelte architetturali del sync = **allineate** allo
> stato dell'arte (fonti nel registro). Stato reale ad oggi: **R6 completa · R7.1 schema FATTO e
> APPLICATO (5/5 migration in dashboard, senza errori) · ✅ MERGIATA in `main` (`849acb5`, 2026-07-03;
> branch `rn-r6-identita` cancellato)**.
> 📦 **Flusso esecutivo completo fino al Play Store** (Fatto · Manca per pubblicare · Definitiva):
> **`_processo/STATO_PROGETTO.md`** — si aggiorna a fine di ogni passo grande.

- **R6-B — BONIFICA AUDIT** ✅ **COMPLETATA** (B1→B6, 2026-07-03; unico residuo: applicare la migration
  R6-B5 in dashboard quando comodo — non urgente, vedi `supabase/README.md`):
  - **R6-B1** ✅ fix 3 ALTA: `confirm()` fuori dallo store (A1) · gate add-on post-consolidamento (A2) · SetupForm username→id (A3).
  - **R6-B2** ✅ identità R6.5 alla radice: `accountId` sul creatore in nuova-lega + migrazione claim-by-name (M7, risolve M6+B13) · 3 picker multigioco username→id (M5) · dedup displayName (M8).
  - **R6-B3** ✅ store & auth: orfani multigioco (M9) · posizioni provvisorie (M10) · rientro fantasma (M11) · updateEmail redirectTo (M13) · esiti discriminati/commenti (B19,B21,B22).
  - **R6-B4** ✅ doc alla realtà: R7_SCHEMA→SQL effettivo (M15) · banner SUPERATO su BACKEND_SPEC (M16) · README (M17) · CONTESTO §vecchi (M18) · MAPPA (B44) · nota Expo Go (B29).
  - **R6-B5** ✅ hardening SQL (scritto, **non ancora applicato**): ON DELETE SET NULL (M14) · trigger split B31/B35 · poker_movimenti append-only vero (B32) · UNIQUE parziale (B33) · RLS initplan+TO authenticated (B34) + flowType esplicito + dedup deep link (B24) + comandi migration repair (R-mig, azione utente).
  - **R6-B6** ✅ rete test soldi: calc.test.ts nuovo (26 test) + greedy invarianti (B00) + fix M4/B02/B05/B07/B04/B08. **231 test core** (era 185 a inizio R6).
- ✅ **R7.2 — layer di sync COMPLETO** (2026-07-11): R7.2a (uid/syncUpdatedAt) + R7.2b (storage
  per-account, boot+cambio account a caldo) + R7.2c (mapping locale↔cloud tutte le 13 tabelle +
  merge LWW generico, in `packages/core/src/sync/`). 286 test core.
- 🔴 **RED TEAM R7.2 fatto** (2026-07-12, Claude+GPT esterni): registro **`REDTEAM-R72-SYNC.md`**
  (S1-S20, verificati sul codice). Fasi **RIORDINATE** (dettaglio in `R7_SCHEMA.md` sez. N):
  inserito blocco **R7.2d** (hardening del sync PRIMA di usarlo) → **R7.3** import → **R7.4** store →
  **R8** → **R9**.
  - **R7.2d** = d1 invarianti+decisioni · d2 fix dirty-flag (clock→flag locale, S5) · d3 uid sui
    movimenti (S2) · d4 mappa id↔uid (S4) · **d5 GATE: vertical slice su Postgres reale (S1, il #1
    dei revisori)** ⚠️ deviazione dalla "scelta di studio" → serve ok utente (DECISIONI DS6).
  - R7.4 assorbe: push CAS (S3), 1 transazione/lega (S9), mutex anti-race (S11), ordine ledger→settlement (S13).
- 🟡 **IN CORSO (2026-07-12): primo test reale sul telefono** (DS6 — scelta di studio abbandonata,
  si testa strada facendo, non più "un test gigante alla fine"). App installata via EAS, aggiornamenti
  via OTA (`eas update --channel preview --environment preview`). Bug trovati e fixati (via OTA,
  ogni volta: typecheck+expo export prima, poi commit+push+`eas update`):
  - ✅ Loader infinito al boot (race `onAuthStateChange`, R7.2b) — fix `340507d`.
  - ✅ Aggiunto **`ErrorBoundary`** globale (cattura crash di render) — `f16bc0c`.
  - ✅ Aggiunto **crash logger via `ErrorUtils`** (cattura crash FUORI dal render — tap/effect/callback,
    quelli che chiudono l'app di scatto senza passare dall'ErrorBoundary) — `ff51f8b`. Salva l'errore
    in AsyncStorage, lo mostra a schermo alla riapertura successiva.
  - ✅ **RISOLTO — il bug che ha fatto scattare tutto questo**: andare su **"Leghe" crashava l'app**.
    Non era un crash nativo: grazie all'`ErrorBoundary` (`f16bc0c`) l'errore è stato catturato e mostrato
    a schermo — **"Maximum update depth exceeded"**. Causa: `apps/mobile/src/app/(tabs)/leghe.tsx` usava
    un selettore Zustand con `.filter()` **inline** (`useStore((s) => s.db.leghe.filter(...))`), che crea
    un **nuovo array ad ogni chiamata**. Con `useSyncExternalStore` (React 18, sotto Zustand) un selettore
    che non ritorna un riferimento stabile fa scattare un loop di re-render infinito — era l'**unico punto
    di tutto il codice** con questo pattern (ogni altro schermo usa `.find()`, stabile per riferimento).
    Fix: filtro spostato fuori dal selettore, in un `useMemo` sul riferimento stabile `s.db.leghe`.
    Verificato: 286/286 test, typecheck + `expo export` verdi. Spedito via OTA.
    **Lezione per il processo**: prova viva che l'`ErrorBoundary`+crash-logger fatti pochi commit prima
    hanno funzionato — un errore che sembrava un crash nativo "muto" si è rivelato un bug JS diagnosticabile.
  - 🔴 **APERTO — minore, UX**: nella **serata multi-gioco** non c'è un tasto "chiudi serata" (si
    chiudono i singoli giochi dentro, la serata resta un contenitore) e manca un modo per "riprendere"
    una serata in corso dalla home — dà l'impressione che si chiuda tornando indietro (in realtà i
    dati restano, si trovano in Storico → Serate). Da progettare bene (ricerca UX), non una pezza.
  - ✅ **Fix Leghe CONFERMATO sul telefono** (2026-07-13): Leghe funziona, e anche il **poker va**
    (si apre in schermata nuova e il flusso gira).
  - ✅ **GIRO DI TEST CHIUSO (2026-07-13, decisione utente)**: basta così per ora; il prossimo
    giro si fa **con gli amici sul cloud** (post R7). Feedback registrati in `IDEE.md`:
    grafica poker poco chiara (→ R12) · **safe area sopra+sotto su tutte le schermate**
    (pulsanti coperti dalla nav bar Android → deciso: si fa col restyle R12, la disposizione
    cambia comunque) · giocatori per-lega poco evidenti in UI (non era un bug) · ⭐ requisito
    R8/R9: claim guest + richiesta dati devono coprire guest **in lega E nel Personale altrui**.
- **Prossimo concreto**: ~~crash-su-Leghe~~ ✅ · ~~giro di test~~ ✅ · ~~R7.2d-1~~ ✅
  (`SYNC_INVARIANTI.md`) · ~~R7.2d-2 core~~ ✅ **FATTO** (2026-07-13, Opus): `merge.ts` a **contatore**
  (`syncRev`/`syncedRev`, non più orologi — S5) + **delete-wins** nel merge (I4) + helper
  `nuovoSync`/`touchSync` + **property-based test** (298 test core). ⏭️ **Cablaggio store spostato a
  R7.4** (deciso con l'utente: non testabile senza push, si fa insieme). Spiegazione didattica
  gitignorata in **`_studio/01-dirty-tracking-contatore-vs-orologio.md`**. **ORA: R7.2d-3** (uid sui
  movimenti del ledger, S2 — Sonnet high) → d4 (mappa id↔uid, Opus xhigh) → **d5 = gate su DB reale**
  (DS6 accettata).
- **H-block pre-pubblicazione**: resend+password dimenticata (B25) · crash reporting · SMTP · privacy/ToS · pulizia dep + B26/B27/B28.
- **ULTIMISSIMI (volontà utente)**: R11 feature nuove · R12 restyle grande · RP pubblicazione + **GRANDE TEST** (device/E2E, scelta di studio — include R6.V).

### 🔁 LINEA DI PRODUZIONE riordinata (2026-07-01 (d), post RED TEAM) — ⚠️ superata dalla v3 sopra

> Riordino dopo la revisione senior (`_processo/REVISIONE-ESTERNA.md`, finding F1–F14).
> Principio: **de-risk PRIMA di aggiungere superficie.** Questo ordine **supera** l'elenco qui sopra
> per la sequenza; i contenuti dei blocchi restano.
>
> ⚠️ **AGGIORNAMENTO 2026-07-01 (e)** (dopo red team ESTERNO + scelta utente): l'app prosegue con
> **costruzione COMPLETA + un unico test su device ALLA FINE** (SCELTA DI STUDIO, non de-risk) → quindi
> **niente "device/CI prima"** e **R7/R8/R9 NON congelati** (si va avanti). Restano/fatti: **R6 hardening**
> (profili privati + trigger footgun, migration `…140000`), **web congelata RIMOSSA** (tag
> `archive/web-frozen`), **soldi float+r100 documentati**, **feature+restyle ultimissimi**. Token/tempo
> in `_processo/METRICHE.md`. Dettaglio + confronto-con-All-for-Music: `DECISIONI.md` 2026-07-01 (e).

- **TRACK 0 — Infrastruttura (subito)**: **I1** CI (Actions: test+build+tsc su push/PR) · **I2** CI migrations (`supabase db push`).
- **R6 — chiusura vera (prima del merge)**: **R6.6** recupero password (deep link) · **R6.7** hardening (errore trigger preciso, ramo demo, enumerazione) · **R6.8** test dello store · **R6.V** verifica su **device reale** (signup + unicità + ritorno-mail) = **GATE** → poi merge `rn-r6-identita`→`main`.
- **Backend**: **R7** sync cross-device (+ partition per account, F8) · **R8** ruoli/condivisione (+ enumerazione, F7) · **R9** realtime/social.
- **Pre-pubblicazione (hardening)**: **H1** crash reporting · **H2** SMTP custom · **H3** privacy+ToS · **H4** pulizia debito (dep Expo R0.3, E2E, editor livelli, foto lega).
- **Traguardo**: **R12** restyle · **RP** pubblicazione (EAS Build → store → OTA). (R11 feature nuove = slot in IDEE.)

**Avanzamento (2026-07-01)**:
- ✅ **Quick wins** mergiati in `main`: toast globale mobile + date-picker nativo (`DateField`).
- ✅ **R3 (poker integrato)** mergiato in `main` (`1cfacaf` sul branch): poker non è più un'app-nell'app —
  classifica/storico/giocatori nelle **viste condivise** (standard BG Stats), sessione live = schermata
  **immersiva dedicata** (standard poker-timer). Rosa Personale su rotta condivisa `/giocatori/[legaId]`.
  ⚙️ **Metodo aggiornato** (`CLAUDE.md`): ricerca su app note/solide **prima** di feature+spec (non solo grafica).
- ✅ **R4 (serata multi-gioco)** mergiato in `main`: apri una serata coi partecipanti, giochi più giochi
  (ognuno una `SessioneGioco` legata da `serataId`), **classifica serata** (vittoria +1 a ogni vincitore,
  patta +0.5, totale assoluto max = vincitore; test-first, 148 core) con hub a schermata piena, "Aggiungi
  gioco" in basso (thumb zone), sezione "Serate" nello Storico. Poker resta serata a parte.
- ✅ **Audit ergonomico** (`_processo/ERGONOMIA_AUDIT.md`): applicato **E1** (Nuova lega in basso); FAB/swipe/
  stepper/GameBar → **backlog restyle** (IDEE, R-erg1..4).
- ✅ **R5 (tavolo live)** mergiato in `main`: poker cash come **tavolo con le sedie** (posti, cassa/piatto, menù
  rapido sul giocatore con **ricarica** e **cash-out** via `esceDalTavolo`→`saldoUscita`, **timer per-persona**
  che scorre). Soldi d'uscita + timer = funzioni pure **test-first** (163 core). Torneo: timer per-persona.
  Vista torneo sul tavolo + **seating grafico "bello"** → rimandati al restyle. `_processo/MAPPA_CODICE.md` tiene feature→dove.
- ✅ Quick-win in `main`: **condividi resoconto "chi paga chi"** (Share nativo, dai Debiti) + **fix sblocco GameBar**
  (il "gioco fisso" ora si può sbloccare). Feature native del telefono → backlog **R10** (`IDEE.md`); **i18n** (EN, forse
  FR/ES) → **R12** restyle.
- ✅ **R6 — Identità reale COSTRUITA e MERGIATA** (`849acb5`, 2026-07-03; **231 core + 1 state test**,
  mobile export/tsc verdi; branch `rn-r6-identita` cancellato). Chiuso il **blocco BACKEND** R6+R7.1.
  Fatto: **profiles + username
  UNIVOCO** (unique index `lower(username)` + trigger `handle_new_user` + RPC `username_available` +
  backfill), **two-tier** handle/display name (registrazione + Profilo `@handle`), **deep link conferma
  email (R2.4 chiuso)** senza nuove dep (`parseAuthRedirect` puro + `useDeepLinkAuth`), **"sei tu"
  ancorato all'account** (`accountId` + `èSeiTuRecord`; **rimosso** il kludge `èSeiTu` per nome).
  Vedi `DECISIONI.md` 2026-07-01 (c).
  - ✅ **Migration R6 APPLICATE** (utente, dashboard SQL Editor) + **Redirect URLs = `whostheboss://**`
    configurato**. Guida in `supabase/README.md`.
  - ✅ **R7.1 — Schema relazionale sync SCRITTO E APPLICATO** (13 tabelle, 3 migration `20260701150xxx`,
    tutte e **5 le migration R6+R7 sono live** su Postgres senza errori): `leghe/giocatori(perno)/
    giochi_lega` + `partite_poker/partita_poker_giocatori/poker_movimenti(append-only)/settlements` +
    `serate/sessioni_gioco/partite_gioco`+ponti. RLS owner-only, `updated_at` server-side. Design
    completo in `R7_SCHEMA.md`. Vedi `DECISIONI.md` 2026-07-01 (f)+(g)+(h).
  - ✅ **AUDIT multi-agente fatto** (67 agenti, 45 finding): registro **`AUDIT_R6_R7.md`**. **Bonifica
    R6-B COMPLETATA** (B1→B6 tutti ✅, vedi LINEA v3 sopra) — **231 test core**. Unico residuo: applicare
    la migration SQL di B5 in dashboard (scritta, non urgente).
  - ✅ **MERGIATA in `main`** (`849acb5`, 2026-07-03, `--no-ff`; branch `rn-r6-identita` cancellato
    local+remoto). 41 commit: identità R6.1-6.5, red team interno+esterno, schema R7.1 (13 tabelle),
    audit multi-agente, bonifica B1-B6. **231 core + 1 state test**, expo export + typecheck verdi.
- ✅ **R7.2 COMPLETO** (2026-07-11): a (uid/syncUpdatedAt) + b (storage per-account) + c (mapping
  locale↔cloud tutte le 13 tabelle + merge LWW). **286 test core**. Vedi dettaglio sopra e
  `R7_SCHEMA.md` sez. G-M.
- **Prossimo**: **R7.3 — import one-shot** dal locale (backup-first, idempotente) — il primo uso
  reale dei mapping appena scritti.
  ✅ **APK fatto** (2026-07-11, anticipato rispetto al piano — l'utente voleva testare R7.2b su device
  reale invece che aspettare il pre-pubblicazione, vedi `DECISIONI.md`): account EAS creato, build
  `preview` pubblicata (profilo `.apk` diretto, non Play Store), installata sul telefono. **EAS Update
  configurato**: aggiornamenti JS/UI futuri con `eas update --channel preview`, niente nuova build finché
  non cambia qualcosa di nativo. `npx expo start` (Expo Go) è risultato **inaffidabile per questo
  progetto**: crashava per un bug reale poi risolto (`lib/supabase.ts` toccava `window` senza guardia nel
  pre-render SSR di Expo Router, mai emerso prima perché mai lanciato dal vivo), e anche dopo il fix Expo
  Go segnalava incompatibilità di versione SDK non risolvibile lato utente (Expo Go aggiornato all'ultima
  versione disponibile, stesso errore) — **la build EAS resta il modo affidabile di provare l'app dal vivo**.
  - ⏳ **Debito R0.3**: il template ha portato dep Expo non ancora usate (`@expo/ui`, `expo-glass-effect`,
    `expo-symbols`, `expo-image`, `expo-device`, `expo-web-browser`) e icone generiche Expo → sfoltire/brandizzare
    in R1/RP. `reactCompiler` experiment lasciato ON (bundle ok).
  - ✅ **Risolto** (era "rimandato da R0.2 → R2/mobile"): storage e client Supabase per-app astratti —
    mobile ha il suo `lib/supabase.ts` (AsyncStorage) e `store/authSlice.ts` indipendenti; con `apps/web`
    rimossa il debito è chiuso definitivamente.
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
- ✅ **SQL Supabase — TUTTE e 6 le migration applicate** (confermato dall'utente 2026-07-11, ultima
  era `20260703100000_r6b5_hardening.sql`). Inventario numerato in `supabase/README.md`. Residuo
  minore non urgente: se un giorno si installa la Supabase CLI, va sanata la migration history con
  `supabase migration repair` (comandi pronti in `supabase/README.md`) — le prime 6 sono state
  applicate a mano da dashboard, non con la CLI.
- **Closed testing Play Store — DA SPIEGARE all'utente quando arriviamo a RP** (2026-07-03): il
  requisito Google "12 tester × 14 giorni per account personali nuovi" non gli è chiaro → prima di
  pianificare RP, spiegarlo bene (cos'è, perché esiste, come si incastra col collaudo tra amici) e
  decidere insieme. Non darlo per capito.
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
pnpm dev:mobile     # server dev Expo (apri in Expo Go)
pnpm run test       # tutti i test via Turbo (202 @whos-the-boss/core + state)
pnpm run typecheck  # tsc mobile (dopo un expo export, per i typed routes)
pnpm run lint       # ESLint via Turbo
pnpm run build      # build di tutti i pacchetti via Turbo
pnpm --filter @whos-the-boss/core test   # solo i test della logica condivisa
pnpm --filter @whos-the-boss/mobile exec expo export --platform android   # verifica che il bundle compili
```
(serve `pnpm` sul PATH: `npm i -g pnpm@9`. Turbo orchestra i pacchetti.)

## Repo
GitHub **pubblico**: `https://github.com/robertotommasogrossi7-bit/whos-the-boss`
(Su GitHub: **monorepo** `apps/mobile` + `packages/core` + `packages/state` + `supabase/` (schema-as-
code) + `_legacy/` (storia) + **`_processo/` pubblicato** (showcase del processo AI) + README + LICENSE.
`apps/web` rimossa, archiviata al tag `archive/web-frozen`. Default branch `main`.)
