# DECISIONI — log delle scelte prese

> Una riga per decisione, con la data. Serve a non ri-discutere le stesse cose in
> chat diverse. Le chat base leggono questo + CONTESTO.

## 2026-05-31 — pianificazione Card Tracker (chat base, passaggio di testimone)

- **Identità**: l'app diventa **"Card Tracker"** (multi-gioco). Nome di lavoro,
  confermabile in fase di rebranding (M5). Il poker resta dentro, com'è.
- **Grafica**: tema **scuro** + **accento dinamico per gioco** (cambia e resta in
  alto cambiando schermata). **Eccezione: poker = feltro verde** (unico gioco con
  tema "fisico"). → dettaglio in `DESIGN_SPEC.md`.
- **Icone**: **niente emoji** (scelta utente). Icone **SVG originali** colorate
  dall'accento. Obiettivo qualità "da Play Store".
- **Loghi dei giochi di marca** (Magic/Yu-Gi-Oh!/Pokémon/Uno): **NON** nel repo
  (copyright). Si usa il **nome** come etichetta (lecito) + icona originale +
  colore. L'utente può caricare una foto in locale (non versata).
- **Modalità Personale (guest)**: l'app si apre su una **Home "Segna partita"**
  usabile **senza creare una lega**, con giocatori "guest" (nomi liberi,
  aggiungibili/modificabili al volo, niente account per sessione). Modellata come
  una **Lega speciale "Personale"** (riusa tutta la macchina sessioni/partite).
- **Partita generica**: dentro una sessione si può segnare una partita indicando
  un **nome di gioco libero per quella partita** (giochi "sconosciuti"/una tantum)
  e **partecipanti per partita** (sottoinsieme), oltre a vincitori/perdenti.
- **Git/GitHub**: il repo va reso **professionale** → i documenti di processo
  (`*_SPEC.md`, `*_PROMPT.md`, `*_MAP.md`, CONTESTO, IDEE, DECISIONI…) vengono
  **tolti dal versionamento** (`git rm --cached`) e messi in `.gitignore`. Su
  GitHub restano solo **app + README + LICENSE** (+ `_legacy/` come storia).
  ⚠️ Conseguenza: i .md vivono **solo in locale** → sono la memoria del progetto,
  non perderli. (La storia git li contiene ancora nei commit vecchi; nessun
  rewrite di history: non necessario e rischioso.)

## 2026-05-31 (b) — uscita/soldi live + tavolo virtuale (sessione Opus)

> Dettaglio dell'incontro in cui si è completata la visione "uscita cash". È
> emerso che NON è una feature sola ma **quattro**: (1) logica soldi d'uscita,
> (2) tavolo virtuale come schermata viva, (3) timer per-persona, (4) naming
> "Sessioni" + GameBar. (1) → `USCITA_CASH_SPEC.md`; (2-3-4) → `TAVOLO_LIVE_SPEC.md`.

- **Uscita = 1 tap.** Mentre si gioca (telefono in mano), far uscire qualcuno è
  **un solo tap** ("è uscito"). Tutto il dettaglio soldi è **opzionale** e
  **rimandabile**: i tap in più si fanno **solo se uno caccia davvero**.
- **Default = DEBITO**, con pulsante **"pagato ora"**. Ogni movimento di denaro è
  un debito (sistema `debiti` esistente); lo si può segnare pagato subito.
- **Provvisorio + review.** I numeri dell'uscita sono **congelati ma modificabili**
  nella **review di fine partita**, che **sostituisce** la chiusura "alla cieca".
  Controllo di quadratura `Σincassi = Σesborsi + cassa` (segnala, non blocca).
- **Formula UNICA cash+torneo**: `saldoUscita_P = valore_P − mancante_P`, con
  `mancante_P = max(0, dovuto_P − versato_P)` e `valore_P` = fiche all'uscita
  (cash) o premio posizione (torneo). `>0` incassa, `<0` versa. Copre da sola
  l'**auto-compensazione** (il vincitore che non ha versato non si "paga da solo";
  il già-versato gli rientra per primo). Esempi-test in `USCITA_CASH_SPEC §6`.
- **La cassa resta** ed è **visibile al centro del tavolo** (per i gruppi che
  cacciano subito). Tap al centro → "di chi sono i soldi"; tap su persona →
  operazioni rapide ("versati", "deve soldi a…") a **matrioska**.
- **Tavolo virtuale = schermata viva** per **cash e torneo** (oggi torneo ha
  sub-tab). Ingresso **casuale** + **spostamento libero** (già esistono, si
  estendono al cash). Molto del tavolo è **già in `main`** (`TavoloView.tsx` /
  `tavoli.ts`): **non rifarlo**, estenderlo.
- **Settlement live, non solo a fine serata**: i debiti si segnano **durante**; la
  chiusura diventa la review pre-compilata. La **math non si duplica**
  (`calcolaSettlement`/`calcolaSettlementTorneo`).
- **Timer per-persona**: si traccia **quanto tempo** uno gioca; chi **perde/esce**
  viene **tolto dal tavolo** e il tempo si congela. Funzione pura `tempoGiocoMs`
  testabile.
- **Naming "Sessioni"**: l'ingresso poker diventa **"Sessioni"** (Apri sessione /
  Sessioni in corso); dentro, **"Nuova partita"** = l'attuale cash/torneo. ⚠️ Si
  rinominano **solo le etichette UI**, NON il tipo `Sessione` in codice
  (retrocompat). Riconciliazione dati col multigioco → **M3**.
- **GameBar disattivabile/fissabile**: dalle impostazioni si può **nascondere** la
  barra giochi o **fissare un solo gioco** (app/lega mono-gioco). Ruoli admin veri
  → post-backend.
