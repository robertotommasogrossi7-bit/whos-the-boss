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
schede) → **M4** (classifiche: lega + globale persona-centrica). Ultimo merge `d032dca`.
Logica poker invariata, `vanillaCompatStorage` intatto.
**75/75 test verdi**, TSC + lint + build verdi. Solo branch `main` (+ i `claude/*` ambiente).

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
4.5 **Utente-giocatore ("sei tu")** — ⭐ **IMPORTANTE** (richiesta utente 2026-06-04): il nome
   di login diventa un **giocatore reale**, auto-inserito nel Personale e marcato **"sei tu"**
   (badge, es. bandierina rossa). **Personale**: sempre incluso, **non deselezionabile**. **Quando
   CREI una lega**: non deselezionabile *durante la creazione*, **dopo** sì; entri come **unico
   admin** (i poteri multi-livello sono la fase #7.5). **Lega/sessioni** in generale:
   deselezionabile (segnapunti). Popola da sola "La tua situazione". UI + store → **Sonnet**.
   Testabile anche col login demo (funzioni pure + browser con nome nuovo). Vedi `DECISIONI.md` 2026-06-04 (b).
4.6 **Rifinitura storico/classifiche** (richiesta utente 2026-06-04): manca il **filtro gioco
   nello Storico** di lega; il **poker** dev'essere visibile **inline** in Classifica/Storico
   filtrati per poker (oltre al redirect alla sottosezione, che piace). Sonnet. Vedi `DECISIONI.md` (d).
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

**Prossima azione concreta**: **Utente-giocatore ("sei tu")** (#4.5 — ⭐ importante): il nome
di login diventa un giocatore reale, auto-inserito + "sei tu" (badge), bloccato-incluso nel
Personale, membro non rimovibile nelle leghe che crei. Fase **Sonnet** (UI + store). Vedi
`DECISIONI.md` 2026-06-04 (b). **Poi** il blocco **poker-live** (#5 soldi d'uscita → #6 tavolo
live). Prompt #4.5 da scrivere quando dai il via.

## Debito tecnico noto (segnalato, da fare al momento opportuno)
- **`nuovoGiocoCustom` usa id `custom-${Date.now()}`** → collisione possibile (teorica).
  Irrobustire (contatore/uuid) **quando nasce la UI giochi custom → M5** (prima nessun chiamante).
- ~~`NuovaLega` non inizializza i campi multigioco~~ → **risolto in M3** (chiama `migrateLega`).
- ~~`utils/giochi.ts` senza test~~ → **risolto in R/M2** (`giochi.test.ts`).

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

## Comandi rapidi (in `poker-react/`)
```
npm run dev     # server dev, porta 5173
npm run lint    # ESLint
npm test        # Vitest (40 test)
npx tsc -b      # build TS
```

## Repo
GitHub privato: `https://github.com/robertotommasogrossi7-bit/poker-tracker`
(Su GitHub: solo app + `_legacy/` + README + LICENSE. I `.md` di processo sono locali.)
