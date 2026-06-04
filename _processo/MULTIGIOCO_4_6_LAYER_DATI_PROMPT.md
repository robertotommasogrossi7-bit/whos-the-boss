# FASE #4.6 — Layer-dati classifiche/storico (poker inline + filtri) — PROMPT di fase

> **Chi sei**: chat di fase **Sonnet**. Prima leggi `METODO.md` (Desktop) e `_processo/CONTESTO.md`.
> Poi questo prompt. **Implementi solo questa fase**, micro-commit, push dopo OGNI commit.
> **NON** mergi in `main` (lo fa una chat di review separata).
> Decisioni di riferimento: `DECISIONI.md` **(d)**, **(e)**, **(f)**.

## Obiettivo & filosofia
Costruire il **layer-dati** (solo `utils/`, **funzioni pure + test**) su cui il **#4.7** monterà i
**componenti condivisi** Classifica/Storico. Due risultati:
1. **Poker "inline"**: oggi il poker è escluso dalle classifiche/storico comuni
   (`resolveGiocoLega/Globale` ritornano `null`); qui lo rendiamo disponibile in un **modello-riga
   unificato** che porta anche il **netto €**.
2. **Logica filtri** (gioco + nome) come **funzioni pure**, riusate ovunque dal #4.7.

### ⛔ Vincolo forte: NESSUNA modifica alla UI
**Non toccare** i componenti esistenti (`TabClassifica`, `TabStorico`, `LegaClassifica`,
`ClassificaShell`, `LegaStorico`, `StoricoShell`, `StoricoSessioni`). Questa fase **aggiunge** utils
puri e basta. La duplicazione temporanea con la logica inline di `TabClassifica` è **accettata**: la
assorbe il #4.7 quando rimpiazza quei componenti. (Stesso patto del debito `getNome`.)

## Contesto: i due "mondi" oggi
- **Classifica non-poker** → `utils/classifiche.ts::classificaGioco` su `sessioniGioco` chiuse →
  `StatsGiocatore` (`statsGiochi.ts`: sessioni*/partite*/`percVittorie`, **no soldi**). Ordina per % .
- **Classifica poker** → **inline** in `components/classifica/TabClassifica.tsx`: aggrega `lega.partite`
  → `{partite, vittorie, totaleNetto}`, **ordina per netto desc**. (Da ESTRARRE in puro.)
- **Storico non-poker** → `components/gioco/StoricoSessioni.tsx`: itera `lega.sessioniGioco` (chiuse),
  opz. `giocoId`. Voce = una **`SessioneGioco`**.
- **Storico poker** → `components/storico/TabStorico.tsx`: itera `lega.partite`, filtro per data.
  Voce = una **`Partita`** (cash/torneo).
- **Lacuna nota (d)**: `LegaStorico` non ha filtro-gioco; `StoricoShell` sul poker mostra solo un
  rimando alla schermata dedicata (niente dati inline).

## Deliverable 1 — Modello-riga classifica UNIFICATO + produttori
In `utils/classifiche.ts` (estendi). Proposta di tipi (affina i nomi se serve, mantieni il senso):

```ts
// KPI discriminate per tipo di gioco: 'punti' (giochi: %/vittorie) | 'soldi' (poker: netto)
export type KpiClassifica =
  | { tipo: 'punti'; stats: StatsGiocatore }
  | { tipo: 'soldi'; partiteGiocate: number; partiteVinte: number; percVittorie: number; netto: number };

export interface RigaClassificaU {
  idNome: number;
  nome: string;
  isLeader: boolean;
  kpi: KpiClassifica;
}

export interface ClassificaU {
  tipo: 'punti' | 'soldi'; // come ordinare + quali colonne mostrerà il #4.7
  righe: RigaClassificaU[]; // GIÀ ordinate (netto desc se 'soldi'; %→sessVinte→partite se 'punti')
}
```

Funzioni (pure):
- **`classificaPoker(partite: Partita[], idNomi: {id,nome}[], range?: {from?:string;to?:string}): RigaClassificaU[]`**
  — **estrai** la logica oggi inline in `TabClassifica` (aggrega per `id_nome`: `partite`,
  `vittorie` = `g.vincitore`, `netto` = Σ`g.netto_finale`), `percVittorie = vittorie/partite`
  (arrotondata come altrove), **ordina per netto desc**, `isLeader` = primo con `partiteGiocate>0`.
  KPI `{tipo:'soldi', …}`. Il range data è opzionale (preserva il comportamento del poker).
- **`classificaGiocoU(gioco, sessioniChiuse, idNomi): RigaClassificaU[]`** — wrappa `classificaGioco`
  e mappa ogni riga a `{…, kpi:{tipo:'punti', stats}}` (riusa, non duplicare il calcolo).
- **`classificaUnificata(lega: Lega, giocoId: string): ClassificaU`** — **dispatcher**: se
  `giocoId==='poker'` → `classificaPoker(lega.partite, lega.nomi)` (`tipo:'soldi'`); altrimenti
  risolve il gioco (riusa `resolveGiocoLega`) + `classificaGiocoU` sulle `sessioniGioco` chiuse
  (`tipo:'punti'`). **Questo è il "poker inline" per la lega.**
