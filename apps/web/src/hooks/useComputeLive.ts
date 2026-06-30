import { useMemo } from 'react';
import { computeLive } from '@whos-the-boss/core';
import type { LiveGiocatore, LiveResult, Sessione } from '@whos-the-boss/core';

/* computeLive (pura) ora vive in @whos-the-boss/core. Qui resta il solo hook
   (wrapper memoizzato per i componenti). Re-export per compatibilità con gli
   import esistenti (`from '../hooks/useComputeLive'`). */
export { computeLive };
export type { LiveGiocatore, LiveResult };

/** Hook — memoized wrapper di computeLive. */
export function useComputeLive(sess: Sessione | undefined): LiveResult {
  return useMemo(() => computeLive(sess), [sess]);
}
