import { useEffect, useState } from 'react';
import type { Sessione } from '@whos-the-boss/core';

/* ══════════════════════════════════════════════════════
   TIMER HOOK — torneo live
   Derivato da ensureTimer/tickTimer/recoveryTimer in session-tournament.js
══════════════════════════════════════════════════════ */

interface TimerResult {
  clockStr:     string;
  residuoMs:    number;
}

/**
 * Gestisce il timer del torneo.
 * - Avvia/ferma setInterval in base a sess.stato
 * - Calcola il clock display
 * - Chiama onLevelExpired quando il livello scade
 * - Chiama onRecovery UNA sola volta al mount (per recuperare i livelli saltati)
 */
export function useTimer(
  sess: Sessione | undefined,
  onLevelExpired: () => void,
  onRecovery: () => void,
): TimerResult {
  const [, setTick] = useState(0);

  /* ── Recovery al mount ── */
  useEffect(() => {
    onRecovery();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Interval tick (1 s) quando attivo ── */
  useEffect(() => {
    if (sess?.stato !== 'attivo') return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [sess?.stato, sess?.livello_corrente, sess?.inizio_livello_ms]);

  /* ── Calcolo residuo ── */
  const livello    = sess?.livelli[sess?.livello_corrente ?? 0];
  const totaleMs   = livello ? livello.durata * 60 * 1000 : 0;
  let   trascorso  = 0;
  if (sess?.stato === 'attivo' && sess.inizio_livello_ms) {
    trascorso = Date.now() - sess.inizio_livello_ms;
  } else if (sess?.stato === 'pausa') {
    trascorso = sess.trascorso_ms || 0;
  }
  const residuoMs = Math.max(0, totaleMs - trascorso);

  /* ── Avanza livello quando scade ── */
  const expired = sess?.stato === 'attivo' && totaleMs > 0 && residuoMs <= 0;
  useEffect(() => {
    if (expired) onLevelExpired();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  /* ── Formatta clock ── */
  const sec = Math.ceil(residuoMs / 1000);
  const m   = Math.floor(sec / 60);
  const r   = sec % 60;
  const clockStr = `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;

  return { clockStr, residuoMs };
}
