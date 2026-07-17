# METRICHE — consumo & tempo (esperimento di processo)

> **Perché**: l'utente confronta due approcci di costruzione via SideKick —
> **questa app (poker) = costruzione COMPLETA + un unico test gigante alla fine**;
> **All for Music = APK incrementale, test a ogni tot passaggi**. Qui traccio, ad ogni fase:
> **TEMPO** (da timestamp git = affidabile) e **VOLUME** (commit, file, test).
> ⚠️ Il conteggio **TOKEN / € esatto** vive nella **dashboard Anthropic dell'utente** (io non ho un
> contatore diretto e affidabile dei token): questo file tiene il **log-lavoro** da appaiare a quel dato.
> Aggiornato a ogni fase dalla chat base.

## R6 — Identità reale (2026-07-01)
| Blocco | Commit | Orario (git) | Durata | Volume |
|--------|--------|--------------|--------|--------|
| R6.1–6.5 codice | `3471d13`→`cc0b360` | 11:59→12:37 | ~38' | 7 commit · +22 test core (163→185) |
| Doc + red team (interno+esterno) | `b919675`→`dbb727b` | 12:38→13:31 | ~53' | 3 commit doc |
| R6 hardening + web + doc | `8f4a988`→`b6fa07d` | ~13:52 | ~15' | migration hardening (RLS privati + trigger footgun) + rimozione `apps/web` (tag `archive/web-frozen`) + doc |
| Infra — CI GitHub Actions | `2c6d02b`→`89827f2` | 13:58→18:31* | ~30' attivi | test + expo export + typecheck **verdi** (1 fix: `:` nello YAML → 0 job) |
| **R6 + infra — totale** | | | **~2h15' attivi** | *il gap 13:58→18:31 è **idle/interruzione**, non lavoro continuo |

## R7 — Sync cross-device (2026-07-01, in corso)
| Blocco | Commit | Durata | Volume |
|--------|--------|--------|--------|
| R7.0 design (ricerca + mappa) | (doc) | — | `R7_SCHEMA.md` (mappa viva) + diagramma ER + scelta relazionale. **Zero codice** (design-first) |
| R7.0 red team (int+est) + v2 | `fcfde6e`→`524fab4` | — | 2 red team (mio + esterno data-engineer) → schema v2 (UUID, movimenti append-only, ospiti, fallback) |
| R7.1 schema SQL | `27dd34a`→`9171787` | — | **13 tabelle** in 3 migration (core/poker/multigioco) + RLS owner-only + trigger updated_at |
| R7.1 applicazione (utente) | dashboard | — | ✅ 3 migration R7 applicate nel SQL Editor **senza errori** → schema validato su Postgres reale (R6 già applicate prima) |
| Audit multi-agente (Fable max) | workflow `wf_79f14eaf` | — | 6 revisori + verifica adversariale per-finding + 4 ricerche online + sintesi |
| Audit — esecuzione | 2 sessioni | 22:32→22:44 (Fable) + 00:34→00:58 (Opus resume) | **67 agenti · 2.638.212 token subagenti · 777 tool call · ~24' run finale**. Sessione Fable: 6 review+4 research+~16 verify → **interrotta (limite contesto 5h piano Max)**; resume Opus: cache al 100% dei completati, rieseguiti solo gli interrotti. Esito: **45 confermati / 11 confutati** → `AUDIT_R6_R7.md` |
| Audit — lezione modelli | — | — | Qualità verifiche Fable≈Opus (A/B naturale su stesso finding: stesso verdetto+prove). Differenza = capacità contesto, non qualità → audit ALTO su Opus, recap su Fable (in metodo) |
| Ricerca modelli/effort | workflow `wf_206d7abe` | ~5' | **5 agenti (4 Sonnet + 1 Opus) · 688.672 token** — verdetto: Sonnet/high per fix scoped, Opus/xhigh per delicato, mai max su task lunghi, ultracode solo audit. → regola nel metodo + dossier in SideKick `esperimenti/ricerca-modelli-effort-2026-07.md` |

