/* ══════════════════════════════════════════════════════
   UID — identità cloud client-side (R7.2, sync)
   ─────────────────────────────────────────────────────
   generaUid() produce un UUIDv7: 48 bit di timestamp Unix (ms) +
   version nibble '7' + variant nibble + resto random (RFC 9562).
   Ordinabile per tempo di creazione → indici B-tree Postgres compatti
   (deciso vs v4, R7_SCHEMA.md sez. G3). Generato al momento della
   creazione su QUALSIASI device, così due device non generano mai lo
   stesso uid (R7_SCHEMA.md sez. A1) — è la chiave di upsert del sync.
   Niente dipendenza esterna (Math.random basta: qui serve unicità,
   non imprevedibilità crittografica — non è un token di sicurezza).
══════════════════════════════════════════════════════ */

function randomHex(nDigits: number): string {
  let s = '';
  while (s.length < nDigits) s += Math.floor(Math.random() * 16).toString(16);
  return s.slice(0, nDigits);
}

/** UUIDv7 pura. Vedi commento di modulo per il razionale. */
export function generaUid(): string {
  const ts = Date.now().toString(16).padStart(12, '0').slice(-12);
  const randA = randomHex(3);
  const variant = ((Math.floor(Math.random() * 4) + 8)).toString(16); // 8/9/a/b
  const randB = randomHex(15);
  return (
    `${ts.slice(0, 8)}-${ts.slice(8, 12)}-7${randA}-${variant}${randB.slice(0, 3)}-${randB.slice(3, 15)}`
  );
}
