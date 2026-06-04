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
