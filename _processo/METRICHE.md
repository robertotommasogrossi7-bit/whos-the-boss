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
| R6 hardening + cancellazione web | (questo passo) | 13:31→… | … | migration hardening + rimozione `apps/web` |
| **R6 — totale finora** | | 11:59→… | **~1h30'+** | |

> Nota metodo: da qui l'app prosegue **senza test su device** fino alla fase finale (scelta di studio
> registrata in `DECISIONI.md` 2026-07-01 (e)). Il "grande test" a fine costruzione è parte
> dell'esperimento da valutare.
