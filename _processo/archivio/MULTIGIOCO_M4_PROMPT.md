# CARD TRACKER — Fase M4: Classifiche (chat SONNET)

> Riempie le **Classifiche** (oggi gusci, lasciate da M3) leggendo le `sessioniGioco`
> **chiuse** via `calcolaStatsGioco` (M1). Due contesti: **dentro la lega** (classifica
> dei giocatori della lega) e **fuori** (classifica globale **centrata su di te**,
> cross-contesto). Il **poker è INVARIATO** (ha la sua `TabClassifica` sotto `/poker`).
>
> Design deciso con l'utente il 2026-06-04 — vedi `DECISIONI.md`.

## Operativa
Chat di FASE, modello **Sonnet** (design deciso; lavoro = aggregazione + UI). File di
processo in `_processo/`. Leggi PRIMA: `METODO.md` (Desktop); poi `CONTESTO.md`,
`POKER_MAP.md`, **`MULTIGIOCO_SPEC.md` (§5, §7, §8)**, `DESIGN_SPEC.md` (§3 componenti, §8
regole), `DECISIONI.md` (2026-06-04). Working dir: `poker-react/`.

## Scope — cosa FA e cosa NON fa
**FA:**
- **Aggregazione pura + TEST** (Block A): funzioni che aggregano `StatsGiocatore` su più
  contesti e costruiscono le righe di classifica.
- **Classifica di LEGA** (scheda "Classifica" della sezione lega): per gioco, standings dei
  **giocatori della lega** (% vinte/giocate, sessioni vinte), ordinabile, **corona** (glifo
  SVG, non emoji) al leader (SPEC §8).
- **Classifica globale / Personale** (scheda "Classifica" della shell), **centrata sulla
  persona** (default = te), con **filtro gioco** (+ persona):
  - **PRIMA RIGA = totale aggregato** della persona per quel gioco su **Personale + TUTTE le
    leghe** (partite giocate/vinte/%, sessioni): "quanto sei bravo in quel gioco" in assoluto.
  - **Breakdown per contesto** (Personale, Lega A, Lega B, …) **a scomparsa/collassabile** —
    per non sporcare quando le leghe sono tante.
  - **Classifica delle partite "senza lega"** (Personale): standings dei tuoi giochi Personale
    (tu + guest) per quel gioco.
  - **Identità tra leghe = per NOME** (best-effort pre-backend, SPEC §8: stesso nome = stessa
    persona). **Mostra un avviso** UI sul limite (post-backend sarà esatta).

**NON fa (NON sconfinare):**
- **Poker**: invariato (la sua classifica resta `TabClassifica` sotto `/leghe/:id/poker`).
- Modifiche al modello dati o alle azioni M3: **riusa** `sessioniGioco`, `calcolaStatsGioco`,
  `esitoSessione`. Niente nuove migrazioni.
- Soldi / tavolo live → fasi poker-live. UI giochi custom / rebranding → M5.

## Branch
```
git checkout main && git pull && git checkout -b m4
```

## Ordine dei commit (micro-step, push dopo OGNI commit)
> Cut-point dopo il Block A (aggregazione testata): la logica è pronta e recensibile.

### Block A — Aggregazione (PURA + TEST, prima della UI) — `utils/classifiche.ts`
- `sommaStats(a, b): StatsGiocatore` — **somma i conteggi** (sessioni/partite giocate, vinte,
  perse, pareggio) e **RICALCOLA `percVittorie` sui totali**. ⚠️ **MAI mediare le percentuali**
  (errore classico): la % aggregata = `(vinte + pareggiComeVittoria) / giocate * 100` sui totali.
- `classificaGioco(gioco, sessioniChiuse, idNomi[]): RigaClassifica[]` — per ogni `idNome`, le
  sue `StatsGiocatore` (via `calcolaStatsGioco`) su quel set di sessioni; ordinata (es. % poi
  partite giocate); marca il leader.
- `statsPersonaCrossContesto(nome, gioco, leghe[]): { totale: StatsGiocatore, perContesto: [...] }`
  — per ogni lega (Personale inclusa), trova l'`id_nome` con quel **nome** (best-effort) in
  `lega.nomi`, raccoglie le sue `sessioniGioco` **chiuse** del gioco, applica `calcolaStatsGioco`,
  e **somma** col `sommaStats`. Salta i contesti dove il nome non esiste.
- **TEST Vitest** (`classifiche.test.ts`): somma con % **ricalcolata** (non mediata); aggregazione
  cross-contesto su 2-3 leghe + Personale; name-matching (nome assente in una lega → ignorato);
  ordinamento/leader; coerenza coi conteggi di `calcolaStatsGioco`.

### Block B — Classifica di LEGA
- Riempi la scheda **Classifica** della sezione lega (era guscio): selettore gioco (riusa la
  griglia/`GameIcon`), tabella standings dei giocatori della lega, ordinabile, corona al leader.
  Riusa la libreria UI (Card/ListRow/Chip/EmptyState). Tema per gioco.

### Block C — Classifica globale / Personale
- Riempi la scheda **Classifica** della shell (era guscio): **prima riga = totale aggregato**
  della persona (default = te) per il gioco selezionato su Personale + tutte le leghe; sotto, il
  **breakdown per contesto a scomparsa**; più la **classifica Personale** (tu + guest). Filtro
  gioco (+ persona). **Avviso** sul limite identità-per-nome (pre-backend).
- La stessa logica/filtro vale anche per lo **Storico globale** se serve allinearlo (altrimenti
  lascialo com'è da M3).

## Vincoli (DESIGN_SPEC §8 + memoria)
- **% sempre ricalcolata sui totali**, mai mediata. Conteggi sommati con `sommaStats`.
- Niente inline style (eccezione accento root). Niente emoji/loghi: **corona = glifo SVG**.
- Riusa la libreria UI + `GameIcon` di R/M2; mobile-first; **EmptyState** ovunque (nessuna
  classifica vuota lasciata bianca).
- **Poker INTATTO**. `vanillaCompatStorage` intatto. Riusa `calcolaStatsGioco`/`sessioneGioco`
  (non modificarli).

## Checklist fine fase (METODO)
1. `npx tsc -b` · 2. `npm run lint` · 3. `npm test` (i **57** esistenti verdi + i nuovi di
   `classifiche`) · 4. `npm run build` · 5. push dopo OGNI commit.
6. Messaggio finale con **cosa testare nel browser**: dentro una lega → Classifica per gioco
   (ordinamento, corona); fuori → prima riga = totale aggregato su Personale + leghe, breakdown
   per contesto a scomparsa, classifica Personale, filtro gioco/persona, avviso identità; poker
   ancora ok. Verifica una persona presente in più leghe (somma corretta, % ricalcolata).
7. **NON mergiare**: lascia il branch `m4` per la review (chat separata).

## Cosa NON toccare
- Poker (settlement/torneo/timer/store-soldi/overlay) e la sua route/classifica.
- `vanillaCompatStorage`, `calcolaSettlement`, `calcolaSettlementTorneo`.
- `calcolaStatsGioco`, `migrateLega`, `sessioneGioco.ts`, azioni M3 (riusali, non modificarli).
- UI giochi custom / rebranding (M5), soldi/tavolo-live.
