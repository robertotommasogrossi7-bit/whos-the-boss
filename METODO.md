Prompt per iniziare la chat: "Leggi METODO.md sul desktop e _processo/CONTESTO.md del progetto, sei operativa"

> Tutti i file di processo (CONTESTO, DECISIONI, *_SPEC, *_PROMPT, *_MAP, IDEE) vivono
> nella cartella **`_processo/`** del progetto (gli spenti in `_processo/archivio/`),
> gitignorata. Sulla root del repo resta solo `README.md`. Vedi "Convenzioni file".

# Metodo di lavoro AI — progetti software

## Principi
- Una chat lunga consuma tanti token (l'intera storia viaggia ad ogni risposta). Cambia chat dopo ogni milestone grosso.
- Una "chat base" orchestra; "chat di fase" implementano. Più chat = meno spreco.
- Il sapere del progetto sta nei file, non nelle chat.

## Ruolo della chat base
- **Orchestra**: decide cosa fare, divide in fasi, scrive i prompt per le chat di fase
- **Controlla**: legge i risultati delle chat di fase, verifica, decide se mergiare
- **Aggiorna**: dopo ogni milestone aggiorna `_processo/CONTESTO.md` e gli altri file di processo in modo che la prossima chat base parta già aggiornata; a **fine feature** estrae anche la feature nella **libreria cross-progetto** (vedi "Libreria feature riutilizzabili")
- **Non implementa**: il codice lo scrivono le chat di fase. La chat base pensa, scrive spec, fa review
- Quando si appesantisce → si "passa il testimone" a una chat base nuova, che legge METODO + CONTESTO e riparte

## Setup nuovo progetto
1. Crea cartella progetto, apri chat Opus su quella
2. Crea la sottocartella `_processo/` (+ `_processo/archivio/`) e mettila nel `.gitignore`
3. Discutiamo cosa fare; creiamo `_processo/CONTESTO.md`
4. `CONTESTO.md` contiene: cosa è il progetto, lo stack, il workflow, e i puntatori agli altri file

## Workflow standard
- **Design prima, codice dopo**: per logica delicata (soldi, calcoli, ecc.) → SPEC scritto come contratto
- **Test prima della UI**: funzione pura + Vitest sugli esempi dello spec; verdi prima di proseguire
- **Multi-chat**:
  - Opus: design, review, decisioni delicate
  - Opus o Sonnet: implementazione fase (chat dedicata per ogni fase)
- **Micro-step**: ogni fase divisa in 3-6 commit logici
- **Git**: branch per fase, push DOPO OGNI commit (se i token finiscono, niente è perso)
- **Review separata**: chat di review dopo ogni fase, prima di mergiare in main
- **README/LICENSE** se il repo va pubblico (anche solo "potenzialmente")

## Quando cambiare chat base
- Le risposte rallentano / un singolo prompt brucia >30% dei token orari
- Hai finito un milestone (fase mergeata, spec scritto, decisione presa)
- Hai cambiato direzione e parte del contesto è obsoleto

## Come (ri)avviare una chat base
1. Apri chat Opus sulla cartella del progetto
2. Primo messaggio: "Leggi `METODO.md` (sul desktop) e poi `_processo/CONTESTO.md` del progetto, sei operativa"
3. La chat parte già contestualizzata

## Convenzioni file
**Tutti** i file di processo stanno nella cartella `_processo/` del progetto (così la
root del repo resta pulita: solo codice + `README`). I documenti **spenti** (fasi già
fatte e mergiate) si spostano in `_processo/archivio/` invece di cancellarli — restano
come reference ma non sporcano la lista degli attivi. La cartella `_processo/` è
gitignorata (`/_processo/`): vive solo in locale, è la memoria del progetto.
I riferimenti incrociati tra documenti si scrivono per **nome file** (sono tutti
fratelli dentro `_processo/`), così spostare la cartella non rompe nulla.

- `_processo/CONTESTO.md`: cosa è, dove sta, stack, stato, puntatori. **Si legge per primo.**
- `_processo/DECISIONI.md`: log delle decisioni prese (es. "skippato Tailwind perché obiettivo RN", "settlement: piatto e trasferimenti separati"). Evita di rifare la stessa discussione in chat diverse.
- `_processo/<DOMINIO>_SPEC.md` (es. `SETTLEMENT_SPEC.md`): contratto per logica delicata, con esempi-test
- `_processo/<DOMINIO>_MAP.md` (es. `POKER_MAP.md`): mappa del codice (struttura dati, dove sta cosa)
- `_processo/<FASE>_PROMPT.md` (es. `MULTIGIOCO_M1_PROMPT.md`): piano di una migrazione/grossa fase
- `_processo/IDEE.md`: ragionamenti aperti / feature future non ancora decise
- `_processo/archivio/`: prompt e spec di fasi **già chiuse** (storia, non si toccano)

## Convenzione naming branch
`<area>-<azione>` minuscolo, trattini. Esempi:
- `settlement-cash-v2`, `restructure-overlay`, `react-fase-N`
- Una fase = un branch. Mai mescolare aree diverse nello stesso branch.

## Checklist "fine fase" (obbligatoria prima di chiudere una chat di fase)
1. `npx tsc -b` → verde
2. `npm run lint` → verde
3. `npm test` → tutti verdi (se ci sono test)
4. `git push` dell'ultimo commit
5. Messaggio finale all'utente con:
   - elenco micro-step completati
   - **cosa testare nel browser** (passi precisi, casi limite)
   - indicazione "apri chat di review separata per il merge"
6. Non mergiare mai in main dalla chat che ha implementato

## Libreria feature riutilizzabili (cross-progetto) — STANDARD
A **fine feature** (dopo merge + chiusura doc di progetto), la chat base **estrae la feature**
in una libreria cross-progetto, pensata per riusarla/adattarla in **app diverse**.

- **Dove**: cartella dedicata al **primo livello** di `Desktop/Programmi/` (sorella dei progetti,
  es. di `poker/`) → **`_LIBRERIA_FEATURE/`**. Vive **accanto** ai progetti, non dentro uno.
- **Cosa**: descrizione **testuale** (come i `.md` di processo) — **NIENTE righe di codice**: cosa
  fa, perché, modello concettuale, decisioni prese, casi limite, dipendenze, come si adatta. Deve
  bastare a una chat di un **progetto diverso** per **leggerla e spiegartela**, così da adattarla
  alle esigenze della nuova app (anche molto diversa).
- **Indice + divisione**: un `INDICE.md` + un file per feature, divisi in:
  - `specifiche/` — feature di dominio (es. `multigioco.md`, `tavoli.md`, `cash-settlement.md`).
  - `generali/` — feature trasversali (es. `autenticazione.md`, `ruoli-poteri.md`).
- **Quando**: operazione di **fine feature** (non a ogni commit). La fa la **chat base** nella chiusura.
- **Scopo**: accumulare nel tempo un catalogo di feature "pronte" da pescare per nuovi progetti.
  (Utilità da validare strada facendo — costo basso, potenziale alto.)

## Anti-pattern da evitare
- Lasciare che una chat unica faccia *design + implementazione + review* (= zero indipendenza, zero check)
- Implementare logica di soldi senza test automatici sugli esempi dello spec
- "Aggiusto a caso" — sempre: capisci il modello, scrivi lo spec, poi codice
- Merge in main senza una review esterna alla chat che ha scritto il codice

## Convenzioni commit (storia git pulita, AI dichiarata)
- **AI dichiarata apertamente.** Niente da nascondere: l'uso dell'AI è esplicito (README + questo metodo) ed è parte del valore del progetto. I commit **possono** portare `Co-Authored-By: Claude` per accreditare il lavoro dell'AI (la history vecchia già lo fa).
- Prefisso semantico nel subject (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`) — opzionale ma consigliato.
- Italiano nei messaggi: e' il mio progetto, mi serve da rileggere.
- Subject sotto i 72 char; corpo opzionale ma utile per spiegare il "perche'".

## Cosa mettere nel `.gitignore` di default
File "di processo" che servono alle chat ma non al gioco/app:
- **`/_processo/`** ← la cartella con tutta la memoria AI (CONTESTO, DECISIONI, *_SPEC, *_PROMPT, *_MAP, IDEE, archivio/). Una riga sola e sei a posto.
- `/*.md` + `!/README.md` come rete di sicurezza, se un `.md` finisce per sbaglio nella root
- File di asset Mac/Windows (`.DS_Store`, `Thumbs.db`)
- Cache Python (`__pycache__/`, `*.pyc`)

> Nota: `/_processo/` con lo slash iniziale àncora alla root del repo. `/*.md` ignora solo
> i `.md` della **root**, non quelli dentro le sottocartelle — per questo serve la riga
> `/_processo/` dedicata (altrimenti i file nella cartella resterebbero versionati).

Sul GitHub pubblico devono apparire solo: codice, `README.md`, `LICENSE`, `requirements.txt`/`package.json`, asset (immagini/disegni).

## Quando la chat base e' costretta a implementare
Capita: a volte spezzare in una chat di fase costa piu' tempo del lavoro stesso (es. 3-4 micro-fix coordinati su file gia' aperti).
- OK procedere, **a patto di mantenere i micro-commit** chirurgici (1 idea = 1 commit), `python -m py_compile` o test rapido tra un commit e l'altro.
- Aggiornare i `.md` di processo **prima** di chiudere la chat, cosi' una nuova chat puo' subentrare senza perdere contesto.