## R6-B — Bonifica audit (2026-07-03)
| Blocco | Commit | Modello | Volume |
|--------|--------|---------|--------|
| R6-B1 — 3 fix ALTA | `2e00be7` | **Sonnet 5, effort high** (prima applicazione della regola "modello per passo") | A1 (confirm() rimosso da 6 azioni store, 2 nuovi tipi esito, 4 file UI aggiornati) · A2 (ri-consolidamento premi in apriChiusuraTorneo) · A3 (fix chip Personale) · +1 test nuovo (no-dom-globals). 6 file, +118/-37 righe. 185 core + 1 state verdi, typecheck+export ok |
| R6-B2 — identità alla radice | `bb418b5` | **Sonnet 5, effort high** | M7 (accountId sul creatore + migrazione one-shot `assicuraTuNelleLeghe`) · M5 (3 picker multigioco) · M8 (nuova `reclamaGiocatoreInLega`, fix doppione displayName) · M6/B13 risolti come effetto di M7. 7 file, +119/-17 righe, +8 test core (185→193). Tutto verde |
| R6-B3 — store & auth | `f44b504` | **Sonnet 5, effort high** | M9 (`giocatoreInUso` copre tutti i contenitori) · M10 (niente più posizioni provvisorie persistite) · M11 (reset stato uscita al rientro) · M13 (emailRedirectTo su updateEmail) · B19 (esito discriminato addGiocatoreSessione, 3 chiamanti) · B21 (dirty su migrazione sessioni) · B22 (commento stantio). 5 file, +188/-41 righe, +9 test core (193→202). Tutto verde. **B1+B2+B3 chiusi** — restano B4 (doc) · B5 (SQL) · B6 (test soldi) prima di R7.2 |
| R6-B4 — doc alla realtà | `077e09a` | **Sonnet 5, effort medium** (solo documentazione, nessuna logica da verificare) | M15 (R7_SCHEMA allineato all'SQL reale) · M16 (banner SUPERATO su BACKEND_SPEC) · M17 (README EN+IT) · M18 (CONTESTO: Path/Stack/blocco R6/Comandi/Repo) · B44 (MAPPA_CODICE) · B29 (nota Expo Go). 7 file, +134/-71 righe. Nessun test/typecheck (zero codice). **B1+B2+B3+B4 chiusi** — restano B5 (SQL) · B6 (test soldi) prima di R7.2 |
| R6-B5 — hardening SQL | `f86646a` | **Sonnet 5, effort high** (SQL preciso su Postgres reale, un bug auto-trovato in `format()`) | M14 (ON DELETE SET NULL + query verifica) · B31+B35 (trigger split insert/update, 9 tabelle) · B32 (poker_movimenti append-only vero, RLS split) · B33 (UNIQUE parziale) · B34 (~17 policy con initplan caching + TO authenticated; `private` schema valutato e scartato, documentato) + R-flow (flowType esplicito) + B24 (dedup deep link) + R-mig (comandi `migration repair` documentati, azione utente). 4 file, +253 righe, 1 nuova migration. 202 core + 1 state verdi, typecheck+export puliti. **Migration SCRITTA ma non ancora applicata** (verifica = lettura + Run utente + query M14) — resta solo B6 (test soldi) prima di R7.2 |
| R6-B6 — rete test soldi | `f0412e6` | **Sonnet 5, effort high** (logica soldi, test-first) | M4 (residuoNonAllocato torneo) · B02 (Σpremi==montepremi sempre) · B04 (pagamenti_ricevuti senza gate netto) · B05 (clamp fiche negative) · B07 (sbilancio esposto nel cash) · B08 (guardia add-on in 3 punti) · B06 (calc.test.ts nuovo, 26 test) · B00 (greedy multi-debitore×creditore). 8 file, +383/-22 righe, +29 test core (202→231). Tutto verde, zero regressioni sui 9 scenari §14 SETTLEMENT_SPEC. **🏁 BLOCCO R6-B COMPLETATO (B1→B6)** — resta solo applicare la migration R6-B5 (non urgente) prima del merge in `main` |

> Nota metodo: da qui l'app prosegue **senza test su device** fino alla fase finale (scelta di studio
> registrata in `DECISIONI.md` 2026-07-01 (e)). Il "grande test" a fine costruzione è parte
> dell'esperimento da valutare.

