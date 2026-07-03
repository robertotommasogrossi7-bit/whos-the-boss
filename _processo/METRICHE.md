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

> Nota metodo: da qui l'app prosegue **senza test su device** fino alla fase finale (scelta di studio
> registrata in `DECISIONI.md` 2026-07-01 (e)). Il "grande test" a fine costruzione è parte
> dell'esperimento da valutare.
