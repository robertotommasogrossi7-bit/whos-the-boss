import { useStore, selectCurrentLega } from '../store/useStore';
import type { Lega } from '@poker/core';

export function useCurrentLega(): Lega | null {
  return useStore(selectCurrentLega);
}
