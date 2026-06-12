# IDEE — ragionamenti aperti / feature future non ancora decise

> Le chat base ci ripassano a inizio sessione e ai punti di svolta. Quando un'idea si **decide**,
> migra in `DECISIONI.md` (e nella roadmap di `CONTESTO.md`).

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
- **Decisione → `DECISIONI.md`** appena scelta.
