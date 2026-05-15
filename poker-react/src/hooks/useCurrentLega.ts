import { useStore, selectCurrentLega } from '../store/useStore';
import type { Lega } from '../types';

export function useCurrentLega(): Lega | null {
  return useStore(selectCurrentLega);
}
