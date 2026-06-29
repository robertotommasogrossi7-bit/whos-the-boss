import { useStore, selectCurrentLega } from '../store/useStore';
import type { Lega } from '@whos-the-boss/core';

export function useCurrentLega(): Lega | null {
  return useStore(selectCurrentLega);
}
