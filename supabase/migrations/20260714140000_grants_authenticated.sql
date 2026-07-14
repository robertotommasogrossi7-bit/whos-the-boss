-- ════════════════════════════════════════════════════════════════════════
-- R7.2d-5 — GRANT espliciti per `authenticated` (portabilità schema-as-code)
-- ─────────────────────────────────────────────────────────────────────────
-- Scoperto dal GATE su DB reale (Supabase CLI locale, 2026-07-14): le tabelle
-- R6/R7 si affidavano ai grant di DEFAULT di Supabase — presenti sul progetto
-- cloud, ASSENTI in un ambiente ricreato da zero → `permission denied for
-- table leghe` per il ruolo authenticated (privilegi Dxtm ma non a/r/w/d).
-- Qui li rendiamo ESPLICITI, così lo schema è riproducibile (locale + CI).
--
-- La RLS (owner-only) resta il filtro di RIGA; questi GRANT abilitano solo
-- l'ACCESSO alla tabella per il ruolo authenticated. `anon` NON è incluso
-- (l'app è login-required); `service_role` non serve al client.
-- Idempotente e additiva → sicura anche sul cloud (ri-concede ciò che già c'è).
-- ════════════════════════════════════════════════════════════════════════

grant usage on schema public to authenticated;

-- tabelle ESISTENTI
grant select, insert, update, delete on all tables in schema public to authenticated;

-- tabelle FUTURE create da postgres in public (es. R8) ereditano il grant
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
