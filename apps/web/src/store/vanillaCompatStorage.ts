import type { StateStorage } from 'zustand/middleware';

/* ══════════════════════════════════════════════════════
   STORAGE ADAPTER (web) — retrocompatibile col formato vanilla.
   La vanilla app salvava { leghe, _lid, _currentLegaId };
   Zustand persist si aspetta { state: { db }, version }: converte al volo,
   senza perdere i dati esistenti. (Iniettato nello store da useStore.ts.)
══════════════════════════════════════════════════════ */
export const vanillaCompatStorage: StateStorage = {
  getItem: (name) => {
    const raw = localStorage.getItem(name);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      // Già nel formato Zustand
      if (parsed && typeof parsed === 'object' && 'state' in parsed) {
        return raw;
      }
      // Formato vanilla → wrap come Zustand attende
      if (parsed && Array.isArray(parsed.leghe)) {
        const wrapped = {
          state: {
            db: {
              leghe: parsed.leghe,
              _lid: typeof parsed._lid === 'number' ? parsed._lid : 1,
              _currentLegaId: parsed._currentLegaId,
            },
          },
          version: 0,
        };
        return JSON.stringify(wrapped);
      }
      return raw;
    } catch {
      return raw;
    }
  },
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
};
