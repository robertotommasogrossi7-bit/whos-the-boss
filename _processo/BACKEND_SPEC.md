# BACKEND_SPEC — Supabase (identità reale, ruoli, multi-device)

> SPEC di **architettura** (v0, 2026-06-12). Deciso con l'utente: **anticipare il backend**, partendo
> da **SPEC + Auth**, in modo **INCREMENTALE** (no big-bang). Il DDL/RLS di dettaglio vive nello spec
> della singola fase (B1/B2/B3) quando la si implementa. Vedi `DECISIONI.md` 2026-06-12 + `IDEE.md`.

## Perché ora
Le feature in arrivo (admin che governa, "sei tu" affidabile, leghe condivise, multi-device) battono
contro il soffitto **identità/ruoli**: oggi sono best-effort (match per nome, login demo). Il backend
le rende **reali, una volta sola**. Le feature puramente **locali** (poker integrato, "tutti i giochi",
fix pin, poker-live) **non** dipendono dal backend (vedi §Fasi).

## Principi
- **Incrementale**: ogni fase porta valore a sé; l'app resta sempre funzionante e verde.
- **Identità reale al centro**: l'account Supabase è la verità. `normalizzaNome`/"sei tu"-per-nome
  restano **solo per i guest** (giocatori senza account).
- **Non riprogettare il dominio**: il backend **persiste** il modello attuale, non lo rifà. La
  **matematica** (settlement, stats) resta **lato client, pura** (funzioni già testate).
- **Migrazione dolce**: i dati locali si **importano** al primo login; `vanillaCompatStorage` resta
  finché la migrazione non è completa.

## Decisioni (stance proposta; ⚠️ = da confermare)
1. **Piattaforma**: **Supabase** (Auth + Postgres + RLS + Realtime). [deciso]
2. **Auth**: **email + password** per partire; **Google OAuth** come aggiunta facile dopo. [proposta]
3. **Identità — giocatori vs account** [proposta, IMPORTANTE]:
   - Un **account** (Supabase Auth) = una persona reale loggata.
   - Un **giocatore** resta un **record di lega** con un campo **`account_id` opzionale**:
     - con `account_id` → **membro reale** ("sei tu" se è il tuo account);
     - senza → **guest** gestito dall'admin (nome libero, come oggi).
   - Un guest può essere **"reclamato"** da un account (invito admin / la persona si collega).
   - ⇒ **"sei tu" = il giocatore col tuo `account_id`** (addio match per nome). Il nome normalizzato
     serve solo a cercare/deduplicare i **guest**.
4. **Ruoli** [proposta]: per-lega, sui **membri-account**: `owner` (creatore) / `admin` / `membro`,
   applicati via **RLS**. I **guest** non hanno ruoli (li governa l'admin). **Assorbe #7.5.**
   Il "fissa/cambia gioco" della lega diventa un **potere admin** (risolve il feedback GameBar).
5. **Architettura dati — offline?** [⚠️ LA SCELTA CHE PESA DI PIÙ]:
   - **(A) Online-required** *(consigliata per partire)*: Supabase è la verità; Zustand = **cache di
     lettura**; le scritture vanno al server. Più **semplice**, meno rischio, niente conflitti. Si
     perde l'uso **offline** (oggi via localStorage).
   - **(B) Local-first + sync**: Zustand resta sorgente locale, sync con Supabase (offline ok, bello
     per lo showcase) — ma **conflict-resolution** non banale, più lavoro/rischio.
   - *Raccomandazione*: **(A)** ora, **(B)** come evoluzione se l'offline diventa importante. (L'app
     oggi è "demo, niente salvato sul server" → online-required **non** è un downgrade reale.)
6. **Migrazione**: al **primo login** reale, import **one-shot** del `localStorage` nelle tabelle
   dell'account (le tue leghe + Personale). Poi il locale fa da cache. Idempotente/reversibile.

## Modello dati (alto livello — DDL preciso nello spec di B2)
Tabelle previste (mappate da `src/types/index.ts`):
- **`profiles`** (1:1 con `auth.users`): nome visualizzato, avatar.
- **`leghe`**: id, nome, foto, owner_id, created_at. (Personale = lega speciale per-utente.)
- **`lega_membri`**: lega_id, account_id, ruolo (`owner|admin|membro`). (Solo membri-account.)
- **`giocatori`**: id, lega_id, nome, **`account_id` nullable**. (Sostituisce `Lega.nomi`; collega i
  membri reali; i guest hanno `account_id=null`.)
- **`sessioni_poker`** (← `Sessione`), **`partite_poker`** (← `Partita`) + giocatori/settlement (righe o JSONB).
- **`sessioni_gioco`** (← `SessioneGioco`), **`partite_gioco`** (← `PartitaGioco`).
- **`debiti`** (settlement aperti — concetto già esistente).
> Poker e multigioco condividono `leghe`/`giocatori`; cambiano solo le tabelle sessione/partita.
> **Stat e settlement restano calcolati lato client** (funzioni pure attuali) sui dati letti.

## Fasi (incrementali — riordino post-4.x)
- **B0 — SPEC + scelte** *(questo doc)*. Output: 3 forche confermate + **progetto Supabase creato**
  (URL + anon key in env). Prerequisito utente.
- **B1 — Auth reale**: Supabase Auth (registrazione/login veri), `utente` = account, sessione
  persistente; **"sei tu" = giocatore col tuo account**. Ancora **dati locali**. *Alto valore,
  contenuto.* Sostituisce il login demo di `LoginScreen`.
- **B2 — Sync dati propri**: le **tue** leghe/dati su Postgres, **multi-device**. Import one-shot dal
  locale. Qui il **DDL completo** + il data-layer (repository) che affianca/sostituisce lo store.
- **B3 — Condivisione + ruoli**: leghe **condivise** tra account, inviti, **RLS** + poteri (admin/owner:
  nomina, revoca, espelli, governa il mono-gioco). **Assorbe #7.5.**
- **B4 — Realtime / spettatori** *(opzionale)*: tavolo live condiviso, spettatori (vecchio #8/`IDEE`).

## Feature LOCALI (non bloccate dal backend — quando incastrarle)
Poker integrato (no sotto-app), **"tutti i giochi"** (sessione multi-gioco + viste aggregate), **fix
pin**, **poker-live #5/#6**: sono **locali**. Conviene il **reshape del modello locale** (poker
integrato + all-games) **prima di B2**, così si migra la **forma finale** una volta sola. Vedi `IDEE.md`.

## Decisioni CONFERMATE (2026-06-12, utente)
1. **Offline** → **(A) online-required**. ✅ (Supabase = verità; Zustand = cache di lettura.)
2. **Auth** → **email + password** per ora (OAuth più avanti). ✅
3. **Guest** → **ammessi** ✅, con queste regole:
   - **Trasferimento storico guest → account reale**: nello **storico personale** un pulsante invia una
     **richiesta a un account** per ottenere/unire lo storico; possibile anche **in autonomia**
     (self-claim) quando hai diritto sul record. **Nelle leghe il trasferimento/aggiunta guest lo fa SOLO l'admin.**
   - **Guest in lega**: aggiunti **solo dagli admin**; gli admin **si passano il "file dei guest"**
     (roster guest condivisibile tra admin). [meccanismo esatto del "file" + flusso richiesta/claim → **B3**]
4. **Prerequisito B1**: progetto **Supabase** creato + **URL + anon key** in `.env`. ⏳ in corso.

> Idea futura (post-backend): **amicizie fra account** per semplificare il contatto dentro/fuori le
> leghe (invitare amici, condividere storici, trovarsi). Vedi `IDEE.md`.