- **`classificaPokerCrossContesto(nome: string, leghe: Lega[])`** — il poker globale "La tua
  situazione": aggrega `netto/partite/vittorie` su **tutte le leghe** matchando per
  **`normalizzaNome`** (come `statsPersonaCrossContesto`), con `totale` + `perContesto`
  (`{legaId, legaNome, personale, netto, partite, vittorie}`). Salta i contesti senza il nome.

## Deliverable 2 — Voce storico UNIFICATA + produttore
Nuovo file `utils/storico.ts`. Proposta:

```ts
export type VoceStorico =
  | { kind: 'poker'; data: string; partita: Partita }
  | { kind: 'gioco'; data: string; giocoId: string; sessione: SessioneGioco };
```
- **`vociStorico(lega: Lega, opts?: { giocoId?: string; range?: {from?:string;to?:string} }): VoceStorico[]`**
  — unifica e ordina per `data` desc:
  - `giocoId==='poker'` → solo `lega.partite` (kind 'poker').
  - `giocoId` di un gioco → solo `sessioniGioco` chiuse di quel gioco (kind 'gioco').
  - **`giocoId` assente → TUTTO**: poker `partite` + tutte le `sessioniGioco` chiuse, mescolate per
    data (questo copre la lacuna "filtro-gioco assente" di `LegaStorico`, dove ora mostra tutto).
  - `range` opzionale (preserva il filtro-data del poker).
  - ⚠️ Ordinamento per `data` (stringa `YYYY-MM-DD`, confronto lessicografico) desc; i poker usano
    `partita.data`, i giochi `sessione.data`.

## Deliverable 3 — Filtro per NOME (pure; la UI è #4.7)
Riusa **`normalizzaNome`** (creata in #4.5) — **NON** re-implementarla.
- **Classifica (match in cima, NON nasconde)**:
  - `rigaMatchaNome(riga: RigaClassificaU, query: string): boolean` — `normalizzaNome(riga.nome)`
    **contiene** `normalizzaNome(query)` (substring: "giuli" trova "Giulia"). Query vuota → `true`.
  - `ordinaMatchInCima(righe: RigaClassificaU[], query: string): RigaClassificaU[]` — **partizione
    stabile**: prima i match (nel loro ordine), poi i non-match (nel loro ordine). Query vuota → invariato.
- **Storico (filtro secco, rimuove)**:
  - `voceCoinvolgeNome(voce: VoceStorico, query: string, nomeById: (id:number)=>string): boolean` —
    `true` se **un partecipante** della voce matcha (poker: `partita.giocatori[].id_nome`; gioco:
    `sessione.partecipanti` ∪ eventuali `partita.partecipanti`). Query vuota → `true`.
  - `filtraStoricoPerNome(voci, query, nomeById): VoceStorico[]` — tiene solo le voci che matchano.

## Test (obbligatori, pure)
- `classifiche.test.ts` (estendi): `classificaPoker` (aggrega netto/partite/vittorie, ordina per
  netto, leader corretto, range data); `classificaUnificata` (poker→'soldi', gioco→'punti');
  `classificaPokerCrossContesto` (somma su più leghe per nome normalizzato, salta assenti);
  `ordinaMatchInCima` (match in cima, stabile, query vuota = invariato); `rigaMatchaNome` (substring/accenti).
- `storico.test.ts` (nuovo): `vociStorico` (poker-only, gioco-only, **tutto mescolato per data**,
  range); `filtraStoricoPerNome` (poker per `id_nome`, gioco per `partecipanti`, query vuota = tutto).
- Casi-chiave da coprire: netto negativo, pareggi, partita con `partecipanti` override, nomi con
  accenti/maiuscole, lega senza poker / senza sessioniGioco.

## Fuori scope (NON fare qui)
- **Qualsiasi modifica a componenti/UI/CSS** → è il **#4.7** (componenti condivisi, search box, nickname).
- **Soprannome/`rinominaGiocatore`** → #4.7.
- Soldi/settlement, `vanillaCompatStorage`, logica poker di gioco → non si toccano.
- Non rimuovere né modificare `resolveGiocoLega/Globale` esistenti (puoi **riusarle**); l'eventuale
  fusione delle due gemelle è un di-più opzionale, non l'obiettivo.

## Micro-commit suggeriti (1 idea = 1 commit, push dopo ognuno)
1. `feat(4.6): tipi unificati classifica (RigaClassificaU/KpiClassifica/ClassificaU)`
2. `feat(4.6): classificaPoker (estratta da TabClassifica, pura) + test`
3. `feat(4.6): classificaGiocoU + classificaUnificata (dispatcher poker/gioco) + test`
4. `feat(4.6): classificaPokerCrossContesto (poker globale per nome) + test`
5. `feat(4.6): utils/storico.ts — VoceStorico + vociStorico (merge per data) + test`
6. `feat(4.6): filtri per nome — ordinaMatchInCima (classifica) + filtraStoricoPerNome (storico) + test`

## Checklist fine-fase (obbligatoria)
1. `npx tsc -b` verde · `npm run lint` verde · `npm test` tutti verdi (baseline da non far calare: **95**, qui salgono)
2. `git push` (branch `multigioco-4-6-layer-dati`)
3. Messaggio finale all'utente con: micro-step completati + **nota** che la UI non cambia (fase dati;
   verificabile solo via test, non a browser) + "apri chat di review separata per il merge".
4. **Non** mergiare in `main`.

> Nota per la review (chat base): essendo solo utils puri, la verifica è **test + lettura**, non browser.
> Il "si vede" arriva col #4.7.
