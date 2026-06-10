# FASE #4.7c — Nickname (soprannome) + normalizzazione ovunque — PROMPT di fase

> **Chi sei**: chat di fase **Sonnet**. Prima leggi `METODO.md` (Desktop) e `_processo/CONTESTO.md`.
> Poi questo prompt. **Implementi solo questa sub-fase**, micro-commit, push dopo OGNI commit.
> **NON** mergi in `main`. **È l'ULTIMA sub-fase: con questa i 4.x sono chiusi.**
> Decisioni: `DECISIONI.md` **(e)**, **(f)**, **(i)**.

## Obiettivo (due cose)
1. **Soprannome/nickname** per giocatore: poter **rinominare** un giocatore in una lega. È un'etichetta
   **cosmetica** (comodità di filtro/disambiguazione "Giulio X / Giulio Y"): l'**id resta lo stesso**, il
   cambio si **propaga da solo** ovunque (classifica/storico risolvono per id). Niente identità nuova.
2. **Normalizzazione condivisa OVUNQUE**: tutto il matching per nome usa **`normalizzaNome`** (#4.5),
   così "José" ≡ "jose", "ANNA" ≡ "anna" in **ogni** punto. Allinea i residui che usano `.toLowerCase()`.

## Modello (deciso — non re-inventarlo)
- Identità = `id` stabile per-lega (`NomeGiocatore {id, nome}`); il `nome` è solo etichetta. Rinominare
  = cambiare `nome`, **id invariato** → si propaga ovunque (è già così che funziona il resto).
- **Il "sei tu" NON è un nickname libero**: il tuo nome è **account-level** (→ #8). Quindi il rename è
  **vietato sul record "sei tu"** (`èSeiTu(nome, utente.username)`), come già lo è l'auto-eliminazione (#4.5).
- **Unicità per-lega**: come `aggiungiGiocatore` blocca i nomi duplicati, anche il rename deve **rifiutare**
  un nome che (normalizzato) **collide con un ALTRO** giocatore della stessa lega.

## Deliverable 1 — Azione store `rinominaGiocatore`
In `store/useStore.ts`, accanto a `aggiungiGiocatore`/`eliminaGiocatore`:
```
rinominaGiocatore(legaId: number, idNome: number, nuovoNome: string): string | null
```
- `const n = nuovoNome.trim()`; se vuoto → `'Inserisci un nome'`.
- Lega non trovata → errore stringa (come gli altri).
- Record non trovato → errore.
- **Blocco "sei tu"**: se `èSeiTu(rec.nome, get().utente?.username)` → `'Il tuo nome si cambia dall'account'`
  (niente rename del proprio record).
- **Dedup normalizzato**: se esiste **un altro** record con `normalizzaNome(x.nome) === normalizzaNome(n)`
  (id diverso) → `'Nome già presente'`. (Se coincide con sé stesso a meno di normalizzazione, è ok: stai
  solo ritoccando maiuscole/accenti.)
- Altrimenti `saveLega` con `nomi` aggiornato (solo quel record cambia `nome`; **id e tutto il resto invariati**).
- Ritorna `null` ok.
- (Opzionale, consigliato per il test:) estrai la validazione in un helper **puro**
  `validaRinomina(lega, idNome, n, username)` testabile, e l'azione lo usa.

## Deliverable 2 — UI soprannome in `components/giocatori/TabPartecipanti.tsx`
(Componente **condiviso** lega `/giocatori` + poker `/partecipanti`.)
- Per ogni riga giocatore aggiungi un'azione **modifica** (icona `IconEdit`) → editing **inline** del nome
  (input che sostituisce il `.pr-name`, conferma con Enter/✓, annulla con Esc/✕) **oppure** un piccolo
  `Sheet`. Scegli inline (più semplice, niente nuovo overlay). Su conferma chiama `rinominaGiocatore`;
  se torna errore → `toast(err)`.
- **Niente modifica sul "sei tu"**: per il record dove `èSeiTu` è true, **non** mostrare il tasto modifica
  (come già non mostri il cestino in Personale); opz. un hint "il tuo nome si cambia dall'account".
- Etichetta/UX: chiamalo **"soprannome"** (placeholder/títle), non "rinomina identità".
- Stile via CSS (NO inline). Riusa classi esistenti dove puoi; aggiungi `.pr-edit*` se serve.

## Deliverable 3 — `normalizzaNome` OVUNQUE (allineamento)
Obiettivo: un solo criterio di match nome in tutta l'app.
- **`utils/classifiche.ts` → `statsPersonaCrossContesto`**: oggi usa `.trim().toLowerCase()` (riga ~128/133).
  Sostituisci con **`normalizzaNome`** (così è coerente col gemello `classificaPokerCrossContesto`, già
  normalizzato). **Aggiorna/aggiungi un test**: "José" trovato cercando "jose" (aggregazione cross-contesto).
- **`store/useStore.ts` → dedup di `aggiungiGiocatore`** (riga ~495, `.toLowerCase()`) → `normalizzaNome`
  (coerente con `rinominaGiocatore`).
- **Grep `.toLowerCase()`** in `src/`: allinea a `normalizzaNome` SOLO i match che riguardano **nomi di
  giocatori/identità** (es. nel flusso torneo/partita dove si cerca un giocatore per nome). **Non toccare**
  i `.toLowerCase()` che non c'entrano coi nomi (se ce ne sono): nel dubbio, lascia e segnala nel messaggio finale.
- **Cleanup**: il commento in `utils/storico.ts` cita ancora "StoricoSessioni / la UI vecchia resta com'è"
  (superato dopo #4.7b) → aggiornalo/rimuovilo.

## ⛔ Fuori scope (NON qui)
- Identità reale cross-device / cambio nome dal proprio account → **backend (#8)**.
- Soldi/settlement, `vanillaCompatStorage`, logica poker, classifica/storico (fatte in 4.7a/b).
- Poteri admin (#7.5). Non cambiare la **matematica** del #4.6 (solo il *criterio di confronto nome*).

## Micro-commit suggeriti (1 idea = 1 commit, push dopo ognuno)
1. `feat(4.7c): rinominaGiocatore (store) — dedup normalizzato + blocco sul "sei tu" (+ helper/test)`
2. `feat(4.7c): UI soprannome in TabPartecipanti (edit inline, niente sul "sei tu") + CSS`
3. `feat(4.7c): normalizzaNome ovunque — statsPersonaCrossContesto + dedup aggiungiGiocatore (+ test)`
4. `chore(4.7c): allinea .toLowerCase() residui sui nomi + cleanup commento storico.ts`

## Checklist fine-fase (obbligatoria)
1. `npx tsc -b` verde · `npm run lint` verde · `npm test` verdi (baseline **138**; aggiungi i test del rename/normalizzazione).
2. `git push` (branch `multigioco-4-7c-nickname`).
3. Messaggio finale con micro-step + **cosa testare a browser** (sotto) + elenco degli **`.toLowerCase()`
   eventualmente NON toccati (e perché) + "apri chat di review separata per il merge".
4. **Non** mergiare in `main`.

## Cosa testare nel browser (per il messaggio finale)
- **Giocatori** (lega e/o Personale): modifica il soprannome di un giocatore → il nome cambia **anche**
  in Classifica e Storico (stesso giocatore, id invariato). Provare a rinominarlo come un altro giocatore
  esistente → **bloccato** ("Nome già presente").
- Il record **"sei tu"** non ha il tasto modifica (o è disabilitato con hint).
- **Normalizzazione**: in Classifica globale "La tua situazione", cercando un nome con accenti/maiuscole
  diverse (es. "jose" per "José") i dati **aggregano** lo stesso (match tollerante ovunque).
- Verifica che aggiungere un giocatore con nome che differisce solo per accento/maiuscole da uno esistente
  sia **bloccato** come duplicato.
