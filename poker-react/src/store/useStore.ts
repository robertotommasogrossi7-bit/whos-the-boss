import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { Db, Lega, Sessione, SettlementState, User } from '../types';
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
  // Auth (sessionStorage — non persistito in localStorage)
  utente: User | null;

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

  // Auth — restituisce messaggio di errore o null se OK
  login: (username: string, password: string) => string | null;
  register: (username: string, email: string, password: string) => string | null;
  logout: () => void;

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

  // Giocatori
  aggiungiGiocatore: (legaId: number, nome: string) => string | null;
  eliminaGiocatore: (legaId: number, idNome: number) => string | null;

  // Partite
  eliminaPartita: (legaId: number, partitaId: number) => void;

  // Debiti / settlement
  toggleSettlementPaid: (legaId: number, partitaId: number, idx: number) => void;
  saldaDebito: (legaId: number, partitaId: number, idx: number) => void;
  saldaTuttiDi: (legaId: number, debtorId: number) => number;

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

/* ── Legge l'utente da sessionStorage all'avvio ── */
function readUtente(): User | null {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) ?? 'null') as User | null;
  } catch {
    return null;
  }
}

/* ══════════════════════════════════════════════════════
   STORAGE ADAPTER — retrocompatibile col formato vanilla
   ─────────────────────────────────────────────────────
   La vanilla app salva direttamente: { leghe, _lid, _currentLegaId }
   Zustand persist si aspetta:        { state: { db: {...} }, version }
   Questo adapter rileva il formato vanilla e lo converte al volo,
   senza perdere i dati esistenti.
══════════════════════════════════════════════════════ */
const vanillaCompatStorage: StateStorage = {
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

/* ══════════════════════════════════════════════════════
   STORE
══════════════════════════════════════════════════════ */
export const useStore = create<PokerStore>()(
  persist(
    (set, get) => ({
      /* ── Stato DB (persistito) ── */
      db: emptyDb(),

      /* ── Stato UI (NON persistito) ── */
      utente: readUtente(),
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
      login: (username, password) => {
        const u = username.trim();
        if (!u || !password) return 'Inserisci username e password';
        const utente: User = { username: u };
        sessionStorage.setItem(USER_KEY, JSON.stringify(utente));
        set({ utente });
        return null;
      },

      register: (username, email, password) => {
        const u = username.trim();
        const e = email.trim();
        if (!u || !e || !password) return 'Compila tutti i campi';
        if (password.length < 6)    return 'Password almeno 6 caratteri';
        const utente: User = { username: u, email: e };
        sessionStorage.setItem(USER_KEY, JSON.stringify(utente));
        set({ utente });
        return null;
      },

      logout: () => {
        sessionStorage.removeItem(USER_KEY);
        set({ utente: null });
      },

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
        setTimeout(() => set({ toastVisible: false }), 2700);
      },

      /* ── Giocatori ── */
      aggiungiGiocatore: (legaId, nome) => {
        const n = nome.trim();
        if (!n) return 'Inserisci un nome';
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return 'Lega non trovata';
        if (lega.nomi.some(nm => nm.nome.toLowerCase() === n.toLowerCase()))
          return 'Nome già presente';
        saveLega({
          ...lega,
          nomi: [...lega.nomi, { id: lega._nid, nome: n }],
          _nid: lega._nid + 1,
        });
        return null;
      },

      eliminaGiocatore: (legaId, idNome) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return 'Lega non trovata';
        const inUso = lega.partite.some(p =>
          p.giocatori.some(g => g.id_nome === idNome),
        );
        if (inUso) return 'Il giocatore ha partecipato a partite e non può essere eliminato';
        saveLega({ ...lega, nomi: lega.nomi.filter(nm => nm.id !== idNome) });
        return null;
      },

      /* ── Partite ── */
      eliminaPartita: (legaId, partitaId) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return;
        saveLega({ ...lega, partite: lega.partite.filter(p => p.id !== partitaId) });
      },

      /* ── Debiti ── */
      toggleSettlementPaid: (legaId, partitaId, idx) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return;
        saveLega({
          ...lega,
          partite: lega.partite.map(p => {
            if (p.id !== partitaId) return p;
            return {
              ...p,
              settlements: p.settlements.map((s, i) =>
                i === idx ? { ...s, pagato: !s.pagato } : s,
              ),
            };
          }),
        });
      },

      saldaDebito: (legaId, partitaId, idx) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return;
        saveLega({
          ...lega,
          partite: lega.partite.map(p => {
            if (p.id !== partitaId) return p;
            return {
              ...p,
              settlements: p.settlements.map((s, i) =>
                i === idx ? { ...s, pagato: true } : s,
              ),
            };
          }),
        });
      },

      saldaTuttiDi: (legaId, debtorId) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return 0;
        let count = 0;
        saveLega({
          ...lega,
          partite: lega.partite.map(p => ({
            ...p,
            settlements: p.settlements.map(s => {
              if (s.from === debtorId && !s.pagato) {
                count++;
                return { ...s, pagato: true };
              }
              return s;
            }),
          })),
        });
        return count;
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
      storage: createJSONStorage(() => vanillaCompatStorage),
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
