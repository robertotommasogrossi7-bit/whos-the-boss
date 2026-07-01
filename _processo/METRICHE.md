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
| R7.1 schema SQL | `27dd34a`→`9171787` | — | **13 tabelle** in 3 migration (core/poker/multigioco) + RLS owner-only + trigger updated_at. **Non ancora applicato** (validazione al grande test) |

> Nota metodo: da qui l'app prosegue **senza test su device** fino alla fase finale (scelta di studio
> registrata in `DECISIONI.md` 2026-07-01 (e)). Il "grande test" a fine costruzione è parte
> dell'esperimento da valutare.
