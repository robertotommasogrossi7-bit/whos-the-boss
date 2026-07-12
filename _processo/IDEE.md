# IDEE — ragionamenti aperti / feature future non ancora decise

> Le chat base ci ripassano a inizio sessione e ai punti di svolta. Quando un'idea si **decide**,
> migra in `DECISIONI.md` (e nella roadmap di `CONTESTO.md`).

## 2026-07-01 — Analitiche & grafici (payoff dello schema relazionale) 📈

> Idea utente durante R7.1: "possiamo fare grafici tipo il picco di un giocatore, in che periodo,
> per quanto tempo?". SÌ — ed è **esattamente il vantaggio** del relazionale su JSONB: con
> `partite_poker.data` + `partita_poker_giocatori.netto_finale` ordinati per data si calcola la
> **curva cumulativa (bankroll)** di un giocatore → il **picco** = massimo della somma corrente, il
> **"quando"** = la data del picco, il **"per quanto"** = durata sopra soglia / lunghezza streak.
> Fattibile come **VIEW SQL** / funzione Postgres **o** client-side sui dati sincronizzati.
> Colloca: **feature (R11)** o **R12**, oppure una vista "Andamento" dedicata. Ottimo pezzo da
> **portfolio data-engineer** (SQL analitico + chart). Nota: `data` è a livello di giorno → per
> l'ordine intra-giornaliero usare `local_id`/`created_at` come tie-break. **Non ora** (prima il sync).

## 2026-06-12 — feedback dopo collaudo browser (utente) + nodo Supabase

### Feature emerse (per lo più LOCALI — non richiedono il backend)
- **GameBar / gioco "fissato"**: una volta fissato non si sblocca più → **l'admin deve poterlo
  cambiare/sbloccare**. Inoltre nello **shell (non-lega) il pin è ridondante**: cliccare un gioco già
  lo seleziona. → il pin / mono-gioco ha senso **solo a livello lega**, governato dall'**admin**
  (= concetto di **ruoli** → #7.5/backend). Parte fix-UI **locale**, parte governance **ruoli**.
- **"Tutti i giochi"**: pulsante che apre una **sessione multi-gioco** in cui iniziare partite a
  **qualsiasi gioco** nella stessa sezione, **anche giochi diversi insieme**; e mostrare **classifica
  e storico aggregati su TUTTI i giochi**. (Il modello in parte regge: `PartitaGioco.nomeLibero` +
  `partecipanti` per-partita; serve estendere `SessioneGioco` al multi-gioco + viste aggregate.) **Locale.**
- **Poker integrato (NO sotto-app separata)**: aprendo il poker **non** si va in un'altra schermata;
  **classifica e storico restano i condivisi** (o di lega, se siamo in una lega); **solo "apri
  sessione"** diventa la sessione poker (cash/torneo). Disfa `AppLayout`/`BottomNav` separati di
  `/leghe/:id/poker/*`. **Continuazione naturale dell'unificazione 4.7** (classifica/storico già
  unificati; manca unificare sessione/navigazione). **Locale.**

