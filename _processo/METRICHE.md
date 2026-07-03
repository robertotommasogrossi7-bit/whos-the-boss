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
