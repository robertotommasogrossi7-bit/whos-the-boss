import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Db, Lega, Sessione, SettlementState } from '../types';
import { migrateSessione, migratePartita } from '../utils/migrations';

/* ══════════════════════════════════════════════════════
   CHIAVI STORAGE
══════════════════════════════════════════════════════ */
export const STORE_KEY = 'pokerTracker_v2';
export const USER_KEY  = 'pokerTrackerUser_v2';

/* ══════════════════════════════════════════════════════
   TIPI STORE
══════════════════════════════════════════════════════ */

interface UiState {
  // Nuova lega
  nlFoto: string;

  // Serata hub / setup
  serataView: 'hub' | 'live' | 'setup';
  setupPartIds: Set<number>;
  setupModalita: 'cash' | 'torneo';

  // Live session (sub-tab attivo)
  liveSubTab: 'orologio' | 'giocatori' | 'attivi' | 'premi';

  // Torneo
  pendingPrizeNome: number | null;

  // Settlement / chiusura
  settlement: SettlementState | null;

  // Storico
  storicoFrom: string;
  storicoTo: string;
  storicoOpen: Set<number>;

  // Classifica
  classificaFrom: string;
  classificaTo: string;

  // Toast
  toastMsg: string;
  toastVisible: boolean;
}

interface StoreActions {
  // DB
  saveLega: (updated: Lega) => void;
  setCurrentLega: (id: number) => void;
  addLega: (lega: Lega) => void;

  // Auth helpers
  getUser: () => string | null;
  setUser: (nome: string) => void;
  removeUser: () => void;

  // Serata view
  setSerataView: (v: UiState['serataView']) => void;

  // Setup
  setSetupModalita: (m: 'cash' | 'torneo') => void;
  toggleSetupPartId: (id: number) => void;
  clearSetupPartIds: () => void;
  setNlFoto: (url: string) => void;

  // Live sub-tab
  setLiveSubTab: (t: UiState['liveSubTab']) => void;

  // Storico
  setStoricoFrom: (s: string) => void;
  setStoricoTo: (s: string) => void;
  toggleStoricoOpen: (id: number) => void;

  // Classifica
  setClassificaFrom: (s: string) => void;
  setClassificaTo: (s: string) => void;

  // Settlement
  setSettlement: (s: SettlementState | null) => void;

  // Pending prize
  setPendingPrizeNome: (id: number | null) => void;

  // Toast
  toast: (msg: string) => void;

  // Migrations (chiamate all'avvio)
  runMigrations: () => void;
}

type PokerStore = { db: Db } & UiState & StoreActions;

/* ══════════════════════════════════════════════════════
   DB VUOTO
══════════════════════════════════════════════════════ */
function emptyDb(): Db {
  return { leghe: [], _lid: 1, _currentLegaId: undefined };
}

/* ══════════════════════════════════════════════════════
   STORE
══════════════════════════════════════════════════════ */
export const useStore = create<PokerStore>()(
  persist(
    (set, get) => ({
      /* ── Stato DB (persistito) ── */
      db: emptyDb(),

      /* ── Stato UI (NON persistito) ── */
      nlFoto: '',
      serataView: 'hub',
      setupPartIds: new Set<number>(),
      setupModalita: 'cash',
      liveSubTab: 'giocatori',
      pendingPrizeNome: null,
      settlement: null,
      storicoFrom: '',
      storicoTo: '',
      storicoOpen: new Set<number>(),
      classificaFrom: '',
      classificaTo: '',
      toastMsg: '',
      toastVisible: false,

      /* ── Azioni DB ── */
      saveLega: (updated) =>
        set(s => ({
          db: {
            ...s.db,
            leghe: s.db.leghe.map(l => (l.id === updated.id ? updated : l)),
          },
        })),

      setCurrentLega: (id) =>
        set(s => ({ db: { ...s.db, _currentLegaId: id } })),

      addLega: (lega) =>
        set(s => ({
          db: {
            ...s.db,
            leghe: [...s.db.leghe, lega],
            _lid: s.db._lid + 1,
          },
        })),

      /* ── Auth ── */
      getUser: () => sessionStorage.getItem(USER_KEY),
      setUser: (nome) => sessionStorage.setItem(USER_KEY, nome),
      removeUser: () => sessionStorage.removeItem(USER_KEY),

      /* ── Serata view ── */
      setSerataView: (v) => set({ serataView: v }),

      /* ── Setup ── */
      setSetupModalita: (m) => set({ setupModalita: m }),
      toggleSetupPartId: (id) =>
        set(s => {
          const next = new Set(s.setupPartIds);
          if (next.has(id)) next.delete(id); else next.add(id);
          return { setupPartIds: next };
        }),
      clearSetupPartIds: () => set({ setupPartIds: new Set<number>() }),
      setNlFoto: (url) => set({ nlFoto: url }),

      /* ── Live sub-tab ── */
      setLiveSubTab: (t) => set({ liveSubTab: t }),

      /* ── Storico ── */
      setStoricoFrom: (s) => set({ storicoFrom: s }),
      setStoricoTo: (s) => set({ storicoTo: s }),
      toggleStoricoOpen: (id) =>
        set(s => {
          const next = new Set(s.storicoOpen);
          if (next.has(id)) next.delete(id); else next.add(id);
          return { storicoOpen: next };
        }),

      /* ── Classifica ── */
      setClassificaFrom: (s) => set({ classificaFrom: s }),
      setClassificaTo: (s) => set({ classificaTo: s }),

      /* ── Settlement ── */
      setSettlement: (s) => set({ settlement: s }),

      /* ── Pending prize ── */
      setPendingPrizeNome: (id) => set({ pendingPrizeNome: id }),

      /* ── Toast ── */
      toast: (msg) => {
        set({ toastMsg: msg, toastVisible: true });
        setTimeout(() => set({ toastVisible: false }), 2200);
      },

      /* ── Migrations ── */
      runMigrations: () => {
        const { db, saveLega } = get();
        db.leghe.forEach(lega => {
          let dirty = false;
          migrateSessione(lega.sessioneAttiva);
          (lega.serate_bg ?? []).forEach(s => migrateSessione(s));
          (lega.partite ?? []).forEach(p => {
            if (!p.settlements) { migratePartita(p); dirty = true; }
          });
          if (dirty) saveLega(lega);
        });
      },
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Persisti solo il db, non lo stato UI temporaneo
      partialize: (state) => ({ db: state.db }),
    }
  )
);

/* ══════════════════════════════════════════════════════
   SELECTOR HELPER
══════════════════════════════════════════════════════ */
export function selectCurrentLega(s: PokerStore): Lega | null {
  if (s.db._currentLegaId === undefined) return null;
  return s.db.leghe.find(l => l.id === s.db._currentLegaId) ?? null;
}

export function selectSessioneAttiva(s: PokerStore): Sessione | undefined {
  return selectCurrentLega(s)?.sessioneAttiva;
}