### Nodo strategico — anticipare Supabase (#8)?
- L'utente propone di **anticipare il backend** prima di queste modifiche.
- Lettura: le 3 feature sopra sono **locali** (UI/modello) → il backend non le rende più facili. I
  **veri** guadagni del backend sono: **identità reale** (basta kludge "sei tu" per nome) +
  **ruoli/permessi** su **leghe condivise** (l'admin che governa) + **multi-device**.
- Nota: auth da sola ≠ ruoli. I **ruoli** richiedono **dati condivisi** (lega come risorsa backend +
  RLS), non solo il login.
- Direzione proposta (da decidere): **SPEC backend ORA** (architettura, modello dati, auth,
  identità/ruoli, migrazione dal locale Zustand/localStorage) — è il "design prima del codice"
  obbligatorio — poi migrazione **incrementale**: **Auth + dati propri** prima (alto valore,
  contenuto), **condivisione/ruoli** dopo. Evitare il big-bang. Le feature locali possono precedere o
  intrecciarsi (conviene reshapeare il modello locale — all-games, poker integrato — **prima** della
  parte DB, così si migra la forma finale una volta sola).
- **Decisione → `DECISIONI.md`** appena scelta. **(Scelto 2026-06-12: online-required, guest sì +
  trasferimento storico, email+pw — vedi `BACKEND_SPEC.md` "Decisioni confermate" + `DECISIONI.md`.)**

### Futuro (post-backend)
- **Amicizie fra account** (richiesta utente 2026-06-12): poter fare "amicizia" tra account per
  semplificare il **contatto dentro e fuori le leghe** (invitare amici a una lega, mandare/ricevere
  richieste di storico, trovarsi più facilmente). Va **dopo** auth/identità (B1+).

## 2026-07-01 — Backlog ERGONOMIA per il RESTYLE (R12, ipotesi Claude Design)

> Dall'audit `_processo/ERGONOMIA_AUDIT.md` (sezione CERCA). Voci di SISTEMA/visual: rimandate al
> restyle per non fare lavoro doppio prima del redesign. Ora applicate solo le cheap (E1/E2).
- **R-erg1** — sistema **FAB** unificato per le azioni "crea" (bottom-right, thumb zone, una per schermata).
- **R-erg2** — **swipe** tra le sub-tab della lega (serve un pager).
- **R-erg3** — **stepper +/–** per gli input numerici (buy-in, n. giocatori).
- **R-erg4** — ripensare **GameBar** (posizione/gesture).

## 2026-07-01 — Feature native del telefono ("più carina") → default R10 (+ dove serve)

> Richiesta utente: integrare le feature native del telefono. Default in **R10** (rifiniture);
> le voci legate a una fase specifica vanno in quella fase.
- **Haptics** (feedback tattile sulle azioni chiave) — R10.
- **Condividi/Share** (resoconto "chi paga chi", classifica) al gruppo WhatsApp/Telegram — R10 (o subito: cheap+utile).
- **Notifiche push** (serata programmata, inviti, "tocca a te") — con backend/realtime → R9.
- **Biometria** (Face/Touch ID per rientrare) — con auth/settings → R6.
- **Fotocamera/galleria** (foto lega/giocatore, image picker) — R10.
- **Deep link** (conferma email / invito lega) — R6 (R2.4) e R8.
- **Clipboard** (copia resoconto/IBAN) + **payment link** (Revolut/PayPal per i debiti, come PokerBoss) — R10.
- **Cast** del clock torneo su TV/secondo schermo (poker-timer apps) — avanti/restyle.

## 2026-07-01 — i18n (multilingua) → al RESTYLE (R12)

> Richiesta utente: tradurre tutta l'app almeno in **inglese**, forse anche **francese** e **spagnolo**.
- Estrarre le stringhe UI (ora hardcoded in italiano) in un sistema **i18n** (es. i18n-js + expo-localization),
  lingua da impostazioni / di sistema, **IT default**. Conviene farlo **col restyle** (si ritocca comunque tutta la UI).

## 2026-07-13 — Note dal primo test reale sul telefono

- **Grafica poker poco chiara** (feedback utente dal vivo: "non mi fa impazzire, non è molto
  chiaro") → confermato rimandare al **restyle R12**, ma tenerlo come input concreto: la
  schermata live poker va ripensata per leggibilità, non solo abbellita.
- **🐛 Pulsanti in basso coperti dalla barra di navigazione nativa Android** (3 tasti sempre
  visibili sui telefoni con nav bar fissa): NESSUNA schermata usa i safe-area insets bottom
  (le SafeAreaView hanno solo `edges={['top']}`, i footer hanno padding fisso).
  **→ DECISO (utente, 2026-07-13): si fa COL RESTYLE R12** (la disposizione dei pulsanti può
  cambiare comunque lì). Requisito da portare nel restyle: **safe area su TUTTE le schermate,
  sia sopra che sotto** (`useSafeAreaInsets` top+bottom), testata su telefono con nav bar a
  3 tasti fissa (il caso peggiore — è quello dell'utente).
- **UX: capire dove vivono i giocatori** (utente ha aggiunto 2 persone in una lega e
  inizialmente non le trovava): **non era un bug** — il modello è roster per-lega (lega.nomi) —
  ma la UI non lo rende evidente. Da chiarire in UI (es. contatore giocatori nella card lega,
  empty state esplicativi) → input per R12.
- **⭐ REQUISITO per R8/R9 (utente, 2026-07-13)**: quando arrivano i **guest reclamabili** e le
  **richieste di dati agli altri account** (claim del giocatore guest + richiesta di storico),
  devono funzionare **sia per i guest dentro le leghe condivise, sia per i guest del Personale
  di qualcun altro** (es. "chiedo a te i dati del guest che gioca a casa tua"). Il perno nello
  schema c'è già (tabella `giocatori` con `account_id` nullable, vale per ogni lega inclusa la
  Personale) — il flusso UI/permessi di R8/R9 deve coprire **entrambi** i casi.
- **Prossimo giro di test = con gli amici, sul cloud** (utente): il test reale su device per ora
  basta; si riprende quando l'app sarà sul cloud (post R7), aggiornando l'app usata tra amici.
