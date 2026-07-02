# STATO PROGETTO — who's the boss (2026-07-03)

> Formato fisso del metodo: **Fatto** (per area) · **Manca per pubblicare** (Play Store) · **Manca per
> la versione definitiva**. Questo file È il flusso esecutivo fino alla pubblicazione: si aggiorna a
> fine di ogni passo grande. Ordine autorevole = LINEA v3 in `CONTESTO.md`; dettaglio bonifica =
> `AUDIT_R6_R7.md` (checkbox); idee = `IDEE.md`.

## ✅ FATTO (per area)

- **Fondazione**: monorepo pnpm+Turborepo · `core` logica pura (**185 test**) · `state` store condiviso
  (AsyncStorage) · **CI GitHub Actions verde** (test+bundle+typecheck a ogni push) · web archiviata
  (`archive/web-frozen`).
- **App RN completa in locale**: multigioco (sessioni, serate multi-gioco, classifiche, storico,
  giocatori, soprannomi) · poker cash+torneo con **tavolo live** (sedie, cassa, timer per-persona,
  cash-out) · settlement "chi paga chi" + debiti · share resoconto · toast · date-picker.
- **Identità & auth (R6)**: Supabase email+password + conferma email · **username univoco** (DB-enforced,
  case-insensitive) + display name · **deep link** conferma email · **"sei tu" ancorato all'account** ·
  profili privati · trigger anti-footgun · cambio email/password.
- **Backend schema (R7.1)**: **13 tabelle relazionali APPLICATE** (leghe/giocatori-perno/poker/
  movimenti append-only/settlements/multigioco+ponti) · RLS owner-only · updated_at server-side ·
  modello ospiti con gestore (`created_by_account_id`).
- **Processo**: `_processo/` pubblico · DECISIONI/METRICHE/MAPPA · 2 red team + **audit multi-agente
  (67 agenti, 45 finding a registro)** · metodo aggiornato (audit a livelli, modelli per-agente).

## 📦 MANCA PER PUBBLICARE (Play Store) — in ordine di esecuzione

1. **R6-B — Bonifica audit** *(prossimo passo; dettagli+checkbox in `AUDIT_R6_R7.md`)*:
   B1 fix 3 ALTA [S] → B2 identità alla radice [M] → B3 store & auth [S/M] → B4 doc alla realtà [S]
   → B5 hardening SQL + `migration repair` [M] → B6 rete test soldi [M].
2. **R7.2 — Layer di sync** [L]: kickoff = 4 decisioni a verbale (storage per-account M12 · LWW
   per-riga · UUIDv7 · retention tombstone), poi mapping int↔uuid **test-first** + push/pull LWW.
3. **R7.3 — Import one-shot** [M]: backup-first, RPC transazionale, guard `imported_at`, riconciliazione
   soldi con quarantena (fallback F1-F6 di `R7_SCHEMA.md`).
4. **R7.4 — Aggancio store** [S/M]: sync su foreground/background + pull-to-refresh, azioni invariate.
5. **R8 — Ruoli & inviti lega** [L]: `lega_membri` + RLS per-membro (riscrittura policy owner→membership),
   admin multi-livello (nomina/revoca/espelli), inviti, **claim ospiti col consenso del gestore**,
   governance GameBar.
6. **R9 — Realtime** [M/L]: tavolo live multi-device/spettatori (Supabase Realtime). *(Se arrivati qui
   serve accorciare: può slittare post-launch via OTA — si decide allora, non ora.)*
7. **H — Hardening pre-pubblicazione** [M]:
   - **resend email + password dimenticata** (riusa il deep link) [B25]
   - **crash reporting** (Sentry) — obbligatorio prima di utenti veri
   - **SMTP custom** (Resend/Postmark) — il mailer integrato è rate-limitato
   - **privacy policy + ToS** con **URL pubblico** (richiesto dal Play Store) + **data safety form**
   - pulizia B26/B27/B28 + **cancellazione account in-app** (policy Google per app con account;
     lato DB già pronta con R6-B5).
8. **R10 — Rifiniture** [M]: editor livelli torneo manuale · foto lega su Supabase Storage ·
   sfoltire le 6 dep Expo inutilizzate (debito R0.3).
9. **R11 — Feature nuove** [?]: slot aperto (candidata: **analitiche/grafici picco giocatore**, vedi
   IDEE 2026-07-01 — payoff dello schema relazionale).
10. **R12 — Restyle grande** [L]: redesign completo (ipotesi Claude Design) + brand definitivo +
    ergonomia (R-erg1..4, `ERGONOMIA_AUDIT.md`) + seating grafico + vista torneo sul tavolo +
    **i18n EN/FR/ES**.
11. **GRANDE TEST** [M] *(scelta di studio: unico test gigante alla fine — vs All for Music incrementale)*:
    dev build su device reale (R6.V: runtime, signup+unicità, giro email completo) · collaudo con gli
    amici su serate vere · verifica sync 2 device · E2E dei flussi soldi · round di fix.
12. **RP — Pubblicazione Play Store** [M]:
    - account **Google Play Console** ($25 una tantum) + login **EAS** (config `apps/mobile/eas.json` già pronta) — *azioni utente*
    - build produzione **AAB** via EAS Build
    - ⚠️ **account personali nuovi**: Google richiede **closed testing con ≥12 tester per 14 giorni**
      prima dell'accesso a produzione → gli amici del GRANDE TEST *sono* i tester (i due passi si incastrano)
    - store listing: **screenshot** (guida `docs/screenshots/README.md`), descrizione, icona, feature graphic
    - data safety + privacy URL (dal punto 7) → review → **produzione**
    - post-launch: aggiornamenti **OTA via EAS Update** (bugfix/UI senza review).

## 🌟 MANCA PER LA VERSIONE DEFINITIVA (post-launch)

- **Amicizie tra account** (invitare/trovarsi, IDEE) · **cast timer a TV/secondo schermo** (standard
  poker-timer, nord di R5) · spettatori realtime se slittata da R9.
- **Analitiche avanzate** (curva bankroll, picchi, streak — se non entrata in R11) · **catalogo giochi
  globale** cross-lega ("miglior giocatore di Briscola in assoluto").
- **iOS/App Store** (secondo store; EAS già multi-piattaforma) · lingue oltre EN/FR/ES.
- Evoluzioni sync se servono: merge per-campo (se emergono edit concorrenti reali), UUID→v7 se non
  fatto in R7.2, offline "(B) local-first pieno" era già la nostra base — eventuale CRDT solo se
  il multi-writer lo chiede.
- Migrazione soldi a interi-centesimi: **documentata come non necessaria** ai nostri volumi (decisione
  2026-07-01; rivalutare solo con volumi/valute diverse).
