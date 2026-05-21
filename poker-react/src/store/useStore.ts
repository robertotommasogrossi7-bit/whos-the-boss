import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type {
  Db, Lega, Sessione, SettlementState, SettlementEntrato, SettlementAlloc,
  User, GiocatorePartita, PagamentoEffettuato, PagamentoRicevuto, Partita, Settlement,
} from '../types';
import { computeLive } from '../hooks/useComputeLive';
import { migrateSessione, migratePartita } from '../utils/migrations';
import { nuovoGiocatoreSessione } from '../utils/torneo';
import { calcolaSettlement } from '../utils/settlement';
import { calcolaSettlementTorneo } from '../utils/settlementTorneo';
import type { Trasferimento } from '../types';
import {
  calcolaMontepremi,
  calcolaPremi,
  consolidaPremiSeNecessario,
} from '../utils/calc';

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
  serataView: 'hub' | 'live' | 'setup' | 'chiusura';
  setupPartIds: Set<number>;
  setupModalita: 'cash' | 'torneo';

  // Live session (sub-tab attivo)
  liveSubTab: 'orologio' | 'giocatori' | 'attivi' | 'premi';

  // Torneo
  pendingPrizeNome: number | null;

  // Overlay partita a tutto schermo
  overlayOpen: boolean;

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

  // Overlay
  openOverlay:  () => void;
  closeOverlay: () => void;

  // Serata view
  setSerataView: (v: UiState['serataView']) => void;

  // Setup
  setSetupModalita: (m: 'cash' | 'torneo') => void;
  toggleSetupPartId: (id: number) => void;
  clearSetupPartIds: () => void;
  setNlFoto: (url: string) => void;

  // Serata hub — azioni sessione
  apriSerataAttiva: (legaId: number, bgIdx: number) => void;
  annullaSessione: (legaId: number) => void;
  avviaSessione: (legaId: number, sess: Sessione) => void;

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

  // Cash live — giocatori
  toggleEntrato:             (legaId: number, idNome: number) => void;
  setEntrata:                (legaId: number, idNome: number, val: number) => void;
  setVersato:                (legaId: number, idNome: number, val: number) => void;
  toggleBuyInPagato:         (legaId: number, idNome: number) => void;
  setExtraAmt:               (legaId: number, idNome: number, val: number) => void;
  toggleExtraPagato:         (legaId: number, idNome: number) => void;
  aggiungiRicarica:          (legaId: number, idNome: number, importo: number, pagata: boolean) => void;
  modificaRicarica:          (legaId: number, idNome: number, idx: number, importo: number) => void;
  toggleRicaricaPagata:      (legaId: number, idNome: number, idx: number) => void;
  setSoldiRicevuti:          (legaId: number, idNome: number, val: number) => void;
  aggiornaFiches:            (legaId: number, idNome: number, val: number) => void;
  addGiocatoreSessione:      (legaId: number, nome: string) => string | null;
  rimuoviGiocatoreSessione:  (legaId: number, idNome: number) => void;

  // Torneo live — timer & stato
  avviaTorneo:               (legaId: number) => void;
  pausaTorneo:               (legaId: number) => void;
  riprendiTorneo:            (legaId: number) => void;
  avanzaLivelloAuto:         (legaId: number) => void;
  avanzaLivelloManuale:      (legaId: number) => void;
  stopTorneo:                (legaId: number) => void;
  recoveryTorneo:            (legaId: number) => void;

  // Torneo live — giocatori
  torneoAggiungiGiocatore:   (legaId: number, nome: string) => string | null;
  torneoAddRebuy:            (legaId: number, idNome: number, pagata: boolean) => void;
  torneoAddOn:               (legaId: number, idNome: number, pagato: boolean) => void;
  torneoRevive:              (legaId: number, idNome: number) => void;
  torneoToggleAddOnPag:      (legaId: number, idNome: number) => void;
  torneoToggleRebuyPag:      (legaId: number, idNome: number, idx: number) => void;
  torneoElimina:             (legaId: number, idNome: number) => void;
  confirmaPremio:            (legaId: number, pagato: boolean) => void;

  // Settlement — chiusura serata
  apriChiusura:           (legaId: number) => boolean;
  apriChiusuraTorneo:     (legaId: number) => boolean;
  setAllocazione:         (legaId: number, loserId: number, winnerId: number, amount: number) => void;
  setTrasferimento:       (legaId: number, idx: number, importo: number) => void;
  addTrasferimento:       (legaId: number, t: { from: number; to: number; importo: number }) => void;
  removeTrasferimento:    (legaId: number, idx: number) => void;
  confermaChiusura:       (legaId: number, oraFine: string) => void;
  saldaTuttiDebiti:       (legaId: number) => number;

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
      overlayOpen: false,
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

      /* ── Overlay ── */
      openOverlay:  () => set({ overlayOpen: true }),
      closeOverlay: () => set({ overlayOpen: false }),

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

      /* ── Serata hub ── */
      apriSerataAttiva: (legaId, bgIdx) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return;
        // Sessione già attiva: basta cambiare la vista e aprire l'overlay
        if (bgIdx === -1) {
          set({ serataView: 'live', overlayOpen: true });
          return;
        }
        const serate_bg = [...(lega.serate_bg ?? [])];
        const bg = serate_bg[bgIdx];
        if (!bg) return;
        // Sostituisci bg[bgIdx] con la sessioneAttiva (o rimuovilo se undefined)
        const nuoveBg: Sessione[] = serate_bg.flatMap((s, i) =>
          i === bgIdx
            ? lega.sessioneAttiva ? [lega.sessioneAttiva] : []
            : [s],
        );
        saveLega({ ...lega, sessioneAttiva: bg, serate_bg: nuoveBg });
        set({ serataView: 'live', overlayOpen: true });
      },

      annullaSessione: (legaId) => {
        if (!confirm('Annullare la serata in corso? Tutti i dati saranno persi.')) return;
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return;
        const serate_bg = [...(lega.serate_bg ?? [])];
        const nuovaAttiva = serate_bg.shift();
        saveLega({ ...lega, sessioneAttiva: nuovaAttiva, serate_bg });
        set({ serataView: 'hub', overlayOpen: false, setupPartIds: new Set<number>() });
        get().toast('Serata annullata');
      },

      avviaSessione: (legaId, sess) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return;
        const serate_bg = [...(lega.serate_bg ?? [])];
        if (lega.sessioneAttiva) serate_bg.push(lega.sessioneAttiva);
        saveLega({ ...lega, sessioneAttiva: sess, serate_bg });
        set({
          serataView:   'live',
          liveSubTab:   sess.modalita === 'torneo' ? 'orologio' : 'giocatori',
          setupPartIds: new Set<number>(),
        });
        get().toast('▶ Serata iniziata!');
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

      /* ══════════════════════════════════════════════════════
         LIVE CASH — helper interno
      ══════════════════════════════════════════════════════ */
      /** Aggiorna un singolo GiocatoreSessione nella sessioneAttiva e salva. */
      // (usato solo internamente — non esposto nell'interface)

      /* ── Cash live — giocatori ── */
      toggleEntrato: (legaId, idNome) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const giocatori = sess.giocatori.map(g =>
          g.id_nome === idNome ? { ...g, entrato: !g.entrato } : g,
        );
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
      },

      setEntrata: (legaId, idNome, val) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const v = Math.max(0, Math.round(val * 100) / 100);
        const giocatori = sess.giocatori.map(g =>
          g.id_nome === idNome ? { ...g, entrata: v } : g,
        );
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
      },

      setVersato: (legaId, idNome, val) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const v = Math.max(0, Math.round(val * 100) / 100);
        const giocatori = sess.giocatori.map(g =>
          g.id_nome === idNome ? { ...g, versato: v } : g,
        );
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
      },

      toggleBuyInPagato: (legaId, idNome) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const g = sess.giocatori.find(x => x.id_nome === idNome);
        if (!g?.entrato) { toast('Prima segna il giocatore come entrato'); return; }
        const giocatori = sess.giocatori.map(x =>
          x.id_nome === idNome ? { ...x, buy_in_pagato: !x.buy_in_pagato } : x,
        );
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
      },

      setExtraAmt: (legaId, idNome, val) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const giocatori = sess.giocatori.map(g =>
          g.id_nome === idNome
            ? { ...g, extra_amt: val, extra_pagato: val === 0 ? true : g.extra_pagato }
            : g,
        );
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
      },

      toggleExtraPagato: (legaId, idNome) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const giocatori = sess.giocatori.map(g =>
          g.id_nome === idNome ? { ...g, extra_pagato: !g.extra_pagato } : g,
        );
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
      },

      aggiungiRicarica: (legaId, idNome, importo, pagata) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const giocatori = sess.giocatori.map(g =>
          g.id_nome === idNome
            ? { ...g, ricariche: [...g.ricariche, { importo, pagata }] }
            : g,
        );
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
      },

      modificaRicarica: (legaId, idNome, idx, importo) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const giocatori = sess.giocatori.map(g => {
          if (g.id_nome !== idNome) return g;
          const ricariche = importo === 0
            ? g.ricariche.filter((_, i) => i !== idx)
            : g.ricariche.map((r, i) => i === idx ? { ...r, importo } : r);
          return { ...g, ricariche };
        });
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
      },

      toggleRicaricaPagata: (legaId, idNome, idx) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const giocatori = sess.giocatori.map(g => {
          if (g.id_nome !== idNome) return g;
          const ricariche = g.ricariche.map((r, i) =>
            i === idx ? { ...r, pagata: !r.pagata } : r,
          );
          return { ...g, ricariche };
        });
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
      },

      setSoldiRicevuti: (legaId, idNome, val) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const giocatori = sess.giocatori.map(g =>
          g.id_nome === idNome ? { ...g, soldi_ricevuti: val } : g,
        );
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
      },

      aggiornaFiches: (legaId, idNome, val) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const giocatori = sess.giocatori.map(g =>
          g.id_nome === idNome ? { ...g, fiches_finali: val } : g,
        );
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
      },

      addGiocatoreSessione: (legaId, nome) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return 'Sessione non trovata';
        const sess = lega.sessioneAttiva;
        const inSess = new Set(sess.giocatori.map(g => g.id_nome));
        const n = nome.trim();
        if (!n) return 'Inserisci un nome';
        let nomi = [...lega.nomi];
        let _nid = lega._nid;
        let existing = nomi.find(x => x.nome.toLowerCase() === n.toLowerCase());
        if (existing && inSess.has(existing.id)) { toast('Già nella serata'); return null; }
        if (!existing) {
          existing = { id: _nid++, nome: n };
          nomi = [...nomi, existing];
        }
        const giocatori = [...sess.giocatori, nuovoGiocatoreSessione(existing.id)];
        saveLega({ ...lega, nomi, _nid, sessioneAttiva: { ...sess, giocatori } });
        toast(`✓ ${n} aggiunto alla serata`);
        return null;
      },

      rimuoviGiocatoreSessione: (legaId, idNome) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const g = sess.giocatori.find(x => x.id_nome === idNome);
        if (!g) return;
        if (g.entrato) { toast('Non puoi rimuovere un giocatore già entrato'); return; }
        const giocatori = sess.giocatori.filter(x => x.id_nome !== idNome);
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
      },

      /* ── Torneo live — timer & stato ── */
      avviaTorneo: (legaId) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        if (sess.stato !== 'pre') return;
        const updSess: Sessione = {
          ...sess,
          stato: 'attivo',
          inizio_livello_ms: Date.now() - (sess.trascorso_ms || 0),
          trascorso_ms: 0,
        };
        saveLega({ ...lega, sessioneAttiva: updSess });
        toast('▶ Torneo avviato!');
      },

      pausaTorneo: (legaId) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        if (sess.stato !== 'attivo') return;
        const updSess: Sessione = {
          ...sess,
          stato: 'pausa',
          trascorso_ms: Date.now() - sess.inizio_livello_ms,
        };
        saveLega({ ...lega, sessioneAttiva: updSess });
        toast('⏸ Pausa');
      },

      riprendiTorneo: (legaId) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        if (sess.stato !== 'pausa') return;
        const updSess: Sessione = {
          ...sess,
          stato: 'attivo',
          inizio_livello_ms: Date.now() - (sess.trascorso_ms || 0),
          trascorso_ms: 0,
        };
        saveLega({ ...lega, sessioneAttiva: updSess });
        toast('▶ Ripreso');
      },

      avanzaLivelloAuto: (legaId) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = { ...lega.sessioneAttiva };
        if (sess.stato === 'concluso') return;
        if (sess.livello_corrente + 1 >= sess.livelli.length) {
          sess.stato = 'concluso';
          consolidaPremiSeNecessario(sess);
          saveLega({ ...lega, sessioneAttiva: sess });
          toast('Ultimo livello completato');
          return;
        }
        sess.livello_corrente++;
        sess.inizio_livello_ms = Date.now();
        sess.trascorso_ms = 0;
        consolidaPremiSeNecessario(sess);
        saveLega({ ...lega, sessioneAttiva: sess });
      },

      avanzaLivelloManuale: (legaId) => {
        if (!confirm('Passare al livello successivo?')) return;
        get().avanzaLivelloAuto(legaId);
        get().toast('▶ Livello successivo');
      },

      stopTorneo: (legaId) => {
        if (!confirm('Concludere il torneo? Lo stato verrà bloccato e potrai chiudere la serata.')) return;
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = { ...lega.sessioneAttiva, stato: 'concluso' as const };
        consolidaPremiSeNecessario(sess);
        saveLega({ ...lega, sessioneAttiva: sess });
        toast('⏹ Torneo terminato');
      },

      recoveryTorneo: (legaId) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = { ...lega.sessioneAttiva };
        if (sess.modalita !== 'torneo' || sess.stato !== 'attivo') return;
        let advanced = 0;
        while (sess.livello_corrente < sess.livelli.length) {
          const livello = sess.livelli[sess.livello_corrente];
          if (!livello) break;
          const totaleMs  = livello.durata * 60 * 1000;
          const trascorso = Date.now() - sess.inizio_livello_ms;
          if (trascorso < totaleMs) break;
          sess.livello_corrente++;
          sess.inizio_livello_ms += totaleMs;
          advanced++;
          consolidaPremiSeNecessario(sess);
        }
        if (sess.livello_corrente >= sess.livelli.length) {
          sess.livello_corrente = sess.livelli.length - 1;
          sess.stato = 'concluso';
        }
        if (advanced > 0) saveLega({ ...lega, sessioneAttiva: sess });
      },

      /* ── Torneo live — giocatori ── */
      torneoAggiungiGiocatore: (legaId, nome) => {
        const { db, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return 'Sessione non trovata';
        const sess = lega.sessioneAttiva;
        const gameLvl = sess.livelli
          .slice(0, sess.livello_corrente + 1)
          .filter(l => l.tipo === 'gioco').length;
        if (sess.stato !== 'pre' && gameLvl > sess.late_reg.fino_a_livello) {
          toast('Late reg chiusa — non puoi aggiungere altri giocatori');
          return null;
        }
        const err = get().addGiocatoreSessione(legaId, nome);
        if (err) return err;
        // Rilegge la lega aggiornata per assegnare il posto
        const legaUpd = get().db.leghe.find(l => l.id === legaId);
        if (!legaUpd?.sessioneAttiva) return null;
        const sessUpd = legaUpd.sessioneAttiva;
        const last = sessUpd.giocatori[sessUpd.giocatori.length - 1];
        if (last && !last.seat) {
          const used = new Set(
            sessUpd.giocatori
              .filter(g => g.seat)
              .map(g => `T${g.seat!.tavolo}P${g.seat!.posto}`),
          );
          let numT = sessUpd.num_tavoli || Math.ceil(sessUpd.giocatori.length / 9);
          let assigned = false;
          outer: for (let t = 1; t <= numT + 1; t++) {
            for (let p = 1; p <= 9; p++) {
              if (!used.has(`T${t}P${p}`)) {
                const giocatori = sessUpd.giocatori.map((g, i) =>
                  i === sessUpd.giocatori.length - 1
                    ? { ...g, seat: { tavolo: t, posto: p } }
                    : g,
                );
                numT = Math.max(numT, t);
                get().saveLega({
                  ...legaUpd,
                  sessioneAttiva: { ...sessUpd, giocatori, num_tavoli: numT },
                });
                assigned = true;
                break outer;
              }
            }
          }
          if (!assigned) {
            get().saveLega(legaUpd); // save without seat if no spot found
          }
        }
        return null;
      },

      torneoAddRebuy: (legaId, idNome, pagata) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const g = sess.giocatori.find(x => x.id_nome === idNome);
        if (!g?.entrato) return;
        const gameLvl = sess.livelli
          .slice(0, sess.livello_corrente + 1)
          .filter(l => l.tipo === 'gioco').length;
        if (sess.stato !== 'pre' && gameLvl > sess.late_reg.fino_a_livello) {
          toast('Late reg chiusa'); return;
        }
        const giocatori = sess.giocatori.map(x => {
          if (x.id_nome !== idNome) return x;
          const rebuys = [...(x.rebuys ?? []), { importo: sess.buy_in, pagata }];
          return x.eliminato
            ? { ...x, rebuys, eliminato: false, elim_ts_ms: null, posizione_finale: null }
            : { ...x, rebuys };
        });
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
        toast('✓ Rebuy aggiunto');
      },

      torneoAddOn: (legaId, idNome, pagato) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        if (!sess.add_on?.abilitato) { toast('Add-on non disponibile'); return; }
        const g = sess.giocatori.find(x => x.id_nome === idNome);
        if (!g?.entrato || g.eliminato) return;
        if (g.add_on_fatto) { toast('Add-on già preso'); return; }
        const giocatori = sess.giocatori.map(x =>
          x.id_nome === idNome
            ? { ...x, add_on_fatto: true, add_on_pagato: pagato }
            : x,
        );
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
        toast('✓ Add-on');
      },

      torneoRevive: (legaId, idNome) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const giocatori = sess.giocatori.map(g =>
          g.id_nome === idNome && g.eliminato
            ? { ...g, eliminato: false, elim_ts_ms: null, posizione_finale: null }
            : g,
        );
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
        toast('Reintegrato');
      },

      torneoToggleAddOnPag: (legaId, idNome) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const giocatori = sess.giocatori.map(g =>
          g.id_nome === idNome ? { ...g, add_on_pagato: !g.add_on_pagato } : g,
        );
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
      },

      torneoToggleRebuyPag: (legaId, idNome, idx) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const giocatori = sess.giocatori.map(g => {
          if (g.id_nome !== idNome) return g;
          const rebuys = (g.rebuys ?? []).map((r, i) =>
            i === idx ? { ...r, pagata: !r.pagata } : r,
          );
          return { ...g, rebuys };
        });
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
      },

      torneoElimina: (legaId, idNome) => {
        const { db, saveLega, toast, setPendingPrizeNome } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = { ...lega.sessioneAttiva };
        const g = sess.giocatori.find(x => x.id_nome === idNome);
        if (!g?.entrato || g.eliminato) return;

        // Calcola posizione PRIMA di aggiornare i giocatori
        const viviPrima = sess.giocatori.filter(x => x.entrato && !x.eliminato).length;
        const posizione = viviPrima; // dopo eliminazione: viviPrima-1 + 1 = viviPrima

        // Aggiorna premi se necessario
        if (!sess.premi?.length || !sess.premi_consolidati) {
          const monte = calcolaMontepremi(sess);
          sess.premi = calcolaPremi(monte, sess.giocatori.filter(x => x.entrato).length);
        }

        sess.giocatori = sess.giocatori.map(x =>
          x.id_nome === idNome
            ? { ...x, eliminato: true, elim_ts_ms: Date.now(), posizione_finale: posizione }
            : x,
        );

        const viviDopo = sess.giocatori.filter(x => x.entrato && !x.eliminato).length;

        // Caso "ultimo rimasto = vincitore"
        if (viviDopo === 1) {
          const winner = sess.giocatori.find(x => x.entrato && !x.eliminato);
          if (winner) {
            sess.giocatori = sess.giocatori.map(x =>
              x.id_nome === winner.id_nome ? { ...x, posizione_finale: 1 } : x,
            );
            sess.stato = 'concluso';
            consolidaPremiSeNecessario(sess);
            saveLega({ ...lega, sessioneAttiva: sess });
            const winnerNome = lega.nomi.find(n => n.id === winner.id_nome)?.nome ?? '?';
            toast(`🏆 Vince ${winnerNome}!`);
            const premioWin = sess.premi[0]?.importo ?? 0;
            if (premioWin > 0) setPendingPrizeNome(winner.id_nome);
            return;
          }
        }

        saveLega({ ...lega, sessioneAttiva: sess });
        const premio = sess.premi[posizione - 1]?.importo ?? 0;
        if (premio > 0) {
          setPendingPrizeNome(idNome);
        } else {
          toast(`Eliminato — posizione ${posizione}`);
        }
      },

      confirmaPremio: (legaId, pagato) => {
        const { db, saveLega, pendingPrizeNome, setPendingPrizeNome, toast } = get();
        setPendingPrizeNome(null);
        if (pendingPrizeNome == null) return;
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const giocatori = sess.giocatori.map(g =>
          g.id_nome === pendingPrizeNome ? { ...g, prize_pagato: !!pagato } : g,
        );
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
        toast(pagato ? '✓ Premio segnato come pagato' : '⏱ Premio segnato come da pagare');
      },

      /* ══════════════════════════════════════════════════════
         SETTLEMENT — CHIUSURA SERATA
      ══════════════════════════════════════════════════════ */

      apriChiusura: (legaId) => {
        const { db, toast, setSettlement } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return false;
        const sess = lega.sessioneAttiva;

        const { arr } = computeLive(sess);
        const entrati = arr.filter(c => c.entrato);
        if (entrati.length < 2) {
          toast('Almeno 2 giocatori devono essere entrati');
          return false;
        }

        /* calcolaSettlement §8 */
        const cashResult = calcolaSettlement(entrati.map(c => ({
          id_nome: c.id_nome,
          dovuto:  c.dovuto,
          versato: c.versato,
          fiche:   c.fiches,
        })));

        /* Popola entrati/losers/winners/neutri per ChiusuraTorneo compat */
        const toEnt = (c: typeof entrati[0]): SettlementEntrato => ({
          id_nome: c.id_nome, mancante: c.mancante, netto: c.netto,
          ricaricheTot: c.ricaricheTot, buy_in_pagato: c.buy_in_pagato,
          extra_amt: c.extra_amt, extra_pagato: c.extra_pagato,
          ricariche: c.ricariche, fiches: c.fiches, ricevuti: c.ricevuti,
          contributo_dovuto: 0, contributo_pagato: 0, contributo_residuo: 0,
          premio_dovuto: 0, premio_residuo: 0, posizione_finale: null,
          add_on_fatto: false, add_on_pagato: false, prize_pagato: false,
        });

        setSettlement({
          legaId,
          isTorneo: false,
          sessione: JSON.parse(JSON.stringify(sess)) as Sessione,
          entrati: entrati.map(toEnt),
          losers:  [],
          winners: [],
          neutri:  [],
          allocazioni: {},
          cashResult,
          trasferimentiOverride: undefined,
        });
        set({ serataView: 'chiusura' });
        return true;
      },

      apriChiusuraTorneo: (legaId) => {
        const { db, saveLega, toast, setSettlement } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return false;

        /* Lavoriamo su una copia mutabile della sessione */
        const sess = JSON.parse(JSON.stringify(lega.sessioneAttiva)) as Sessione;
        const entrati = sess.giocatori.filter(g => g.entrato);
        if (entrati.length < 2) {
          toast('Almeno 2 giocatori devono essere entrati');
          return false;
        }

        /* Forza consolidamento premi */
        if (!sess.premi_consolidati) {
          sess.premi = calcolaPremi(calcolaMontepremi(sess), entrati.length);
          sess.premi_consolidati = true;
        }

        /* Assegna posizioni ai vivi */
        const vivi = entrati.filter(g => !g.eliminato);
        if (vivi.length > 1) {
          const n = lega.nomi.find(nm => nm.id === vivi[0]?.id_nome)?.nome ?? '?';
          if (!confirm(
            `Ci sono ancora ${vivi.length} giocatori in gioco.\n\nProcedendo, ${n} verrà assegnato al 1° posto, gli altri a seguire. Vuoi continuare?\n(Puoi prima eliminare i giocatori per scegliere l'ordine corretto).`
          )) return false;
          vivi.forEach((g, i) => { if (!g.posizione_finale) g.posizione_finale = i + 1; });
        } else if (vivi.length === 1 && vivi[0] && !vivi[0].posizione_finale) {
          vivi[0].posizione_finale = 1;
        }
        let nextPos = entrati.length;
        entrati.forEach(g => { if (!g.posizione_finale) g.posizione_finale = nextPos--; });

        /* Salva posizioni aggiornate */
        saveLega({ ...lega, sessioneAttiva: sess });

        /* Costruisci entrati per settlement */
        const arr: SettlementEntrato[] = entrati.map(g => {
          const ricarTot  = (g.rebuys ?? []).reduce((a, r) => a + r.importo, 0);
          const ricarPaid = (g.rebuys ?? []).reduce((a, r) => a + (r.pagata ? r.importo : 0), 0);
          const addOnAmt  = (g.add_on_fatto && sess.add_on) ? sess.add_on.prezzo : 0;
          const addOnPaid = (g.add_on_fatto && g.add_on_pagato) ? (sess.add_on?.prezzo ?? 0) : 0;
          const contributo_dovuto  = sess.buy_in + ricarTot + addOnAmt;
          const contributo_pagato  = (g.buy_in_pagato ? sess.buy_in : 0) + ricarPaid + addOnPaid;
          const contributo_residuo = Math.max(0, Math.round((contributo_dovuto - contributo_pagato) * 100) / 100);
          const premio_dovuto  = (sess.premi ?? []).find(p => p.posizione === g.posizione_finale)?.importo ?? 0;
          const premio_residuo = (!g.prize_pagato && premio_dovuto > 0)
            ? Math.round(premio_dovuto * 100) / 100 : 0;
          return {
            id_nome: g.id_nome,
            mancante: contributo_residuo,
            netto: Math.round((premio_dovuto - contributo_dovuto) * 100) / 100,
            ricaricheTot: ricarTot,
            buy_in_pagato: !!g.buy_in_pagato,
            extra_amt: addOnAmt,
            extra_pagato: !!g.add_on_pagato,
            ricariche: g.rebuys ?? [],
            fiches: premio_dovuto, ricevuti: 0,
            contributo_dovuto, contributo_pagato, contributo_residuo,
            premio_dovuto, premio_residuo,
            posizione_finale: g.posizione_finale ?? null,
            add_on_fatto: !!g.add_on_fatto,
            add_on_pagato: !!g.add_on_pagato,
            prize_pagato: !!g.prize_pagato,
          };
        });

        /* Auto-compensazione (contributo↔premio dello stesso giocatore) +
           allocazione greedy — funzione pura testata in settlementTorneo.ts */
        const { arr: arrComp, losers, winners, neutri, allocazioni } = calcolaSettlementTorneo(arr);

        setSettlement({ legaId, isTorneo: true, sessione: sess, entrati: arrComp, losers, winners, neutri, allocazioni });
        set({ serataView: 'chiusura' });
        return true;
      },

      setAllocazione: (legaId, loserId, winnerId, amount) => {
        const { settlement, setSettlement } = get();
        if (!settlement || settlement.legaId !== legaId) return;
        const v = Math.round(Math.max(0, amount) * 100) / 100;
        const allocs = settlement.allocazioni[loserId] ?? [];
        const idx    = allocs.findIndex(a => a.to === winnerId);
        let newAllocs: SettlementAlloc[];
        if (v <= 0) {
          newAllocs = allocs.filter(a => a.to !== winnerId);
        } else if (idx >= 0) {
          newAllocs = allocs.map((a, i) => i === idx ? { ...a, amount: v } : a);
        } else {
          newAllocs = [...allocs, { to: winnerId, amount: v }];
        }
        setSettlement({
          ...settlement,
          allocazioni: { ...settlement.allocazioni, [loserId]: newAllocs },
        });
      },

      setTrasferimento: (legaId, idx, importo) => {
        const { settlement, setSettlement } = get();
        if (!settlement || settlement.legaId !== legaId) return;
        const v = Math.max(0, Math.round(importo * 100) / 100);
        const current = settlement.trasferimentiOverride ?? settlement.cashResult?.trasferimenti ?? [];
        const next = current.map((t, i) => i === idx ? { ...t, importo: v } : t);
        setSettlement({ ...settlement, trasferimentiOverride: next });
      },

      addTrasferimento: (legaId, t) => {
        const { settlement, setSettlement } = get();
        if (!settlement || settlement.legaId !== legaId) return;
        const current = settlement.trasferimentiOverride ?? settlement.cashResult?.trasferimenti ?? [];
        setSettlement({ ...settlement, trasferimentiOverride: [...current, t] });
      },

      removeTrasferimento: (legaId, idx) => {
        const { settlement, setSettlement } = get();
        if (!settlement || settlement.legaId !== legaId) return;
        const current = settlement.trasferimentiOverride ?? settlement.cashResult?.trasferimenti ?? [];
        setSettlement({ ...settlement, trasferimentiOverride: current.filter((_, i) => i !== idx) });
      },

      saldaTuttiDebiti: (legaId) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return 0;
        let count = 0;
        saveLega({
          ...lega,
          partite: lega.partite.map(p => ({
            ...p,
            settlements: p.settlements.map(s => {
              if (!s.pagato) { count++; return { ...s, pagato: true }; }
              return s;
            }),
          })),
        });
        return count;
      },

      confermaChiusura: (legaId, oraFine) => {
        const { db, saveLega, settlement, setSettlement, toast } = get();
        if (!settlement) return;
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return;

        const sa = { ...settlement.sessione, ora_fine: oraFine || settlement.sessione.ora_fine };

        /* ── CASH nuovo modello ── */
        if (!settlement.isTorneo && settlement.cashResult) {
          const cr = settlement.cashResult;
          const trasf: Trasferimento[] = settlement.trasferimentiOverride ?? cr.trasferimenti;

          /* Check bilanciamento (non bloccante) */
          const sbilancio = Math.abs(cr.giocatori.reduce((a, g) => a + g.netto, 0));
          let warning = '';
          if (sbilancio > 0.01) {
            warning = `Sbilancio globale fiches: €${sbilancio.toFixed(2).replace('.', ',')}\n(le fiches non tornano al totale stake)\n\n`;
          }
          if (warning && !confirm(`${warning}Salvare comunque?`)) return;

          /* Costruisci GiocatorePartita[] */
          const giocatori: GiocatorePartita[] = cr.giocatori.map(gc => {
            const sessG = settlement.sessione.giocatori.find(g => g.id_nome === gc.id_nome);
            const pagamenti_effettuati: PagamentoEffettuato[] = trasf
              .filter(t => t.from === gc.id_nome)
              .map(t => ({ to: t.to, amount: t.importo }));
            const pagamenti_ricevuti: PagamentoRicevuto[] = trasf
              .filter(t => t.to === gc.id_nome)
              .map(t => ({ from: t.from, amount: t.importo }));
            return {
              id_nome:             gc.id_nome,
              entrate:             sessG?.entrata ?? sa.buy_in,
              ricarica_fatta:      sessG ? sessG.ricariche.reduce((a, r) => a + r.importo, 0) : 0,
              extra:               0,
              soldi_ricevuti:      0,
              fiches_finali:       gc.fiche,
              netto_finale:        gc.netto,
              premio:              0,
              vincitore:           false,
              buy_in_pagato:       true,
              extra_pagato:        true,
              ricariche:           sessG?.ricariche ?? [],
              pagamenti_effettuati,
              pagamenti_ricevuti,
              posizione_finale:    null,
              add_on_fatto:        false,
              add_on_pagato:       false,
            };
          });

          /* Vincitore = netto max */
          const maxN = Math.max(...giocatori.map(g => g.netto_finale));
          if (maxN > 0) giocatori.forEach(g => { if (g.netto_finale === maxN) g.vincitore = true; });

          /* Settlements flat = trasferimenti contanti */
          const settlements: Settlement[] = trasf
            .filter(t => t.importo > 0.005)
            .map(t => ({
              from: t.from, to: t.to,
              amount: Math.round(t.importo * 100) / 100,
              pagato: false,
            }));

          const partita: Partita = {
            id: lega._pid, data: sa.data,
            ora_inizio: sa.ora_inizio, ora_fine: sa.ora_fine,
            modalita: sa.modalita, buy_in: sa.buy_in,
            giocatori, settlements,
          };

          const serate_bg   = [...(lega.serate_bg ?? [])];
          const nuovaAttiva = serate_bg.shift();
          saveLega({ ...lega, partite: [...lega.partite, partita], _pid: lega._pid + 1, sessioneAttiva: nuovaAttiva, serate_bg });
          setSettlement(null);
          set({ serataView: 'hub', overlayOpen: false });
          toast('✓ Serata salvata!');
          return;
        }

        /* ── TORNEO (vecchio modello, invariato) ── */
        let warning = '';
        settlement.losers.forEach(l => {
          const allocs = settlement.allocazioni[l.id_nome] ?? [];
          const tot    = allocs.reduce((a, x) => a + x.amount, 0);
          const debito = l.contributo_residuo;
          if (Math.abs(debito - tot) > 0.01) {
            const nome = lega.nomi.find(n => n.id === l.id_nome)?.nome ?? '?';
            warning += `• ${nome}: allocati €${tot.toFixed(2).replace('.', ',')} su €${debito.toFixed(2).replace('.', ',')}\n`;
          }
        });
        if (warning && !confirm(`Allocazioni non bilanciate:\n\n${warning}\nSalvare comunque?`)) return;

        const giocatori: GiocatorePartita[] = settlement.entrati.map(c => {
          const isDebtor = c.contributo_residuo > 0.005;
          const pagamenti_effettuati: PagamentoEffettuato[] = isDebtor
            ? (settlement.allocazioni[c.id_nome] ?? []).map(a => ({ to: a.to, amount: a.amount }))
            : [];
          const pagamenti_ricevuti: PagamentoRicevuto[] = c.netto > 0.005
            ? settlement.losers.flatMap(l =>
                (settlement.allocazioni[l.id_nome] ?? [])
                  .filter(a => a.to === c.id_nome)
                  .map(a => ({ from: l.id_nome, amount: a.amount }))
              )
            : [];
          return {
            id_nome:             c.id_nome,
            entrate:             sa.buy_in,
            ricarica_fatta:      c.ricaricheTot,
            extra:               c.extra_amt,
            soldi_ricevuti:      c.ricevuti,
            fiches_finali:       c.fiches,
            netto_finale:        c.netto,
            premio:              c.premio_dovuto,
            vincitore:           false,
            buy_in_pagato:       c.buy_in_pagato,
            extra_pagato:        c.extra_pagato,
            ricariche:           c.ricariche,
            pagamenti_effettuati,
            pagamenti_ricevuti,
            posizione_finale:    c.posizione_finale,
            add_on_fatto:        c.add_on_fatto,
            add_on_pagato:       c.add_on_pagato,
          };
        });

        const hasPosizioni = giocatori.some(g => g.posizione_finale !== null);
        if (hasPosizioni) {
          giocatori.forEach(g => { if (g.posizione_finale === 1) g.vincitore = true; });
        } else {
          const maxN = Math.max(...giocatori.map(g => g.netto_finale));
          if (maxN > 0) giocatori.forEach(g => { if (g.netto_finale === maxN) g.vincitore = true; });
        }

        const settlements: Settlement[] = [];
        settlement.losers.forEach(l => {
          (settlement.allocazioni[l.id_nome] ?? []).forEach(a => {
            if (a.amount > 0.005 && l.id_nome !== a.to) {
              settlements.push({ from: l.id_nome, to: a.to, amount: Math.round(a.amount * 100) / 100, pagato: false });
            }
          });
        });

        const partita: Partita = {
          id: lega._pid, data: sa.data,
          ora_inizio: sa.ora_inizio, ora_fine: sa.ora_fine,
          modalita: sa.modalita, buy_in: sa.buy_in,
          giocatori, settlements,
        };

        const serate_bg   = [...(lega.serate_bg ?? [])];
        const nuovaAttiva = serate_bg.shift();
        saveLega({ ...lega, partite: [...lega.partite, partita], _pid: lega._pid + 1, sessioneAttiva: nuovaAttiva, serate_bg });
        setSettlement(null);
        set({ serataView: 'hub', overlayOpen: false });
        toast('✓ Serata salvata!');
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