## R7.2 — Layer di sync, prima parte (2026-07-11)
| Blocco | Commit | Modello | Volume |
|--------|--------|---------|--------|
| R7.2 kickoff — verbale + mini-spec | `075903f` | **Sonnet 5, effort high** | 4 decisioni a verbale (storage per-account M12 · LWW per-riga · UUIDv7 · retention tombstone), scope R7.2 (solo funzioni pure) + design proposto (sez. G-L di `R7_SCHEMA.md`). Solo doc |
| R7.2a — generaUid() + uid/syncUpdatedAt | `91ba2c7` | **Sonnet 5, effort high** | UUIDv7 puro test-first (3 test) + campo `uid?`/`syncUpdatedAt?` su 9 tipi + agganciato a TUTTI i punti di creazione reali (5 costruttori core + 4 azioni store + creazione lega mobile). 12 file, +129/-17 righe, +3 test core (231→234). Tutto verde |
| R7.2b (funzioni pure) — storage per-account | `63415ff` | **Sonnet 5, effort high** | `accountStorage.ts`: `chiaveStorage`+`perAccountStorage`(poi rimossa)+`migraBlobUnicoSeNecessario`, 9 test. Nuovo file, +138 righe |
| R7.2b (aggancio boot) — mini-spec con ricerca | `e16c911` | **Sonnet 5, effort high** | Ostacolo serio emerso (tocca il gate auth già indurito) → ricerca online (zustand docs/GitHub, articolo Expo+Supabase+WatermelonDB, PowerSync) prima di ridisegnare: pivot da wrapper custom a `persist.setOptions`+`rehydrate` nativi. Solo doc, +137 righe |
| R7.2b (aggancio boot) — codice | `cd0bf85` | **Sonnet 5, effort high** (boot/auth-adjacent, verificato con cura) | `authUser`/`dbReady`/`clearDbLocale` nello store, `skipHydration`, `authSlice` notifica invece di applicare, orchestratore in `_layout.tsx` (copre boot + cambio-account a caldo). 8 file, +108/-75 righe, -3 test morti (234→231... vedi nota). 234 core + 7 state, tsc+export verdi. **Limite dichiarato**: niente controllo visivo (Expo web non bundlava in questo ambiente) |

> Nota: il conteggio "234 core" resta invariato in R7.2b (i file toccati sono state/mobile, non
> core); i "-3 test" sono i test di `perAccountStorage` rimossi da `accountStorage.test.ts` (state:
> 10→7, compensati dal fatto che non servivano più dopo il pivot a `setOptions`).

