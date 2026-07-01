# MAPPA CODICE — app RN (`apps/mobile`) — feature → dove sta

> Inventario per **non perdere pezzi** e **non duplicare** (metodo: «Mappa del codice»).
> Regola: prima di aggiungere una feature, **grep qui + nel codice**; se esiste, **riusa**.
> Aggiornare a ogni fase. La logica pura sta in **`@whos-the-boss/core`** (riusata da web+mobile),
> lo stato in **`@whos-the-boss/state`** (`createAppStore`). Web (`apps/web`) = riferimento congelato.
> Mappa del vecchio codice web: `POKER_MAP.md`.

## Rotte / schermate (`apps/mobile/src/app`)
- `_layout.tsx` — root: tema dinamico (giocoFiltro→themeForGame), **gate auth** (loader/Login/Stack), `GlobalToast`, boot (runMigrations+initAuth).
- `(tabs)/_layout.tsx` — bottom nav 4 voci: Home / Classifica / Storico / Leghe.
- `(tabs)/index.tsx` — **Home Personale**: topbar (brand+Giocatori+avatar), GameBar, **Nuova serata**, contenuto gioco (SchermataGioco / poker).
- `(tabs)/classifica.tsx` — classifica globale/Personale (GameBar + FiltroNome + ClassificaTable).
- `(tabs)/storico.tsx` — storico Personale (SerateLista + GameBar + StoricoLista).
- `(tabs)/leghe.tsx` — lista leghe + **Nuova lega** (footer docked, E1).
- `lega/[id].tsx` — sezione lega (segmented 4 schede: LegaHome/Classifica/Storico/Giocatori).
- `gioco/[legaId]/[giocoId].tsx` — sessione di un gioco non-poker (SchermataGioco).
- `poker/[legaId].tsx` — **sessione poker** immersiva (feltro, SerataFlow). Solo la serata; classifica/storico/giocatori = viste condivise.
- `serata/[legaId]/[serataId].tsx` — **hub serata multi-gioco** (R4): classifica serata + giochi + "Aggiungi gioco".
- `giocatori/[legaId].tsx` — rosa condivisa (LegaGiocatori) fuori dal poker.
- `nuova-lega.tsx` — form nuova lega (Crea in basso, E2).
- `profilo.tsx` — account: avatar, cambia password/email, logout.
- `debiti.tsx` — debiti aperti, salda singolo/tutti.

## Componenti condivisi
- **UI primitivi** (`components/ui`): Button, Card, Chip, Avatar, EmptyState, ListRow, Sheet, Toast, **DateField** (date-picker nativo). Barrel `index.ts`.
- **Icone** (`components/icons`): set SVG (~30, `ui.tsx`) + GameIcon (glifi gioco). No emoji/loghi.
- **GameBar** — selettore gioco persistente (Home/Classifica/Storico).
- **GlobalToast** — monta il Toast sullo stato store (toastMsg/toastVisible).
- **classifica/** FiltroNome, ClassificaTable · **storico/** StoricoLista · **lega/** LegaHome/Classifica/Storico/Giocatori, GiocoPills.
- **gioco/** SchermataGioco, SheetNuovaSessione, SheetEsitoPartita, PickChip.
- **serata/** (R4) SheetNuovaSerata, SerateLista · hub in `app/serata/...`.
- **auth/** LoginScreen, CredentialSheets.
- **poker/** SerataFlow (state machine) → SetupForm, ConfigCash/ConfigTorneo, LiveCash (sub-tab **Tavolo**/Giocatori/Conto), **TavoloView** (R5c: sedie+cassa+menù rapido/cash-out), SubGiocatoriCash, SubAttivi, MoneyInput, ImportoSheet, CassaView, ChiusuraCash, LiveTorneo (SubOrologio, SubGiocatoriTorneo, PrizeModal, SubPremi), ChiusuraTorneo.

## Logica in core (riusare, NON duplicare)
- **Soldi**: `calcolaSettlement` (cash), `calcolaSettlementTorneo`, `computeLive` (conto live), **`saldoUscita`/`nettoUscita`/`mancante`** (R5, uscita).
- **Tavolo/seating**: `tavoli.ts` (`assegnaPostoIngresso`, `riequilibraTavoli`, `tavoliNecessari`), `torneo.ts` (`assegnaPostiCasuali`).
- **Timer**: `tempoGiocoMs` (R5, per-persona) · `useTimer` hook (orologio torneo, in mobile).
- **Sessioni gioco**: `sessioneGioco.ts` (esitoSessione, vittoriePartecipanti), `serate.ts` (R4: classificaSerata, vincitoriSerata), `classifiche.ts`, `storico.ts` (vociStorico), `statsGiochi.ts`, `giochi.ts`, `format.ts`, `normalizzaNome`, `migrations.ts`, `personale.ts`, `tema.ts`.

## Azioni store (`packages/state`) — poker live
- **Cash**: toggleEntrato (assegna seat + avvia timer R5), setEntrata, setVersato, aggiungiRicarica/modifica/togglePagata, aggiornaFiches, addGiocatoreSessione, rimuoviGiocatoreSessione, **spostaGiocatore**/**riequilibraSeat** (seat), aggiungiEFaiEntrare, **esceDalTavolo** (R5: uscita/cash-out via `saldoUscita`+fiches_finali, congela timer).
- **Torneo**: avviaTorneo, pausa/riprendi, avanzaLivello, stop, torneoAddRebuy/AddOn/Revive/Elimina, confirmaPremio.
- **Serata poker**: avviaSessione, apriSerataAttiva, annullaSessione, aggiornaSetupSerata, confermaChiusura, settlement.
- **Multigioco**: creaSessioneGioco (+serataId R4), avvia/chiudi/eliminaSessioneGioco, **creaSerata/eliminaSerata** (R4).
- **Debiti**: toggleSettlementPaid, saldaDebito, saldaTuttiDi.

## Feature grandi — stato
- Auth (R2) ✅ · Poker integrato (R3) ✅ · Serata multi-gioco (R4) ✅ · **Tavolo live (R5) IN CORSO**.
- R5a ✅ core (saldoUscita/tempoGiocoMs, test-first). R5b ✅ store (esceDalTavolo + timer cash in toggleEntrato).
  R5c ✅ UI TavoloView (sedie + cassa + menù rapido cash-out; timer statico sul posto). Sub-tab Tavolo default cash.
  Nota: il **seating cash c'era già** (toggleEntrato→assegnaPostoIngresso) — non duplicato.
- **R5 resta**: **R5d** timer live che scorre (tick) + timer torneo (avviaTorneo/torneoElimina) + unificazione vista torneo sul tavolo.
- **Backlog restyle** (R-erg): `_processo/ERGONOMIA_AUDIT.md` + IDEE. Seating grafico "bello" → restyle.