- **Ordine di esecuzione DEFINITIVO**: `M1 → R/M2 → M3 → M4 → poker-live (soldi
  d'uscita `saldoUscita` → tavolo live) → M5`. **Sequenziale**, una chat di fase
  alla volta (l'utente preferisce non gestire chat in parallelo). M1 verificato
  non-partito e indipendente: apre la fila. Roadmap dettagliata in `CONTESTO.md`.
- **Nodo aperto registrato (per M3)**: naming "Sessioni" poker — contenitore-serata
  vs solo-rename etichette. Non impatta M1/M2. Vedi `MULTIGIOCO_SPEC §4`.

## 2026-06-01 — review coerenza pre-M1 (chat base)

- **`migrateLega`**: la migrazione lega multigioco è una **funzione pura nuova** in
  `migrations.ts`, **non agganciata** allo store in M1. La aggancia **M2** (la fase
  che crea la lega "Personale" e legge `giochi/sessioniGioco/_sgid/personale`). M1
  resta "solo dati + funzioni pure, niente store". Prompt M1 aggiornato di conseguenza.
- **Igiene doc** (per non sviare le chat future): `MULTIGIOCO_SPEC §11` riallineato
  alla roadmap di `CONTESTO` (aggiunte le fasi *soldi d'uscita* e *tavolo live*, R/M2
  unite); `MULTIGIOCO_SPEC §4` corretto → il **rename UI "Sessioni"** è della fase
  **tavolo-live (#6)**, non di M2 (M2 sposta il poker sotto `/poker` senza rinominare);
  `IDEE.md` marcato **storico/superato** (modello reale = `MULTIGIOCO_SPEC §4`, non la
  bozza `PartitaSemplice`).
- **Note fissate nel prompt M1**: poker nel catalogo solo per tema (fuori da
  `calcolaStatsGioco`); chiavi `icona` kebab-case; `accentDaNome`→hex; `SessioneGioco.stato`
  = `'pre'|'attiva'|'chiusa'` (≠ poker `'attivo'/'concluso'`).
- **`IDEE.md` archiviato**: spostato da `_processo/` a `_processo/archivio/` perché
  storico/superato (modello reale = `MULTIGIOCO_SPEC §4`; il "tavolo interattivo locale"
  che descriveva è **già in `main`**, T1-T3). Tenuto come reference per la **fase 8
  (post-backend)**. Riferimenti aggiornati a `archivio/IDEE.md` in `CONTESTO` e
  `MULTIGIOCO_SPEC §11`. Attivi in `_processo/`: 9; archivio: 10.

## 2026-06-01 (b) — precisazioni poker: classifica e sessione (utente)

- **Classifica globale del poker = per NETTO**: il poker si ordina per **netto totale**
  (€ vinti/persi), dal **più vincente al più perdente**; corona = maggior vincitore
  netto. **NON** per numero di partite vinte né per %. È già così nel codice
  (`TabClassifica` ordina per `totaleNetto`). Corretta la nota in `MULTIGIOCO_SPEC §8`
  (la versione precedente "vittorie assolute / chi ha vinto di più" era **sbagliata**).
- **Poker = sessione-contenitore (lean per M3)**: chiarito che "il poker non usa
  `SessioneGioco`" vale solo a livello di **tipo** (il poker ha il suo `Sessione` con
  soldi/settlement). Concettualmente **anche il poker apre una sessione** e dentro
  gioca **partite** una alla volta. L'utente propende per l'opzione **(a) contenitore**
  del nodo §4 → a M3 si dettaglia il contenitore-serata del poker (non il solo-rename),
  con piano migrazione dati. **M1/M2 invariati** (non dipendono da questa scelta).

## 2026-06-02 — R/M2 mergiata + IA lega rivista (chat base review)

- **R/M2 in `main`** (merge `df738b9`, 48 test, build verde). Review + verifica browser OK:
  tema scuro/feltro, GameBar, Personale auto-creata, migrazione leghe esistenti idempotente,
  poker funzionante sotto `/leghe/:id/poker`, `vanillaCompatStorage` e logica poker intatti.
- **IA lega rivista (DECISIONE)**: entrare in una lega NON è più un "Hub" a schermata singola
  (com'era in `MULTIGIOCO_SPEC §5` e come l'ha costruito R/M2), ma apre una **pagina dedicata
  con nav propria a 4 schede: Home / Classifica / Storico / Giocatori** (simmetrica alla shell
  globale, con "Giocatori" al posto di "Leghe"). "Home" di lega = scelta gioco + segna partita;
  "Giocatori" = rubrica. **Da implementare con M3** (R/M2 resta mergiata com'è). `MULTIGIOCO_SPEC
  §5/§10` aggiornati. Da chiarire in M4: rapporto tra Classifica/Storico di lega e quelle globali
  filtrabili per ambito.
- **Todo M3**: `NuovaLega` deve inizializzare i campi multigioco alla creazione (oggi restano
  undefined fino al reload; non crasha ma è meglio sistemarlo).
- **Home globale non crea partite = corretto**: è il guscio M3 ("segna partita"), non un difetto.

## 2026-06-03 — M3 mergiata (chat base review)

- **M3 in `main`** (merge `df13abd`, 57 test, build verde). Review + verifica browser OK:
  flusso segna-partita Personale completo (crea→avvia→partita→esito→chiudi sessione, dati
  corretti), **sezione lega a 4 schede** (Home/Classifica/Storico/Giocatori) come deciso il
  2026-06-02, schermata gioco in lega, **poker intatto** sotto `/leghe/:id/poker`, zero errori
  console. Azioni store coerenti con `calcolaStatsGioco` (test di coerenza dedicato).
  `NuovaLega` ora inizializza i campi multigioco.
- **Prossima**: M4 (classifiche) — riempie le schede Classifica (oggi gusci) leggendo
  `sessioniGioco` chiuse via `calcolaStatsGioco`.

## 2026-06-04 — design classifiche (M4)

- **Filtrabili dentro E fuori le leghe.**
- **Dentro lega**: standings dei giocatori della lega per gioco (% vinte/giocate, sessioni
  vinte, corona al leader).
- **Fuori (globale), centrata sulla persona** (default = te):
  - **PRIMA RIGA = totale aggregato** della persona per il gioco su **Personale + TUTTE le
    leghe** ("quanto sei bravo in quel gioco").
  - **breakdown per contesto** (Personale + ogni lega) **a scomparsa/collassabile** — per non
    sporcare con molte leghe.
  - + **classifica delle partite Personale** ("senza lega": tu + guest).
  - **identità cross-lega per NOME** (best-effort pre-backend, §8) con **avviso** UI.
- **Regola di calcolo**: aggregare **sommando i conteggi e RICALCOLANDO le %** sui totali —
  **mai mediare le percentuali**. Logica in funzioni pure + test (`utils/classifiche.ts`).
- Risolve il nodo "lega vs globale" lasciato aperto il 2026-06-02. Fase **M4 = Sonnet**.
  Prompt: `MULTIGIOCO_M4_PROMPT.md`.

## 2026-06-04 — M4 mergiata (chat base review)

- **M4 in `main`** (merge `d032dca`, 75 test, build verde). Review + verifica browser OK:
  classifica di lega (standings per gioco, corona, no-data gestito), classifica globale
  centrata sulla persona ("La tua situazione": prima riga = totale aggregato su Personale +
  tutte le leghe; breakdown per contesto a scomparsa; classifica Personale; avviso identità),
  filtro persona (digitabile) + gioco. % **ricalcolata** sui totali (test espliciti). Poker intatto.
- **Spina multigioco COMPLETA** (M1→M4). Prossimo blocco: **poker-live** (#5 soldi d'uscita → #6 tavolo live).
- Nota UX (pre-backend, non bloccante): la persona della classifica globale **default = nome
  login**; se non combacia con un giocatore, "La tua situazione" è vuota (l'empty-state guida a
  digitare il nome). Risolto dall'identità reale col backend; eventuale scorciatoia: setting "io sono <nome>".

## 2026-06-04 (b) — feature "sei tu" (l'utente è sempre giocatore) — ⭐ IMPORTANTE

> Richiesta utente: rende vera la promessa "vedi le TUE prestazioni". Oggi login e giocatori
> sono separati (il Personale parte vuoto, il nome login non è un giocatore): **gap da colmare**.

- **Login come "X" ⇒ "X" è un giocatore reale**: auto-inserito nella lista giocatori del
  **Personale**, marcato **"sei tu"** (flag sul record, robusto a nomi uguali).
- **Marcatore visivo "sei tu"**: badge — **bandierina rossa** o qualcosa di più curato (DESIGN_SPEC).
- **Selezione partecipanti** (sessioni/partite):
  - **Personale** → sempre incluso, **NON deselezionabile** (lì giochi sempre).
  - **Lega** → **deselezionabile** (puoi fare solo da segnapunti).
  - **Quando CREI una lega**: sei incluso e **non deselezionabile DURANTE la creazione** (non puoi
    crearla senza esserci); **dopo** torni deselezionabile dalle sessioni. Entri come **unico admin**
    della lega; i poteri multi-livello (condivisione/revoca/espulsione) sono la decisione 2026-06-04 (c).
- **Effetto collaterale positivo**: la Classifica globale "La tua situazione" si **popola da sola**
  (persona di default = tu, ora sei un giocatore reale) → risolve la nota UX del 2026-06-04.
- **Testabile anche con login demo**: logica (auto-add + lock) in **funzioni pure + unit test**
  (senza login); browser = login con nome nuovo "X" → X compare "sei tu", bloccato in Personale.
  Il demo che "crea un nome ogni volta" non è un problema (ogni prova = un "tu" pulito).
- **Priorità ALTA**: si fa **prima del poker-live** (completa la spina multigioco). Fase = **Sonnet**
  (UI + store, niente soldi).

## 2026-06-04 (c) — ruoli e poteri nelle leghe (base locale, pre-backend) — ⭐

- Dentro una lega: **admin a più livelli di potere**. Chi crea la lega è l'**unico admin** col
  **potere massimo**.
- L'admin può **nominare admin** altre persone e **condividere anche il potere massimo**.
- Chi ha il potere massimo può **revocarlo ad altri (anche a te) ed espellere dal gruppo** → è a
  tua **discrezione** dare il potere assoluto solo a persone fidate.
- **Versione locale** (single-device) come **base**; si **amplia col backend** (identità/permessi
  reali cross-device, #8 — `archivio/IDEE.md` prevedeva già ruoli per-gioco post-backend).
- **Timing**: **prima del backend**, momento preciso flessibile. Roadmap **#7.5**. Collegata a #4.5
  ("sei tu / entri come unico admin").

## 2026-06-04 (d) — rifinitura storico/classifiche (poker visibile nei filtri)

- Dentro le leghe **manca il filtro gioco nello Storico** → aggiungerlo (come in Classifica).
- Selezionando **poker** nei filtri Classifica/Storico: il **redirect** alla sottosezione poker
  **piace** (tenerlo come accesso rapido), MA il poker deve essere anche **visibile inline** in
  Classifica/Storico filtrati per poker — non costringere a entrare nella sottosezione. Oggi
  `resolveGiocoLega/resolveGiocoGlobale` escludono il poker (ritornano null): rivedere per
  mostrarne i dati inline. Piccola rifinitura M4/storico, **Sonnet**. Roadmap **#4.6**.

## 2026-06-04 (e) — unificazione Classifica/Storico + normalizzazione nomi (refactor + feature)

> Osservazione utente: "ogni cosa sta da 4 parti" (Personale, lega, poker-personale, poker-lega).
> Classifica e Storico vanno resi COMPONENTI CONDIVISI e coerenti: una modifica deve valere ovunque.

- **Componenti CONDIVISI** per **Classifica** e **Storico**, usati in TUTTI i contesti (Personale,
  lega, poker-personale, poker-lega). Stesse **KPI**, stesso look, stesso comportamento.
- **Filtro di ricerca per NOME ovunque** (oggi manca in lega / poker): in ogni classifica e storico.
- **Normalizzazione del nome definita UNA volta e condivisa**: digitando "giuliA" trovi "Giulia"
  (case-insensitive + accenti + spazi). Cambiandola in un punto vale in tutti (è un'unica funzione).
- **Classifica personale** = "sei tu" + **tutte le leghe**: mostra le leghe dove **ci sei** e quelle
  dove **sei stato** (con segnalazione "non ci sei più"). Dipende da #4.5.
- **Tutto facilmente filtrabile.**
- È in parte un **refactor DRY** (eliminare le 4 duplicazioni) + feature. Fase **Sonnet** (UI + utils condivise).
- **Ordine**: #4.5 (sei tu) → #4.6 (storico filtro + poker inline) → #4.7 (questa unificazione).
- Nota: oggi la classifica combinata Personale+leghe NON si "vede" perché l'utente non è un
  giocatore (→ #4.5 la popola con "La tua situazione").

## 2026-06-04 (f) — handoff: audit nuova chat base (struttura 4.6/4.7, nickname, beta "sei tu")

> La nuova chat base ha ri-letto il codice prima di partire. Decisioni prese con l'utente.

- **Identità = id stabile per-lega** (`NomeGiocatore {id,nome}`, `_nid`): gameplay/storico/classifica
  riferiscono per **id**, il `nome` è solo etichetta risolta a display. Ne discende:
  - **Soprannome/nickname (per-lega) = si fa ORA**: editare `nome` è **cosmetico**, l'**id non cambia**,
    si propaga da solo. Serve azione store `rinominaGiocatore` + campo editabile in Giocatori
    (`TabPartecipanti`, condiviso lega+poker). Scopo: **comodità di filtro/disambiguazione**
    ("Giulio X / Giulio Y"). **Framing UI = "soprannome"**, non "rinomina identità". → collocato in **#4.7**.
  - **Il TUO nome ("sei tu") NON è un nickname libero**: è **account-level**, si cambia nelle
    **impostazioni account → backend (#8)**; pre-backend segue lo username di login.
  - **Identità cross-lega/cross-device** (stessa persona, robusta a rename) = **backend (#8)**.
    Pre-backend = match per **nome normalizzato** (best-effort), reso tollerante dalla normalizzazione condivisa.
- **#4.6 = SOLO layer-dati**: utils testabili che espongono il **poker in un modello-riga unificato**
  (col **netto €**) + la **logica filtri** (gioco/nome), **senza toccare la UI vecchia**. **#4.7** ci
  costruisce sopra i **componenti condivisi** Classifica/Storico. Evita di ritoccare-e-poi-riscrivere
  i 3+ componenti attuali. Test-first, fasi piccole. (Rimpiazza il vecchio scope UI di (d).)
- **Classifica condivisa = parametrica sul tipo**: poker = **netto + %**, altri = **%/vittorie**.
  "Stesse KPI" vale a parità di tipo.
- **Filtro nome (semantica confermata)**: in **classifica** non nasconde — KPI + **match in cima**
  (resto in ordine normale); in **storico** = **filtro secco** (via le partite senza quel nome). Identico ovunque.
- **`normalizzaNome` condivisa nasce in #4.5** (primo a matchare: username→record Personale).
  Definita **una volta** in utils, riusata da #4.7 ovunque (no duplicazione).
- **#4.5 e la beta** (login accetta qualunque username; `utente` in **sessionStorage**, effimero):
  "sei tu" è **CALCOLATO** da `normalizzaNome(username)` (niente flag stored → niente da corrompere;
  i nomi sono già unici per-lega). Auto-add del tuo record a Personale **al login** (aggancia se il
  nome esiste, sennò crea). Ogni login demo con nome diverso = **un "tu" pulito** (accettato, vedi (b)).
  Locks: Personale **sempre incluso/non deselezionabile**; in **creazione lega** incluso e **bloccato
  durante la creazione** (poi deselezionabile), entri come **unico admin** → marcatore `Lega.adminIds:[tuo id]`
  (nessun potere/azione: solo dato).
- **#4.5 ↔ #7.5 separati**: #4.5 pianta **solo il marcatore** creatore=admin. Poteri
  (nomina/revoca/espulsione) = **#7.5** (che definirà il modello sopra `adminIds`).

## 2026-06-04 (g) — #4.5 "sei tu" mergiata (chat base review)

- **#4.5 in `main`** (merge `6515bd5`, **95 test**, tsc+lint+build verdi). Review chat base OK (codice
  letto per intero, green check pre e post-merge, niente merge alla cieca).
- Implementato come da prompt: `normalizzaNome`/`èSeiTu` (util condivisa, riusata da #4.7),
  `assicuraGiocatorePersonale`/`idBloccatiInclusi` (puri, con test), auto-add "sei tu" a login/register,
  lock partecipazione (Personale: poker `SetupForm` + non-poker `SheetNuovaSessione`/`SheetEsitoPartita`/
  `SchermataGioco`), blocco auto-eliminazione, `NuovaLega` creatore pre-incluso+lock+`adminIds`, badge
  (CSS `.badge-sei-tu`, **niente inline**).
- **"sei tu" CALCOLATO** (no flag salvato) come da (f) → robusto alla beta (login demo = un "tu" pulito).
- Plus di review: idempotenza **per-riferimento** in `assicuraGiocatorePersonale` (no save inutili);
  lock di creazione lega ottenuto renderizzando il creatore **fuori** dalla lista editabile (non rimovibile);
  `NuovaLega` ha adottato `normalizzaNome` per il dedup. Poker/settlement/`vanillaCompatStorage` intatti.
- Prompt archiviato in `archivio/MULTIGIOCO_4_5_SEI_TU_PROMPT.md`.
- **Prossima**: **#4.6** (layer-dati: poker nel modello-riga unificato + logica filtri gioco/nome).

## 2026-06-04 (h) — #4.6 "layer-dati" mergiata (chat base review)

- **#4.6 in `main`** (merge `3598a2e`, **138 test**, tsc+lint+build verdi). Review chat base OK
  (lettura integrale + green check pre/post-merge). **Solo `utils/` toccati** (zero componenti), come da contratto.
- Aggiunti (puri, testati): modello-riga unificato `RigaClassificaU`/`KpiClassifica`/`ClassificaU`
  (discriminante **punti**=%/vittorie | **soldi**=netto); `classificaPoker` (estratta da `TabClassifica`,
  ordina per netto), `classificaGiocoU`, `classificaUnificata` (dispatcher → **poker inline** di lega),
  `classificaPokerCrossContesto` (poker globale per nome); `utils/storico.ts` con `VoceStorico` +
  `vociStorico` (poker `Partita` + giochi `SessioneGioco` mescolati per data; `giocoId` assente = tutto);
  filtri nome puri `ordinaMatchInCima` (classifica: match-in-cima) + `filtraStoricoPerNome` (storico: secco).
- Tutto riusa `normalizzaNome` (#4.5) e `classificaGioco` (no duplicazione del calcolo).
- **Follow-up per #4.7** (segnalato in review): allineare il **pre-esistente** `statsPersonaCrossContesto`
  a `normalizzaNome` (oggi `.toLowerCase()`, niente accenti) — rientra nella "normalizzazione ovunque".
- UI vecchia invariata: il "si vede" arriva col #4.7 (monta i componenti condivisi su questi dati).
- Prompt archiviato in `archivio/MULTIGIOCO_4_6_LAYER_DATI_PROMPT.md`.
- **Prossima**: **#4.7** (componenti condivisi + nickname). ⚠️ Grande → valutare **split** (4.7a/b/c) con l'utente.

## 2026-06-04 (i) — #4.7 split in sub-fasi (deciso con l'utente)

- **#4.7 è grande e UI-rischiosa** (rimpiazza ~7 componenti classifica+storico su 4 contesti
  Personale/lega/poker-pers/poker-lega, + filtro nome ovunque + nickname). **Split** in 3 sub-fasi
  Sonnet, una alla volta (prompt → fase → review → merge `--no-ff`):
  - **4.7a — Classifica condivisa**: UN componente tabella parametrico (KPI **soldi**=poker netto+% |
    **punti**=giochi %+sess), filtro nome (`ordinaMatchInCima`), **poker inline** in LegaClassifica +
    ClassificaShell ("La tua situazione" poker via `classificaPokerCrossContesto`; il redirect alla
    schermata poker dedicata **resta** come accesso rapido, (d)). Rimpiazza il rendering di
    TabClassifica/LegaClassifica/ClassificaShell col condiviso.
  - **4.7b — Storico condiviso**: UN componente su `vociStorico`, filtro gioco (poker inline) + filtro
    nome **secco** (`filtraStoricoPerNome`). Rimpiazza TabStorico/LegaStorico/StoricoShell/StoricoSessioni.
  - **4.7c — Nickname + normalizzazione**: `rinominaGiocatore` + campo editabile in `TabPartecipanti`
    (edita `nome`, **id stabile**, cosmetico per il filtro); `normalizzaNome` **ovunque** (allinea
    `statsPersonaCrossContesto` e ogni `.toLowerCase()` residuo). Dipende da #4.5.
- **"ci sei / sei stato"** (classifica personale, (e)): **best-effort/deferito**. Pre-backend è quasi
  irraggiungibile (auto-rimozione dal Personale e rimozione di giocatori con partite sono **bloccate**
  → chi ha storico è sempre membro). 4.7a mostra i contesti dove **ci sei**; il "non ci sei più" diventa
  reale col **backend (#8)**. Niente over-engineering ora.

## 2026-06-04 (j) — #4.7a "classifica condivisa" mergiata (chat base review)

- **#4.7a in `main`** (merge `8da1854`, 138 test, tsc+lint verdi). Review chat base OK (diff letto per
  intero + green check pre/post-merge; tutti i token CSS verificati). Fase UI: verifica a browser dei 3
  contesti svolta dalla chat di fase.
- Nuovi `components/classifica/ClassificaTable.tsx` (tabella **parametrica** soldi/punti; il `#` resta il
  **rank reale** anche col match-in-cima) + `FiltroNome.tsx` (box ricerca riusabile, evidenzia i match
  **senza** nasconderli). `TabClassifica`/`LegaClassifica`/`ClassificaShell` rifatti sul condiviso.
- **Poker inline ovunque**: selettore lega include poker; ClassificaShell "La tua situazione" poker via
  `classificaPokerCrossContesto` (netto+%+partite); il **redirect** alla schermata poker resta come link rapido.
- Plus: `TabClassifica` ora usa `classificaPoker` (#4.6) → **risolta la duplicazione temporanea** del #4.6.
  Filtro data poker preservato. Marker "ci sei" nel breakdown ("non ci sei più" deferito, #8). Niente inline style.
- Prompt archiviato in `archivio/MULTIGIOCO_4_7A_CLASSIFICA_PROMPT.md`.
- **Prossima**: **4.7b** (storico condiviso su `vociStorico`), poi **4.7c** (nickname + normalizzazione) → 4.x chiusi.

## 2026-06-04 (k) — #4.7b "storico condiviso" mergiata (chat base review)

- **#4.7b in `main`** (merge `e64d9e9`, 138 test, tsc+lint verdi). Review chat base OK (diff letto +
  green check pre/post; **nessun import residuo** di StoricoSessioni). Fase UI: browser dei 3 contesti dalla chat di fase.
- Nuovo `components/storico/StoricoLista.tsx` — card **parametrica** su `voce.kind`: 'poker' (ranking
  netto + settlement, identica a TabStorico) | 'gioco' (sessione + esiti, identica a StoricoSessioni);
  filtro nome **secco** (`filtraStoricoPerNome`); espandi/collassa locale con chiave `${kind}:${id}`.
- `TabStorico`/`LegaStorico`/`StoricoShell` rifatti sul condiviso. **`StoricoSessioni` RIMOSSO** (assorbito).
- **Poker inline**: LegaStorico ha ora il **selettore gioco** (Tutti/Poker/giochi → colma la lacuna (d));
  StoricoShell mostra il poker inline (niente più EmptyState di rimando) + link rapido. Filtro data poker preservato.
- Nota minore (cleanup opzionale): commento in `utils/storico.ts` cita ancora "StoricoSessioni / UI vecchia
  resta com'è" → ora superato (lo può ripulire #4.7c, che tocca le utils).
- Prompt archiviato in `archivio/MULTIGIOCO_4_7B_STORICO_PROMPT.md`.
- **Prossima**: **4.7c** (nickname + normalizzazione) → **ultima sub-fase, poi i 4.x sono chiusi**.

## 2026-06-04 (l) — #4.7c "nickname + normalizzazione" mergiata → RIFINITURE 4.x CHIUSE

- **#4.7c in `main`** (merge `c242c1c`, **147 test**, tsc+lint+**build di produzione** verdi). Review chat base OK.
- Nuovo `utils/giocatori.ts::validaRinomina` (puro, 8 test): vuoto/assente/sei-tu/dedup normalizzato
  (esclude sé per id → ritocco case/accenti del proprio record ok). L'azione store `rinominaGiocatore`
  la usa. UI: edit **soprannome inline** in `TabPartecipanti` (icona matita; **niente** sul "sei tu").
- **`normalizzaNome` OVUNQUE**: `statsPersonaCrossContesto` (era `.toLowerCase()`), dedup
  `aggiungiGiocatore`, lookup nomi in serata/torneo, `SheetNuovaSessione`, `ListaLeghe` (via `èSeiTu`).
  Un solo criterio di match nome in tutta l'app. Commento stantio in `storico.ts` ripulito.
- **MILESTONE: rifiniture 4.x TUTTE chiuse** (#4.5 sei-tu, #4.6 layer-dati, #4.7a classifica, #4.7b storico,
  #4.7c nickname). Spina multigioco + rifiniture **complete**. Controllo generale: build prod ok, `main`
  allineato/pulito, branch di fase cancellati.
- Prompt archiviato in `archivio/MULTIGIOCO_4_7C_NICKNAME_PROMPT.md`.
- **Prossimo blocco = poker-live**: **#5 soldi d'uscita** (`saldoUscita`) → **chat OPUS** (logica soldi,
  SPEC `USCITA_CASH_SPEC` + esempi-test prima del codice) → #6 tavolo live. + valutare estrazione **libreria feature**.

## 2026-06-12 — anticipato il BACKEND (Supabase): SPEC + Auth first, incrementale

> Cambio di rotta deciso con l'utente dopo il collaudo browser delle 4.x. Le feature in arrivo
> (admin/ruoli, "sei tu" affidabile, leghe condivise, multi-device) battono sul soffitto identità/ruoli.

- **Si anticipa il backend** (#8) rispetto al resto, **NON big-bang**: prima **SPEC** (fatto:
  `BACKEND_SPEC.md`), poi **Auth reale** (alto valore, contenuto) → sync → ruoli.
- **Identità** (proposta): account Supabase + `giocatori.account_id` opzionale → **"sei tu" = giocatore
  col tuo account** (il match per nome resta **solo per i guest**). I guest restano (li gestisce l'admin).
- **Ruoli** per-lega via RLS (owner/admin/membro) → **assorbe #7.5**; il "fissa gioco" diventa potere admin.
- **Feature locali NON bloccate** (poker integrato, "tutti i giochi", fix pin, poker-live): si intrecciano;
  meglio reshapeare il **modello locale (poker integrato + all-games) prima di B2** (migri la forma finale 1 volta).
- **Forche CONFERMATE** (2026-06-12): (1) **online-required**; (2) **guest ammessi** (+ **trasferimento
  storico guest→account** via richiesta nello storico personale o self-claim; **in lega solo l'admin**;
  gli admin **si passano il "file dei guest"**); (3) **email+password** (OAuth dopo). Resta: **creare il
  progetto Supabase** (URL + anon key). **Futuro**: **amicizie fra account** (vedi `IDEE.md`).
- Roadmap: i vecchi #5–#8 restano come dettaglio ma l'ordine post-4.x è ora `BACKEND_SPEC.md` (B0→B4).

## 2026-06-13 — auth (conferma email, username univoco, settings) + Play Store via PWA/TWA

> Decisioni utente durante l'implementazione di B1 + risposta alla domanda "Play Store con aggiornamenti rapidi".

- **Conferma email = ON** (tenuta apposta, più sicura). B1: dopo `signUp` → schermata **"controlla la mail"**;
  il link riapre l'app e logga (lo fa il SDK con `detectSessionInUrl`). Configurare **Site URL / redirect**
  nel dashboard (localhost in dev, URL hostato in prod).
- **Username UNIVOCO** (richiesto): Supabase Auth garantisce univoco solo l'**email**, non lo username →
  serve tabella **`profiles`** (`username UNIQUE`) + enforcement a signup (**trigger** su `auth.users`):
  se preso → "Username già in uso". Anticipa il **primo pezzo di DB**. → fase **B1.5**.
- **Impostazioni → Account** (cambia email/password): cambio **password** chiede la **vecchia password**
  (re-auth) poi `updateUser({password})`; cambio **email** → vecchia password → `updateUser({email})` →
  **doppia conferma** Supabase su vecchia+nuova ("Secure email change", già attiva di default). → fase **B1.6**.
- **Play Store = PWA + TWA** (Bubblewrap/PWABuilder): l'app diventa **PWA** + **hostata**; sul Play Store è un
  **guscio TWA** che carica il sito → **aggiornamenti web ISTANTANEI senza review** (ripubblichi solo per
  icona/nome/manifest). Costo **$25 una-tantum**; requisiti: Lighthouse PWA ≥ 80 + Digital Asset Links. →
  milestone **P**. **Strategia: pubblica un MVP presto e itera LIVE** (la TWA rende flessibile quando pubblicare).
- **Ordine aggiornato**: B1 (rifinire: "controlla mail" + logout + Site URL) → **B1.5** username → **B2** sync
  dati → **P** (PWA/TWA → Play Store) → **B3** ruoli + **B1.6** settings + feature locali, tutto **in volo** (live).

## 2026-06-13 (b) — PIVOT a React Native (Expo): riorganizzazione roadmap

> Decisione utente: l'app va portata su **React Native** (più richiesto/più mercato, obiettivo CV).
> "Riorganizziamo tutto". Ricerca fatta su Expo + Supabase-RN + EAS Update.

- **Stack RN = Expo (managed) + TypeScript + Expo Router.** Per un solo dev/primo progetto: scrivi solo
  JS/TS, Expo gestisce il nativo. (Bare workflow solo se servisse codice nativo custom.)
- **Aggiornamenti veloci PRESERVATI**: **EAS Update (OTA)** spedisce JS/stili/asset over-the-air senza
  review (entro le regole store: bugfix/layout/copy ok, non cambiare lo scopo dell'app). = equivalente RN
  della TWA → il requisito "aggiorna senza ripubblicare" resta valido. **(Supera il piano "PWA/TWA" del (a).)**
- **Si RIUSA (il "cervello", TS puro)**: `utils/` (funzioni pure), `types/`, lo **store Zustand** (cambia
  solo l'adapter persist: localStorage → **AsyncStorage**), `lib/supabase.ts` (storage AsyncStorage,
  `detectSessionInUrl:false`), i **147 test** (Jest), e tutto il design/decisioni in `_processo/`.
- **Si RICOSTRUISCE in RN (la "pelle")**: `components/*.tsx` (DOM → View/Text/Pressable/FlatList…),
  `styles.css` (→ StyleSheet), routing (React Router → **Expo Router**), entry web → entry Expo, icone (SVG →
  `react-native-svg`). Auth web → RN con **conferma email via deep link** (scheme `app.json` + redirect Supabase + URL handling).
- **Vantaggio**: architettura già **RN-friendly** (logica separata dalla UI, **niente Tailwind** — scelta
  del 2026-05-31 in vista di RN). "Nuova pelle sullo stesso cervello", non da-zero.
- **Backend invariato**: `BACKEND_SPEC.md` (auth/RLS/profiles/dati) è **platform-agnostico**; cambia solo il **client**.
- **Strategia: PIVOT ORA** (non costruire altra UI web) → schermate esistenti rifatte in RN, poi tutto in RN.
  App web = **riferimento congelato**.
- **Roadmap RN** (sostituisce B0-B4 web): **R0** fondazione Expo + logica condivisa (147 test) → **R1** port
  schermate core → **R2** Auth Supabase RN (deep link, riusa la logica di `backend-b1-auth`) → **R3** username
  univoco (`profiles`) → **R4** sync dati → **R5** ruoli/condivisione → **settings + feature locali** in volo →
  **RP** pubblicazione (EAS Build + EAS Update OTA).
- **DA CONFERMARE prima di R0**: (1) struttura repo — Expo riusa la logica + web congelata [semplice] **vs**
  **monorepo** shared/web/mobile [più pulito, più setup]; (2) merge di `backend-b1-auth` in `main` come riferimento.

## 2026-06-29 — R0 fondazione monorepo + RN eseguita (chat base)

> Risolto il "DA CONFERMARE" del 06-13(b): **scelto il monorepo** (pnpm workspaces + Turborepo).
> R0 fatto a micro-step su `rn-r0-monorepo`; `backend-b1-auth` mergiato in `main` (`08364dc`) come riferimento.

- **Monorepo** (pnpm + Turborepo, `.npmrc` `node-linker=hoisted` per Metro): `apps/web` (ex web congelata,
  `@whos-the-boss/web`), `apps/mobile` (Expo, `@whos-the-boss/mobile`), `packages/core` (`@whos-the-boss/core`, logica pura).
- **R0.1** (`9d6328e`,`3c226a4`): scaffold monorepo + sposta web in `apps/web`.
- **R0.2** (`034974d`,`a8ab1d4`): estratto `@whos-the-boss/core` = `utils/`+`types/`+**138 test**; la web lo importa (44 file).
- **R0.3** (`90c3732`): scaffold `apps/mobile` con **Expo SDK 56** (Expo Router, React 19.2 / RN 0.85).
  - **Template default poi sfoltito** a fondazione minima (1 schermata che prova `@whos-the-boss/core`); demo rimossa.
  - **`metro.config.js`** per monorepo: `watchFolders=[root]` + `nodeModulesPaths=[app, root]` (hoisted).
  - **Verifica headless** (niente emulatore): `tsc --noEmit` + **`expo export`** (Metro bundla 1536 moduli →
    bytecode Hermes) = prova che `@whos-the-boss/core` si risolve via Metro. Turbo test monorepo verde (**147**).
- **Debito**: dep Expo del template non ancora usate (`@expo/ui`, `expo-glass-effect`, `expo-symbols`,
  `expo-image`, `expo-device`, `expo-web-browser`) + icone generiche → sfoltire/brandizzare in R1/RP.
- **Prossimo**: **R0.4** = merge `rn-r0-monorepo` → `main` (chiusura R0), poi **R1** port schermate core in RN.

## 2026-06-29 (b) — rinominato lo scope dei pacchetti @poker -> @whos-the-boss

> Richiesta utente: togliere "poker" dove indica il NOME del progetto/app (non il gioco) e usare
> "who's the boss" (= il repo). Pulizia identita', coerenza per il CV.

- **Scope pacchetti**: `@poker/{core,web,mobile}` -> **`@whos-the-boss/{core,web,mobile}`** (54 file:
  package.json + tutti gli import + script + metro.config). Reinstall pnpm (lockfile rigenerato).
- **Title web** `index.html`: "Poker Tracker" -> **"Who's the Boss"**.
- **README EN/IT**: tolti i path stale `poker-react/` (cartella ormai `apps/web`) -> comandi monorepo
  (`pnpm install` / `pnpm dev:web`) + struttura aggiornata (apps/web, apps/mobile, packages/core).
- **NON toccato** (e' il GIOCO, non il nome): settlement/rotte/UI poker, `_legacy/poker_tracker.html`,
  `_processo/POKER_MAP.md`, screenshot, descrizioni "poker" nei README. Una sostituzione cieca le romperebbe.
- **Verifica verde** dopo il rename: turbo test (147), build web, tsc mobile, `expo export` (Metro 1536 moduli).
- ⏳ **Resta da fare a mano (utente)**: rinominare la **cartella OS root** `…\Programmi\poker` ->
  `…\whos-the-boss` (non fattibile da dentro la sessione: e' la CWD, Windows la blocca). Git/remote non cambiano.

## 2026-06-29 (c) — R1 avviato: port React Native (approccio + navigazione)

> Inizio del port delle schermate in RN (branch `rn-r1-port`). Ricerca UX fatta (Expo Router SDK 56).

- **Approccio (deciso con l'utente)**: **port nativo fedele** — stessa IA/schermate del web, ma con
  navigazione e componenti NATIVI (tab bar native, transizioni, gesture, tema feltro). Il **restyle visivo
  grosso resta per dopo** ("molto in la'"). Scartato il redesign mobile-first ora (lungo + duplicherebbe il restyle).
- **Navigazione**: **Expo Router** = root `Stack` (native) + `(tabs)` a 4 voci (Home/Classifica/Storico/Leghe),
  stack annidati per sezione lega e poker (pattern standard SDK 56). Native Tabs "liquid glass" valutate ma
  rimandate (alpha) → per ora `Tabs` stabile, tematizzato. Tema nav via `ThemeProvider` di expo-router.
- **Tema RN**: i design token della web (`styles.css :root`) portati in un oggetto `Theme` (scuro + variante
  feltro); la logica "quale tema/accento per gioco" si RIUSA da `@whos-the-boss/core` (`temaPerGioco`/`accentPerGioco`).
  `applyTema` di core e' DOM-only (web): su mobile non si usa. (Debito: `applyTema` andrebbe spostato in `apps/web`.)
- **Sotto-fasi R1**: R1.1 tema+nav (FATTO `9e49827`) -> R1.2 design system (primitive + icone SVG) ->
  R1.3 fondazione stato (store condiviso + AsyncStorage + Supabase disaccoppiato; tocca lo store **"non toccare
  senza spec"** -> **mini-spec prima**) -> R1.4... schermate una alla volta (ognuna con ricerca UX mirata).

## 2026-07-01 — R2 mergiata + LINEA UFFICIALE fino alla pubblicazione (utente + chat base) — ⭐

> R2 (Auth Supabase RN) mergiata in `main` (`c2783db`, 147 test verdi). Con l'utente abbiamo
> scelto **strategia A (sostanza prima)** e disegnato la **linea completa** da qui alla
> pubblicazione, mettendo in conto **tutto** il sospeso + uno slot per le feature nuove.

- **Scelta di fondo: A (sostanza prima)** con raffinatura **reshape-first**: i pezzi che
  **cambiano la forma di schermate/modello** (poker integrato, "tutti i giochi", tavolo live)
  si fanno **PRIMA del backend**, così le tabelle cloud nascono sulla forma definitiva e lo
  **schema si migra una volta sola**. (L'alternativa "sync subito del modello attuale" → doppia
  migrazione, scartata.)
- **Restyle grande = ultima fase prima di pubblicare** (accettato dall'utente). Tutto ciò che
  reshapa la UI viene prima, così si disegna una volta sola sulla struttura finale.
- **Tavolo live (R5)**: **base single-device** (un telefono = il banco); **spettatori
  multi-device** rimandati al realtime (R9).
- **Ruoli (R8)**: si saltano i "ruoli solo locali" (vecchia #7.5) → si fanno **diretti sul
  backend**, dato che andiamo backend-first.
- **Feature nuove non ancora scritte**: hanno uno **slot dedicato (R11)**, prima del restyle;
  si raccolgono in `IDEE.md` man mano, le grosse diventano una fase a sé.
- **Meta-regola (utente)**: se più avanti **cambiamo rotta** rispetto a questa linea, lo
  registriamo come **"errore/lezione di costruzione"** (utile da riportare in **SideKick**),
  non come modifica silenziosa. → vedi memoria feedback.

**LA LINEA (codici nuovi; superano le etichette tentative R3=username/R4=sync/R5=ruoli):**
- **Quick wins**: toast globale mobile · date-picker.
- **BLOCCO 1 — reshape locale**: **R3** poker integrato · **R4** "tutti i giochi" (sessione
  multi-gioco + viste aggregate) · **R5** tavolo live interattivo (`TAVOLO_LIVE_SPEC` +
  `USCITA_CASH_SPEC` soldi d'uscita + naming "Sessioni" + fix GameBar pin), base single-device.
- **BLOCCO 2 — backend**: **R6** identità reale (`profiles` + username univoco + R2.4 deep link
  conferma email) · **R7** sync dati cross-device (leghe/sessioni/partite + RLS + migrazione) ·
  **R8** ruoli & condivisione (admin multi-livello, inviti lega, governance GameBar) · **R9**
  realtime & social (tavolo spettatori multi-device + amicizie fra account).
- **BLOCCO 3 — rifiniture & nuove**: **R10** rifiniture (editor livelli torneo, foto lega via
  Supabase Storage, sfoltire dep Expo debito R0.3) · **R11** feature nuove (slot aperto).
- **BLOCCO 4 — traguardo**: **R12** restyle grande (redesign + brand definitivo) · **RP**
  pubblicazione (EAS Build + screenshot + store + EAS Update OTA).

## 2026-07-01 (b) — LEZIONE DI COSTRUZIONE: ricerca-prima-della-spec + poker come "mode" (utente) — ⭐

> Errore di processo + correzione (candidato **SideKick**). Avevo proposto la mini-spec di R3
> ("poker integrato") partendo da una **nota interna** (IDEE) **senza prima cercare come lo fanno le
> app note e solide**. L'utente ha corretto: **ricerca → spec → codice**, e SOLO su app
> conosciute/solide. Metodo aggiornato in `CLAUDE.md` (sez. «Ricerca prima di scegliere»,
> ora vale per le FEATURE, non solo la grafica) → **da risincronizzare in SideKick**.

- **Ricerca fatta** (app note/solide):
  - *Multi-game tracker standard* = **BG Stats**: tutti i giochi trattati **uniformemente** (un
    modello, template di punteggio per-gioco, ma **statistiche/storico/giocatori CONDIVISI**).
    Nessun gioco è una sotto-app.
  - *Poker live* (PokerBoss, PokerTimer, Blinds Are Up!, Blind Valet, Travis, The Poker Timer): la
    **sessione live è una modalità immersiva a schermo intero dedicata** (clock/blind al centro,
    editor struttura, seating, payout, **cast a secondo schermo/TV** — "i giocatori vedono solo il timer").
- **Decisione R3 (confermata + rifinita dalla ricerca)**: **ibrido** =
  1. classifica/storico/giocatori del poker = **le viste condivise** (standard BG Stats) → si tolgono
     le schede duplicate del poker;
  2. la **sessione poker resta una schermata immersiva a schermo intero** (standard poker-timer),
     senza chrome/tab. Il disagio "poker = app separata" nasce dalla **duplicazione** delle viste,
     non dalla separatezza della sessione.
- **Nord per R5 (tavolo live)**: adottare le feature best-in-class dei poker-timer (clock grande,
  editor struttura blind, seating, payout; più avanti cast a TV/secondo schermo).

## 2026-07-01 (c) — R6 identità reale COSTRUITA (profiles + username univoco + deep link + "sei tu" per account)

> Blocco 2 (backend) aperto. R6 costruito a micro-step su `rn-r6-identita` (6.1→6.5), tutto verde
> headless (185 core + web/state test + mobile export/tsc). Ricerca-prima-della-spec rispettata:
> Discord/Instagram (two-tier), doc Supabase (profiles/trigger, native deep linking).

- **Two-tier identità (come Discord/Instagram)**: `username` = **handle univoco** (minuscole,
  `[a-z0-9._]`, 3–20) per identità/ricerca/amici; `display_name` = nome visualizzato libero
  (opzionale). Il soprannome per-lega resta (override locale). Profilo mostra display + `@handle`.
- **Univocità garantita dal DB**: tabella `profiles` (unique index su `lower(username)`) + trigger
  `handle_new_user` (SECURITY DEFINER, legge i metadata del signUp) + RPC `username_available` per
  il pre-check. Verità = DB (race-safe); il pre-check è solo UX. Migration **versionata** in
  `supabase/migrations/` (showcase). Azioni dashboard utente: applicare migration + Redirect URLs.
- **"sei tu" ancorato all'ACCOUNT, non al nome (R6.5)** — *pulizia/lezione richiesta dall'utente*:
  il match-per-nome `èSeiTu` era **scaffold pre-backend**. Ora `NomeGiocatore.accountId` +
  `èSeiTuRecord(rec, accountId)` puro. `assicuraGiocatorePersonale` prende lo `User`, timbra il
  record dell'account, **migra una volta** il vecchio record creato per nome, non ruba record di
  altri account (multi-login). **`èSeiTu(nome)` RIMOSSA da core** (orfana dopo lo swap): niente
  codice morto. `normalizzaNome` resta (match/dedup guest + filtri classifica/storico).
- **Deep link conferma email (R2.4, CHIUSO) SENZA nuove dipendenze**: parser puro `parseAuthRedirect`
  in core (token/errore dal fragment) + hook `useDeepLinkAuth` (expo-linking, già presente) →
  `supabase.auth.setSession`. `register` passa `emailRedirectTo = whostheboss://auth-callback`.
  Scartato `expo-auth-session` (anti-bloat, coerente col debito dep R0.3).
- **Contratto `register` esteso con `displayName?` opzionale**: la web congelata resta compatibile
  senza modifiche (parametro opzionale). Web toccata solo per coerenza identità (2 file → `èSeiTuRecord`).
- **`accountId` in R6 solo sul record Personale "sei tu"**; il binding su TUTTI i `giocatori`
  (tabella cloud) resta a **R7 sync** (dove nasce lato server). Deciso col piano 2026-07-01.

## 2026-07-01 (d) — RED TEAM senior + linea di produzione riordinata (de-risk first) — ⭐ lezione

> L'utente ha chiesto un red team "senior" su tutto il processo/risultato e di **riordinare la linea
> di produzione** includendo tutte le critiche. Registro completo in `_processo/REVISIONE-ESTERNA.md`
> (finding F1–F14 con severità e "dove si risolve"). Migration R6 applicata dall'utente + Redirect URL
> `whostheboss://**` configurato (F2/F3 mitigati; resta la prova signup su device = R6.V).

- **Lezione di costruzione (per SideKick)**: dopo 304 commit e un pivot (web→RN) l'app non era mai
  girata su un device reale, senza CI, senza recupero password, senza test d'integrazione — mentre si
  costruiva backend. **Principio adottato: DE-RISK prima di aggiungere superficie.** Prima far
  funzionare/proteggere ciò che c'è (device, CI, auth completa, test dello store), poi il resto.
- **Ordine autorevole in `CONTESTO.md`** (sezione "LINEA DI PRODUZIONE riordinata"): TRACK 0
  infrastruttura (I1 CI, I2 CI migrations) → **R6 chiusura vera** (R6.6 recupero password · R6.7
  hardening · R6.8 test store · **R6.V verifica device = GATE** → merge) → R7/R8/R9 backend →
  H1–H4 hardening pre-pubblicazione (crash reporting, SMTP, privacy/ToS, debito) → R12 restyle → RP.
- **Nessun codice toccato in questo passo**: solo registrazione critiche + riordino (richiesta esplicita
  "prima segnati tutte le critiche e crea la linea"). Esecuzione dal prossimo passo (consiglio: I1 CI).

## 2026-07-01 (e) — RED TEAM ESTERNO integrato + reframe "serio = invisibile" — ⭐ lezione

> Red team esterno (chat base non contaminata) su flusso + piano. Finding E1–E11 in
> `REVISIONE-ESTERNA.md`. Verdetto: CAMBIA (scheletro sano, sequenza sbagliata, peso morto).
> Concessione: il mio piano mascherava "l'app non è MAI stata eseguita" dietro il gate R6.V
> (razionalizzazione) → **owned**.

- **Steer utente**: feature + restyle **ultimissimi** (li vuole, ma dopo tutto il resto); "apriamola per
  vedere se va" ma **il feedback amici serve dopo**; intanto **le cose importanti per un'app "seria"**.
- **Reframe adottato**: "serio" = **qualità invisibile da senior** (correttezza, sicurezza, verifica,
  test, doc) su **ciò che ESISTE**, NON più superficie/feature. (Music-marketplace review: non ti
  comprano l'app, ti "comprano" te → conta l'invisibile + saper **difendere le decisioni, non il codice**.)
- **Verificato dal codice** (il senior aveva detto di controllare): soldi = float + round-a-centesimi
  (`r100`) → difendibile, non landmine; **nessun segreto hardcoded**; RLS esiste ma `select` pubblico.
- **Concessioni tecniche adottate** (BLOCCO A/B in `REVISIONE-ESTERNA`): profili **RLS privati**;
  **trigger** a prova di footgun + mapping stretto; **audit RLS**; deep link **verificato su device**
  (swap a `expo-linking` se serve); recupero password **rimandato** (local-only = ri-signup gratis);
  **Supabase CLI + README** al posto dello step manuale (niente CI-migration); CI ridotta a test+tsc.
- **DECISIONI PRESE (utente, risposte 2026-07-01 (e))**:
  1. **Web congelata → RIMOSSA** da `main` (tag `archive/web-frozen`, recuperabile). Toglie la tassa
     di compilazione e la confusione sul repo pubblico (E8). ✅ fatto.
  2. **R7/R8/R9 NON congelati → si prosegue** — ma **marcato come SCELTA DI STUDIO** (per i senior, non
     è una svista): questa app = *costruzione COMPLETA + un unico test gigante su device ALLA FINE*;
     **All for Music** = APK incrementale con test a ogni tot. L'utente confronta i due approcci via
     **SideKick**. ⇒ **tracciare token + tempo** in `_processo/METRICHE.md` (istruzione permanente).
  3. **Soldi → tenere float + arrotondamento `r100` e DOCUMENTARE** (niente migrazione a interi ora).
- **PRIMA MOSSA rivista**: la "V0 device ORA" è **annullata** dalla scelta di studio (il test è alla
  fine). Si prosegue la costruzione: **R6 hardening applicato** (profili privati + trigger footgun,
  migration `…140000`), poi **R7 sync** (mini-spec prima — backend/dati = "design prima del codice").

## 2026-07-01 (f) — R7 sync: scelto RELAZIONALE + mappa viva (design prima del codice)

> Ricerca fatta (local-first RN+Supabase, LWW, import one-shot) + review del modello dati reale.
> Scelta utente: **relazionale normalizzato** (non JSONB-per-lega) — "programmato con calma, review di
> tutto il codice, un file con tutte le relazioni, non perdere niente, chiaro per poterne parlare".
> Mappa completa in **`_processo/R7_SCHEMA.md`** (documento VIVO) + diagramma ER.

- **Scope R7** = sync dei **dati propri** (le tue leghe) sul **tuo account, multi-device**. Condivisione
  tra account + ruoli = **R8** (lì servono `lega_membri` + RLS per-membro).
- **Local-first PRESERVATO + layer di sync** (push/pull, **LWW su `updated_at`**, tombstone `deleted_at`).
  **NON online-required** → *course-correction di `BACKEND_SPEC`*: diceva online-required "perché è una
  demo", ma R1–R5 l'hanno resa un vero local-first offline; online-required riscriverebbe ~50 azioni e
  toglierebbe l'offline. (Lezione per SideKick: le assunzioni dello spec vanno riverificate quando l'app cambia.)
- **Stato LIVE non sincronizzato in R7** (`sessioneAttiva`/`serate_bg`, timer/seat/livelli): resta locale,
  al **realtime R9**. Si sincronizza solo lo **storico salvato** (Partite chiuse, SessioniGioco). Grande de-risk.
- **Tabelle**: profiles(R6) · leghe · **giocatori (perno: risolve `id_nome`)** · giochi_lega · partite_poker ·
  partita_poker_giocatori · **settlements (= i debiti)** · serate · sessioni_gioco · partite_gioco + ponti
  partecipanti/vincitori. **Soldi = `numeric(10,2)`**. Ogni riga tiene `local_id` (mapping int→uuid) + `updated_at`.
- **Decisioni proposte (D1–D8 in `R7_SCHEMA.md`)**, aperte per l'utente: D1 live-locale, D2 array-foglia JSONB
  (ricariche/pagamenti), D3 ponti per partecipanti/vincitori, D5 preferenze GameBar (locali vs cloud).
- **Sotto-fasi**: R7.1 schema SQL+RLS+diagramma → R7.2 layer sync (test-first) → R7.3 import one-shot
  (backup-first) → R7.4 aggancio store → R7.V verifica nel grande test finale. **Nessun codice prima dell'OK.**

## Nuove feature messe in coda (oltre a Card Tracker)

- **Uscita da cash in corso** (soldi): un giocatore lascia la partita cash mentre è
  in corso (vincente/perdente, debito saldato o no). Logica di soldi →
  `USCITA_CASH_SPEC.md` (completato, con esempi-test).
- **Tavolo virtuale live + cassa al centro + timer + "Sessioni"**: UI/UX della
  sessione viva → `TAVOLO_LIVE_SPEC.md` (bozza).
- **Restyle grafico** del poker esistente: vedi `DESIGN_SPEC.md` (fase R).

## Decisioni storiche (sintesi, dettagli negli SPEC)
- Settlement cash v2: modello `versato`/`dovuto`, `entrata` per giocatore.
- Settlement torneo: `contributo_residuo`/`premio_residuo` con auto-compensazione.
- Tailwind: rimandato (obiettivo React Native). CSS con variabili va benissimo.
- **AI dichiarata apertamente** (README + METODO): i commit **possono** portare `Co-Authored-By: Claude` (la history vecchia già lo fa). *(2026-06-04: stop al "sembra scritto solo da me" — da ora sfoggio l'uso dell'AI.)*