| **INTERMEZZO — APK/EAS** (fuori roadmap R7, richiesto dall'utente per testare R7.2b su device) | `a1fd44b`→`de94f40` | **Sonnet 5, effort high** | Account EAS, `eas init`, 2 build Android (prima falliva: env var Supabase mancanti sul cloud — root cause trovata e fissata), `eas update:configure`. Un bug reale in più trovato: `window is not defined` nel pre-render SSR di Expo Router (mai emerso, mai lanciato dal vivo prima), fixato in `lib/supabase.ts`. Vedi `DECISIONI.md` 2026-07-11 |
| R7.2c — modulo sync/, prima parte (merge + leghe/giocatori) | `723e633` | **Sonnet 5, effort high** | `merge.ts` (`mergeLWW` generico + `haCambiamentiLocaliNonSincronizzati`, 9 test) + `mapping.ts` (leghe/giocatori, 12 test). +`lastSyncedAt?`/`deletedAt?` su 9 tipi + `createdByAccountId?` su NomeGiocatore. 7 file, +417 righe, +21 test core (234→255) |
| R7.2c — mapping completo (11 tabelle restanti) | `d44a534` | **Sonnet 5, effort high** | `mappingPoker.ts` (partite_poker/partita_poker_giocatori/settlements/poker_movimenti-solo-pull) + `mappingMultigioco.ts` (serate/sessioni_gioco/partite_gioco) + `mappingPonti.ts` (funzioni generiche per i 4 ponti M:N). 10 file, +877/-24 righe, +52 test sync (255→286). Un bug reale trovato dal typecheck (`PagamentoEffettuato.pagato` vs `Ricarica.pagata`), corretto prima di committare. **R7.2 (a+b+c) COMPLETO** |

## R7.4 — Delta-sync agganciato allo store (2026-07-17)
> Sessione unica **Opus 4.8** (effort xhigh come da metodo: soldi+sync+merge = logica delicata).
> Span git **15:12→18:26** (~3h14' wall) **MA con un gap idle 15:57→17:20 (~1h23', interruzione
> utente, non lavoro)** → **~1h50' attivi**. 17 commit (12 codice + 5 doc) sul branch `rn-r74-sync`.
> Test core **357→405** (+48), state **7→18** (+11). Disciplina di fase: ogni test/gate
> **verificato che sappia fallire** (rotto→rosso→ripristinato); typecheck+expo export verdi a ogni commit.
> Token/€ = **dashboard Anthropic** (questo file: log-lavoro + tempo git).

| Blocco | Commit | Durata (git) | Volume |
|--------|--------|--------------|--------|
| **R7.4a-1** — `nuovoSync()` + uid movimenti + GATE dal vivo | `e6fee54`→`b579457` | 15:12→15:26 (~14') | Cablaggio creazioni: `nuovoSync()` su 17 punti (S4-R7: nascevano con `syncRev` mai valorizzato → invisibili al push) + `conUid()` sui movimenti ledger (S2). **Primo test delle azioni store** (0→gate che pilota lo store vero: creo→dirty→payload senza `battezzaDb`). 357 core, state 7→12 |
| **G1 — bonifica** (trovata dal gate di a1) | `eb005d8`(spec)→`2a4a223`(codice)→`53443fb`(cloud) | 15:26→15:50 (~24') | Il gate multigioco ha scovato che **il cloud non registrava MAI quale gioco** (`sessioni_gioco` aveva solo la FK a `giochi_lega`, mai popolata). Mini-spec `R7_SCHEMA` sez. Q (ricerca BG Stats, causa non trasferibile) → **opzione B, migration #9 `gioco_key`** + mapping riscritto (`sessioneGiocoFromCloudRow` perde `risolviGiocoId`, era anche il buco di R7.4b) + **fixture del gate import allineata alla realtà** (scriveva `giochi:[]` a mano → passava 10/10 mentre l'app si bloccava). **Gate+chaos 18/18 su Postgres reale**; #9 applicata sul cloud (conferma utente). 357→359 core |
| **R7.4a-2** — `touchSync()` sulle mutazioni | `fb07665` | 15:57 | 8 mutazioni di entità salvate (rinomina, salda debiti, chiusure gioco, reclamo accountId); solo la riga che cambia davvero. Le ~40 altre `saveLega` toccano stato live (non-sync). 359→360 core |
| **R7.4a-3** — cancellazioni → tombstone + `soloVive()` | `bd209e4`(filtro)→`c54b241`(semantica) | 17:20→17:31 (~11') | Cambio di **semantica**: `elimina*` da fisico a `deletedAt`+`touchSync` con **cascade** (S4-R4); helper `soloVive()` in **un punto solo** (core `tombstone.ts`, S4-R3) cablato in tutti i calcoli + le viste-rosa. Un bug preso: `idNomi` ha 2 semantiche in `classificaUnificata` (roster vs lookup). 360→367 core. **→ R7.4a COMPLETO** |
| **R7.4b** — pull puro (materializzatori + pegno + ciclo + orfani) | `7c97321`→`6bf59db` | 17:46→18:09 (~23') | b1 9 **materializzatori** (`materializza.ts`, id locale nuovo≠local_id cloud, riga pulita+pegno) · b2 **`mergeConPegno`** (la regola del pegno, "delicata da red-teamare": il pegno del CAS segue sempre il cloud → niente deadlock; property test) · b3 **`applicaPull`** (`pull.ts`, ciclo lega+giocatori+poker, idMap viva P.8.5, tipo `SnapshotCloud`) · b4 multigioco + **orfani ancestor-aware C4**. Pulizia: `tsc -p core` ora pulito (4 type-error di test preesistenti). 367→396 core. **→ R7.4b COMPLETO** |
| **R7.4c-1** — payload push puro + stamp | `9233135` | 18:23 | `push.ts`: `costruisciPayloadPush` (solo righe dirty, `expected_updated_at`=pegno CAS, null=INSERT/presente=UPDATE; movimenti al seguito della gp) + `applicaStampPush` (chiude il contratto O.3/I-R3). Caso soldi: settlement saldato sotto partita pulita = UPDATE mirato. 396→405 core |
| **R7.4a→c1 — totale** | `e6fee54`→`0bc13eb` | **~1h50' attivi** (span 3h14' con ~1h23' idle) | **12 commit codice + 5 doc.** +48 test core, +11 state. Migration **#9** (`gioco_key`) scritta+applicata cloud; **#10** (push) = prossima (c2). File sync nuovi: `materializza.ts`, `pull.ts`, `push.ts`, `tombstone.ts`. **Tutta la parte PURA di R7.4 chiusa** (a+b+c1); resta c2 (RPC+gate DB) · d (orchestratore+adozione DS9) · e (chaos) |

> Nota metodo (osservatorio): a differenza di R6-B/R7.2 (tutte **Sonnet high**), R7.4 è stata fatta
> **interamente Opus** — l'utente ha applicato la regola "Opus xhigh per logica delicata" (soldi+sync+
> merge). Il confronto costo/qualità Sonnet-vs-Opus su fasi delicate è il dato che l'osservatorio può
> appaiare dalla dashboard. G1 è la prova che il **gate che pilota lo store vero** trova bug che le
> fixture scritte a mano (R7.3) mascheravano.
