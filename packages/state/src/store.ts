import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type {
  Db, Lega, Sessione, SettlementState, SettlementEntrato, SettlementAlloc,
  User, GiocatorePartita, PagamentoEffettuato, PagamentoRicevuto, Partita, Settlement,
} from '@whos-the-boss/core';
import { computeLive } from '@whos-the-boss/core';
import { migrateSessione, migratePartita, migrateLega } from '@whos-the-boss/core';
import {
  nuovaSessioneGioco, nuovaPartitaGioco, prossimoIdPartita,
  type EsitoPartitaInput,
} from '@whos-the-boss/core';
import { creaLegaPersonale, assicuraGiocatorePersonale, idBloccatiInclusi, reclamaGiocatoreInLega } from '@whos-the-boss/core';
import { èSeiTuRecord, normalizzaNome } from '@whos-the-boss/core';
import { validaRinomina, giocatoreInUso } from '@whos-the-boss/core';
import { nuovoGiocatoreSessione } from '@whos-the-boss/core';
import { assegnaPostoIngresso, riequilibraTavoli, tavoliNecessari } from '@whos-the-boss/core';
import { nowHHMM } from '@whos-the-boss/core';
import { conUid, nuovoSync, touchSync } from '@whos-the-boss/core';
import { tombstona, tombstonaPartita, tombstonaSessioneGioco } from '@whos-the-boss/core';
import { calcolaSettlement } from '@whos-the-boss/core';
import { calcolaSettlementTorneo } from '@whos-the-boss/core';
import type { Trasferimento } from '@whos-the-boss/core';
import {
  calcolaMontepremi,
  calcolaPremi,
  consolidaPremiSeNecessario,
} from '@whos-the-boss/core';

/* ══════════════════════════════════════════════════════
   CHIAVI STORAGE
══════════════════════════════════════════════════════ */
export const STORE_KEY = 'pokerTracker_v2';

/* ══════════════════════════════════════════════════════
   TIPI STORE
══════════════════════════════════════════════════════ */

interface UiState {
  // Auth (Supabase) — non persistito in localStorage (la sessione la gestisce il SDK)
  utente: User | null;
  authLoading: boolean;   // true finché la sessione non è ripristinata al boot
  // R7.2b (storage per-account): identità GREZZA appena risolta da Supabase,
  // aggiornata ad ogni evento auth. Distinta da `utente` (che diventa "pronto"
  // solo DOPO che l'orchestratore ha ri-idratato lo storage dell'account —
  // vedi R7_SCHEMA.md sez. M). Non persistita.
  authUser: User | null;
  // true quando lo storage locale è quello giusto per `authUser` corrente
  // (ri-idratato o azzerato). Il gate UI aspetta authLoading E dbReady.
  dbReady: boolean;

  // Nuova lega
  nlFoto: string;

  // Serata hub / setup
  serataView: 'hub' | 'live' | 'setup' | 'chiusura';
  setupPartIds: Set<number>;
  setupModalita: 'cash' | 'torneo';
  setupEditing: boolean; // true = sto modificando una serata 'pre' esistente

  // Live session (sub-tab attivo)
  liveSubTab: 'orologio' | 'tavolo' | 'giocatori' | 'attivi' | 'premi';

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

  // GameBar / filtro gioco globale (persistito) — Card Tracker §5
  giocoFiltro: string;       // id gioco selezionato (catalogo), default 'poker'
  gameBarVisible: boolean;   // mostra/nascondi la barra (impostazione)
  gameBarPinned: boolean;    // gioco "fisso" (pin) — predisposizione
}

/* Esiti espliciti per le azioni "chiusura torneo" (R6-B1/A1): lo store è puro,
   niente `confirm()` browser-global (crasha su RN/Hermes). Quando serve una
   conferma dell'utente, l'azione ritorna un esito che descrive COSA chiedere;
   la UI mostra l'Alert nativo e, se confermato, richiama l'azione con `force`. */
export type EsitoChiusuraTorneo =
  | { ok: true }
  | { ok: false; motivo: 'sessione-assente' | 'pochi-giocatori' }
  | { ok: false; motivo: 'vivi-multipli'; count: number; primoNome: string };

export type EsitoConfermaChiusura =
  | { ok: true }
  | { ok: false; motivo: 'nessun-settlement' | 'lega-assente' }
  | { ok: false; motivo: 'warning'; messaggio: string };

/* Esito esplicito di addGiocatoreSessione (R6-B3/B19): prima ritornava
   `string | null`, con `null` sia per "aggiunto" sia per "già nella serata"
   (già toastato) — indistinguibili per chi chiama. `torneoAggiungiGiocatore`
   ne approfittava per leggere "l'ultimo giocatore dell'array" e assegnargli
   un posto: su un no-op (già in sessione) poteva assegnare il seat a un
   giocatore SBAGLIATO. Ora l'esito porta sempre l'`idNome` esatto. */
export type EsitoAggiungiGiocatoreSessione =
  | { ok: true; idNome: number }
  | { ok: false; motivo: 'gia-in-sessione' }
  | { ok: false; motivo: 'errore'; messaggio: string };

interface StoreActions {
  // DB
  saveLega: (updated: Lega) => void;
  setCurrentLega: (id: number) => void;
  addLega: (lega: Lega) => void;

  // Auth (Supabase) — async; ritorna messaggio d'errore o null se OK
  login: (email: string, password: string) => Promise<string | null>;
  register: (username: string, email: string, password: string, displayName?: string) => Promise<string | null>;
  logout: () => Promise<void>;
  // Cambio credenziali (R2.6) — richiedono la vecchia password come verifica
  updatePassword: (currentPassword: string, newPassword: string) => Promise<string | null>;
  updateEmail: (currentPassword: string, newEmail: string) => Promise<string | null>;
  initAuth: () => void;   // ripristina la sessione al boot + sottoscrive i cambi di stato
  applyUtente: (user: User | null) => void;   // setta utente + aggancia "sei tu" (puro)
  setAuthLoading: (loading: boolean) => void;
  // R7.2b: setter dell'identità grezza (chiamato da initAuth al posto di
  // applyUtente — l'orchestratore in _layout.tsx decide QUANDO applicarla,
  // dopo lo storage swap).
  setAuthUser: (user: User | null) => void;
  setDbReady: (ready: boolean) => void;
  clearDbLocale: () => void;   // logout: niente storage da leggere, azzera e basta
  /** Rimpiazza l'INTERO db locale. Riservata all'import one-shot (R7.3), che
      lo riscrive due volte: col battesimo degli uid e con lo stamp post-import.
      Non usarla dalle azioni di dominio (quelle mutano il pezzo che toccano). */
  sostituisciDb: (db: Db) => void;

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
  iniziaOra: (legaId: number) => void;
  modificaSetup: (legaId: number) => void;
  aggiornaSetupSerata: (legaId: number, sess: Sessione) => void;

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

  // GameBar / filtro gioco
  setGiocoFiltro: (id: string) => void;
  setGameBarVisible: (v: boolean) => void;
  setGameBarPinned: (v: boolean) => void;

  // Giocatori
  aggiungiGiocatore: (legaId: number, nome: string) => string | null;
  eliminaGiocatore: (legaId: number, idNome: number) => string | null;
  rinominaGiocatore: (legaId: number, idNome: number, nuovoNome: string) => string | null;

  // Partite
  eliminaPartita: (legaId: number, partitaId: number) => void;

  // Debiti / settlement
  toggleSettlementPaid: (legaId: number, partitaId: number, idx: number) => void;
  saldaDebito: (legaId: number, partitaId: number, idx: number) => void;
  saldaTuttiDi: (legaId: number, debtorId?: number) => number;

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
  aggiornaFiches:            (legaId: number, idNome: number, val: number) => void;
  addGiocatoreSessione:      (legaId: number, nome: string) => EsitoAggiungiGiocatoreSessione;
  rimuoviGiocatoreSessione:  (legaId: number, idNome: number) => void;
  spostaGiocatore:           (legaId: number, idNome: number, tavolo: number, posto: number) => void;
  riequilibraSeat:           (legaId: number) => void;
  aggiungiEFaiEntrare:       (legaId: number, nome: string) => void;
  // R5 (tavolo live): esce dal tavolo a metà con `valore` (fiche cash / premio torneo)
  esceDalTavolo:             (legaId: number, idNome: number, valore: number) => void;

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
  apriChiusuraTorneo:     (legaId: number, forzaVivi?: boolean) => EsitoChiusuraTorneo;
  setAllocazione:         (legaId: number, loserId: number, winnerId: number, amount: number) => void;
  setTrasferimento:       (legaId: number, idx: number, importo: number) => void;
  addTrasferimento:       (legaId: number, t: { from: number; to: number; importo: number }) => void;
  removeTrasferimento:    (legaId: number, idx: number) => void;
  confermaChiusura:       (legaId: number, oraFine: string, force?: boolean) => EsitoConfermaChiusura;

  // Sessioni gioco (multigioco non-poker, M3) — su lega.sessioniGioco
  // `serataId` opzionale (R4): lega la sessione a una serata multi-gioco.
  creaSessioneGioco:    (legaId: number, giocoId: string, partecipanti: number[], data: string, ora: string, serataId?: number) => number | null;
  avviaSessioneGioco:   (legaId: number, sessId: number) => void;
  aggiungiPartita:      (legaId: number, sessId: number) => number | null;
  chiudiPartita:        (legaId: number, sessId: number, partitaId: number, esito: EsitoPartitaInput) => void;
  annullaPartita:       (legaId: number, sessId: number, partitaId: number) => void;
  chiudiSessioneGioco:  (legaId: number, sessId: number, esitoPareggio: boolean) => void;
  eliminaSessioneGioco: (legaId: number, sessId: number) => void;

  // Serate multi-gioco (R4) — su lega.serate; raggruppano le sessioniGioco via serataId
  creaSerata:           (legaId: number, partecipanti: number[], data: string) => number | null;
  eliminaSerata:        (legaId: number, serataId: number) => void;

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

function sessioneTorneoAttiva(sess: Sessione): Sessione {
  return { ...sess, stato: 'attivo',
    inizio_livello_ms: Date.now() - (sess.trascorso_ms || 0), trascorso_ms: 0 };
}

/* mapAuthError vive in apps/mobile/src/store/authSlice.ts (logica Supabase). */

/* ── #4.5/R6: assicura che l'utente loggato sia un giocatore reale del Personale,
   ancorato all'account (accountId). Chiamata a login/register riusciti. Difensiva:
   se il Personale non esiste ancora (runMigrations lo crea al boot) salta. ── */
function assicuraTuNelPersonale(db: Db, saveLega: (l: Lega) => void, user: User): void {
  const personale = db.leghe.find(l => l.personale);
  if (!personale) return;
  const aggiornata = assicuraGiocatorePersonale(personale, user);
  if (aggiornata !== personale) saveLega(aggiornata);
}

/* ── R6-B2/M7: migrazione one-shot — nelle leghe NORMALI (non Personale) create
   prima di R6.5, il creatore/i partecipanti erano record "liberi" (nome per
   nome, nessun accountId). Al login li reclama per nome (solo reclama, MAI
   crea: a differenza del Personale non ha senso aggiungerti a una lega dove
   non compari già). Chiamata a ogni applyUtente: idempotente, costa poco
   (early-return per-lega se già reclamata o già migrata da R6.5+). ── */
function assicuraTuNelleLeghe(db: Db, saveLega: (l: Lega) => void, user: User): void {
  for (const lega of db.leghe) {
    if (lega.personale) continue; // il Personale lo gestisce assicuraTuNelPersonale
    const aggiornata = reclamaGiocatoreInLega(lega, user);
    if (aggiornata !== lega) saveLega(aggiornata);
  }
}

/* Storage iniettato da createAppStore: web = localStorage retrocompat
   (vanillaCompatStorage.ts), mobile = AsyncStorage (R1.4+). */

/* ══════════════════════════════════════════════════════
   STORE
══════════════════════════════════════════════════════ */
/* Slice auth iniettabile dall'app (web = Supabase, mobile = stub/R2). */
export type AuthSlice = Pick<StoreActions, 'initAuth' | 'login' | 'register' | 'logout' | 'updatePassword' | 'updateEmail'>;
export type AuthInjector = (get: () => PokerStore) => Partial<AuthSlice>;

export interface AppStoreDeps {
  storage: StateStorage;
  auth?: AuthInjector;
}

/* Factory: lo store condiviso, con storage e auth iniettati per piattaforma. */
export function createAppStore({ storage, auth }: AppStoreDeps) {
  return create<PokerStore>()(
    persist(
      (set, get) => ({
      /* ── Stato DB (persistito) ── */
      db: emptyDb(),

      /* ── Stato UI (NON persistito) ── */
      utente: null,
      authLoading: true,
      authUser: null,
      dbReady: false,
      nlFoto: '',
      overlayOpen: false,
      serataView: 'hub',
      setupPartIds: new Set<number>(),
      setupModalita: 'cash',
      setupEditing: false,
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
      giocoFiltro: 'poker',
      gameBarVisible: true,
      gameBarPinned: false,

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

      /* ── Auth — stato + applyUtente PURI; le azioni Supabase sono iniettate
         dall'app (web) come slice. Default no-op: il mobile parte senza auth (R2). ── */
      applyUtente: (user) => {
        set({ utente: user });
        // #4.5: aggancia "te" come giocatore reale del Personale
        if (user) assicuraTuNelPersonale(get().db, get().saveLega, user);
        // R6-B2/M7: migrazione one-shot — reclama il tuo record nelle leghe
        // normali create prima di R6.5 (creatore senza accountId)
        if (user) assicuraTuNelleLeghe(get().db, get().saveLega, user);
      },
      setAuthLoading: (loading) => set({ authLoading: loading }),
      setAuthUser: (user) => set({ authUser: user }),
      setDbReady: (ready) => set({ dbReady: ready }),
      clearDbLocale: () => set({ db: emptyDb() }),
      sostituisciDb: (db) => set({ db }),
      initAuth: () => set({ authLoading: false }),
      login: async () => null,
      register: async () => null,
      logout: async () => {},
      updatePassword: async () => null,
      updateEmail: async () => null,

      /* ── Overlay ── */
      openOverlay:  () => set({ overlayOpen: true }),
      closeOverlay: () => set({ overlayOpen: false, setupEditing: false }),

      /* ── Serata view ── */
      setSerataView: (v) => set({ serataView: v }),

      /* ── Setup ── */
      setSetupModalita: (m) => set({ setupModalita: m }),
      toggleSetupPartId: (id) =>
        set(s => {
          // #4.5: l'id "sei tu" nel Personale è bloccato-incluso → toggle no-op
          const lega = s.db.leghe.find(l => l.id === s.db._currentLegaId);
          if (lega && idBloccatiInclusi(lega, s.utente?.id).includes(id)) return s;
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

      /* ── GameBar / filtro gioco (Card Tracker §5) ── */
      setGiocoFiltro:    (id) => set({ giocoFiltro: id }),
      setGameBarVisible: (v)  => set({ gameBarVisible: v }),
      setGameBarPinned:  (v)  => set({ gameBarPinned: v }),

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

      // La conferma "sei sicuro" la fa la UI (Alert.alert) PRIMA di chiamare
      // questa azione (LiveCash/LiveTorneo): lo store resta puro, niente
      // confirm() browser-global (A1 — crashava su RN/Hermes).
      annullaSessione: (legaId) => {
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
          liveSubTab:   sess.modalita === 'torneo' ? 'orologio' : 'tavolo',
          setupPartIds: new Set<number>(),
          setupEditing: false,
        });
        get().toast('Serata iniziata!');
      },

      iniziaOra: (legaId) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const aggiornata: Sessione = sess.modalita === 'torneo'
          ? { ...sessioneTorneoAttiva(sess), ora_inizio: nowHHMM() }
          : { ...sess, stato: 'attivo', ora_inizio: nowHHMM() };
        saveLega({ ...lega, sessioneAttiva: aggiornata });
        set({ serataView: 'live', liveSubTab: sess.modalita === 'torneo' ? 'orologio' : 'giocatori' });
        get().toast('Serata iniziata!');
      },

      modificaSetup: (legaId) => {
        const { db } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        set({
          serataView: 'setup',
          setupEditing: true,
          setupModalita: sess.modalita,
          setupPartIds: new Set<number>(sess.giocatori.map(g => g.id_nome)),
        });
      },

      aggiornaSetupSerata: (legaId, sess) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return;
        saveLega({ ...lega, sessioneAttiva: sess });
        set({ serataView: 'live', setupEditing: false, setupPartIds: new Set<number>() });
        get().toast('Impostazioni aggiornate');
      },

      /* ── Giocatori ── */
      aggiungiGiocatore: (legaId, nome) => {
        const n = nome.trim();
        if (!n) return 'Inserisci un nome';
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return 'Lega non trovata';
        if (lega.nomi.some(nm => normalizzaNome(nm.nome) === normalizzaNome(n)))
          return 'Nome già presente';
        saveLega({
          ...lega,
          nomi: [...lega.nomi, { id: lega._nid, nome: n, ...nuovoSync() }],
          _nid: lega._nid + 1,
        });
        return null;
      },

      eliminaGiocatore: (legaId, idNome) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return 'Lega non trovata';
        // #4.5: non puoi rimuovere te stesso dal Personale
        if (lega.personale) {
          const rec = lega.nomi.find(n => n.id === idNome);
          if (rec && èSeiTuRecord(rec, get().utente?.id)) {
            return 'Non puoi rimuovere te stesso dal Personale';
          }
        }
        // M9 (audit 2026-07-03): copre TUTTI i contenitori (poker salvato/live
        // + multigioco sessioni/partite/serate), non solo le partite poker —
        // altrimenti restavano orfani in storico/classifiche multigioco.
        if (giocatoreInUso(lega, idNome)) return 'Il giocatore ha partecipato a partite e non può essere eliminato';
        // Tombstone, non delete fisico (R7.4a-3): il push deve poter dire
        // all'altro device "questo giocatore non c'è più". `giocatoreInUso`
        // qui sopra garantisce zero figli → nessun cascade.
        const now = new Date().toISOString();
        saveLega({ ...lega, nomi: lega.nomi.map(nm => nm.id === idNome ? tombstona(nm, now) : nm) });
        return null;
      },

      // #4.7c: rinomina (soprannome) — cosmetico, id stabile, si propaga ovunque.
      rinominaGiocatore: (legaId, idNome, nuovoNome) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return 'Lega non trovata';
        const err = validaRinomina(lega, idNome, nuovoNome, get().utente?.id);
        if (err) return err;
        const n = nuovoNome.trim();
        saveLega({ ...lega, nomi: lega.nomi.map(x => (x.id === idNome ? touchSync({ ...x, nome: n }) : x)) });
        return null;
      },

      /* ── Partite ── */
      eliminaPartita: (legaId, partitaId) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return;
        // Tombstone + cascade su giocatori/settlement (R7.4a-3): i soldi della
        // partita cancellata smettono di contare, e il push lo propaga.
        const now = new Date().toISOString();
        saveLega({ ...lega, partite: lega.partite.map(p => p.id === partitaId ? tombstonaPartita(p, now) : p) });
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
                i === idx ? touchSync({ ...s, pagato: !s.pagato }) : s,
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
                i === idx ? touchSync({ ...s, pagato: true }) : s,
              ),
            };
          }),
        });
      },

      saldaTuttiDi: (legaId, debtorId?) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return 0;
        let count = 0;
        saveLega({
          ...lega,
          partite: lega.partite.map(p => ({
            ...p,
            settlements: p.settlements.map(s => {
              if (!s.pagato && (debtorId === undefined || s.from === debtorId)) {
                count++;
                return touchSync({ ...s, pagato: true });
              }
              return s;   // già pagato: NON si tocca (un touchSync a vuoto = un push inutile)
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
        const g = sess.giocatori.find(x => x.id_nome === idNome);
        if (!g) return;

        if (!g.entrato) {
          // Ingresso: assegna seat via assegnaPostoIngresso (§5 TAVOLI_SPEC) +
          // avvia il timer per-persona (R5: seduto_da_ms = ora). Se il
          // giocatore era "uscito" (esceDalTavolo) e rientra, azzera lo stato
          // di uscita (M11, audit 2026-07-03): altrimenti resta "fantasma" —
          // ha un seat ma la UI lo lista ancora tra gli usciti con dati vecchi.
          const seduti = sess.giocatori.map(x => ({ id_nome: x.id_nome, seat: x.seat }));
          const nuoviSeduti = assegnaPostoIngresso(seduti, idNome);
          const nuovoSeat = nuoviSeduti.find(s => s.id_nome === idNome)?.seat ?? null;
          const nEntrati = sess.giocatori.filter(x => x.entrato).length + 1;
          const giocatori = sess.giocatori.map(x =>
            x.id_nome === idNome
              ? { ...x, entrato: true, seat: nuovoSeat, seduto_da_ms: Date.now(), uscito: false, valore_uscita: undefined, ora_uscita: undefined }
              : x,
          );
          saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori, num_tavoli: tavoliNecessari(nEntrati) } });
        } else {
          // Uscita: libera il seat + CONGELA il timer (R5: accumula in tempo_gioco_ms).
          const now = Date.now();
          const giocatori = sess.giocatori.map(x => {
            if (x.id_nome !== idNome) return x;
            const frozen = (x.tempo_gioco_ms ?? 0) + (x.seduto_da_ms ? Math.max(0, now - x.seduto_da_ms) : 0);
            return { ...x, entrato: false, seat: null, tempo_gioco_ms: frozen, seduto_da_ms: undefined };
          });
          saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
        }
      },

      esceDalTavolo: (legaId, idNome, valore) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const now = Date.now();
        const v = Math.max(0, valore); // B05: niente valori negativi -> debito fantasma
        // Registra il valore d'uscita in fiches_finali: il settlement esistente
        // (calcolaSettlement) lo conteggia -> niente math duplicata (USCITA_CASH_SPEC §7).
        // Libera il posto e congela il timer per-persona.
        const giocatori = sess.giocatori.map(g => {
          if (g.id_nome !== idNome) return g;
          const frozen = (g.tempo_gioco_ms ?? 0) + (g.seduto_da_ms ? Math.max(0, now - g.seduto_da_ms) : 0);
          return {
            ...g,
            uscito: true,
            valore_uscita: v,
            fiches_finali: v,
            ora_uscita: nowHHMM(),
            seat: null,
            tempo_gioco_ms: frozen,
            seduto_da_ms: undefined,
          };
        });
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
        toast('Uscito dal tavolo');
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
            ? { ...g, ricariche: [...g.ricariche, conUid({ importo, pagata })] }
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

      aggiornaFiches: (legaId, idNome, val) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const v = Math.max(0, val); // B05: niente fiche negative -> debito fantasma
        const giocatori = sess.giocatori.map(g =>
          g.id_nome === idNome ? { ...g, fiches_finali: v } : g,
        );
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
      },

      addGiocatoreSessione: (legaId, nome) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return { ok: false, motivo: 'errore', messaggio: 'Sessione non trovata' };
        const sess = lega.sessioneAttiva;
        const inSess = new Set(sess.giocatori.map(g => g.id_nome));
        const n = nome.trim();
        if (!n) return { ok: false, motivo: 'errore', messaggio: 'Inserisci un nome' };
        let nomi = [...lega.nomi];
        let _nid = lega._nid;
        let existing = nomi.find(x => normalizzaNome(x.nome) === normalizzaNome(n));
        if (existing && inSess.has(existing.id)) { toast('Già nella serata'); return { ok: false, motivo: 'gia-in-sessione' }; }
        if (!existing) {
          existing = { id: _nid++, nome: n, ...nuovoSync() };
          nomi = [...nomi, existing];
        }
        const giocatori = [...sess.giocatori, nuovoGiocatoreSessione(existing.id)];
        saveLega({ ...lega, nomi, _nid, sessioneAttiva: { ...sess, giocatori } });
        toast(`${n} aggiunto alla serata`);
        return { ok: true, idNome: existing.id };
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

      /* ── Spostamento manuale posto/tavolo (§6 TAVOLI_SPEC) ── */
      spostaGiocatore: (legaId, idNome, tavolo, posto) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const g = sess.giocatori.find(x => x.id_nome === idNome);
        if (!g?.seat) return;

        const oldSeat = g.seat;
        const occupante = sess.giocatori.find(
          x => x.id_nome !== idNome && x.seat?.tavolo === tavolo && x.seat?.posto === posto,
        );

        const giocatori = sess.giocatori.map(x => {
          if (x.id_nome === idNome)       return { ...x, seat: { tavolo, posto } };
          if (x.id_nome === occupante?.id_nome) return { ...x, seat: oldSeat };
          return x;
        });

        const maxTavolo = Math.max(...giocatori.filter(x => x.seat).map(x => x.seat!.tavolo), 1);
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori, num_tavoli: maxTavolo } });
      },

      /* ── Riequilibrio seat su richiesta (§8-§9 TAVOLI_SPEC) ── */
      riequilibraSeat: (legaId) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;

        const entrati = sess.giocatori.filter(g => g.entrato);
        if (entrati.length === 0) return;

        const seduti = entrati.map(g => ({ id_nome: g.id_nome, seat: g.seat }));
        const nuoviSeduti = riequilibraTavoli(seduti);
        const seatMap = new Map(nuoviSeduti.map(s => [s.id_nome, s.seat]));

        const giocatori = sess.giocatori.map(g =>
          seatMap.has(g.id_nome) ? { ...g, seat: seatMap.get(g.id_nome) ?? null } : g,
        );
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori, num_tavoli: tavoliNecessari(entrati.length) } });
      },

      /* ── Aggiungi giocatore in corsa e fallo entrare subito ── */
      aggiungiEFaiEntrare: (legaId, nome) => {
        const { db, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;

        const n = nome.trim();
        if (!n) return;

        // Torneo: late reg check
        if (sess.modalita === 'torneo') {
          const gameLvl = sess.livelli
            .slice(0, sess.livello_corrente + 1)
            .filter(l => l.tipo === 'gioco').length;
          if (sess.stato !== 'pre' && gameLvl > sess.late_reg.fino_a_livello) {
            toast('Late reg chiusa — non puoi aggiungere altri giocatori');
            return;
          }
        }

        const nNorm = normalizzaNome(n);
        const nomeTrovato = lega.nomi.find(nm => normalizzaNome(nm.nome) === nNorm);
        const giàInSess   = nomeTrovato
          ? sess.giocatori.find(g => g.id_nome === nomeTrovato.id)
          : null;

        // Già entrato
        if (giàInSess?.entrato) { toast(`${n} è già al tavolo`); return; }

        // In sessione ma non ancora entrato → entra subito
        if (giàInSess) {
          get().toggleEntrato(legaId, giàInSess.id_nome);
          return;
        }

        // Aggiunge alla sessione (e alla rubrica se il nome è nuovo)
        const res = get().addGiocatoreSessione(legaId, n);
        if (!res.ok) { if (res.motivo === 'errore') toast(res.messaggio); return; }

        // Fa entrare subito il giocatore APPENA aggiunto (per id_nome esatto,
        // non ri-cercato per nome — B19, audit 2026-07-03)
        const legaUpd = get().db.leghe.find(l => l.id === legaId);
        const nuovoG = legaUpd?.sessioneAttiva?.giocatori.find(g => g.id_nome === res.idNome);
        if (!nuovoG || nuovoG.entrato) return;
        get().toggleEntrato(legaId, res.idNome);
      },

      /* ── Torneo live — timer & stato ── */
      avviaTorneo: (legaId) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        if (sess.stato !== 'pre') return;
        const attiva = sessioneTorneoAttiva(sess);
        // R5: avvia il timer per-persona per chi è entrato (non eliminato).
        const now = Date.now();
        const giocatori = attiva.giocatori.map(g =>
          g.entrato && !g.eliminato ? { ...g, seduto_da_ms: now } : g,
        );
        saveLega({ ...lega, sessioneAttiva: { ...attiva, giocatori } });
        toast('Torneo avviato!');
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
        toast('Pausa');
      },

      riprendiTorneo: (legaId) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        if (sess.stato !== 'pausa') return;
        saveLega({ ...lega, sessioneAttiva: sessioneTorneoAttiva(sess) });
        toast('Ripreso');
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

      // Conferma "sei sicuro" spostata in UI (Alert.alert, SubOrologio) — A1.
      avanzaLivelloManuale: (legaId) => {
        get().avanzaLivelloAuto(legaId);
        get().toast('Livello successivo');
      },

      // Conferma "sei sicuro" spostata in UI (Alert.alert, SubOrologio) — A1.
      stopTorneo: (legaId) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = { ...lega.sessioneAttiva, stato: 'concluso' as const };
        consolidaPremiSeNecessario(sess);
        saveLega({ ...lega, sessioneAttiva: sess });
        toast('Torneo terminato');
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
        const res = get().addGiocatoreSessione(legaId, nome);
        if (!res.ok) return res.motivo === 'errore' ? res.messaggio : null;
        // Rilegge la lega aggiornata e assegna il posto al giocatore APPENA
        // aggiunto, per id_nome esatto — non "l'ultimo dell'array" (B19, audit
        // 2026-07-03): su un no-op quel giocatore poteva essere un altro.
        const legaUpd = get().db.leghe.find(l => l.id === legaId);
        if (!legaUpd?.sessioneAttiva) return null;
        const sessUpd = legaUpd.sessioneAttiva;
        const target = sessUpd.giocatori.find(g => g.id_nome === res.idNome);
        if (target && !target.seat) {
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
                const giocatori = sessUpd.giocatori.map(g =>
                  g.id_nome === res.idNome
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
          const rebuys = [...(x.rebuys ?? []), conUid({ importo: sess.buy_in, pagata })];
          return x.eliminato
            ? { ...x, rebuys, eliminato: false, elim_ts_ms: null, posizione_finale: null }
            : { ...x, rebuys };
        });
        saveLega({ ...lega, sessioneAttiva: { ...sess, giocatori } });
        toast('Rebuy aggiunto');
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
        toast('Add-on');
      },

      torneoRevive: (legaId, idNome) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return;
        const sess = lega.sessioneAttiva;
        const giocatori = sess.giocatori.map(g =>
          g.id_nome === idNome && g.eliminato
            ? { ...g, eliminato: false, elim_ts_ms: null, posizione_finale: null, seduto_da_ms: Date.now() }
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

        sess.giocatori = sess.giocatori.map(x => {
          if (x.id_nome !== idNome) return x;
          // R5: congela il timer per-persona all'eliminazione.
          const frozen = (x.tempo_gioco_ms ?? 0) + (x.seduto_da_ms ? Math.max(0, Date.now() - x.seduto_da_ms) : 0);
          return { ...x, eliminato: true, elim_ts_ms: Date.now(), posizione_finale: posizione, tempo_gioco_ms: frozen, seduto_da_ms: undefined };
        });

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
            toast(`Vince ${winnerNome}!`);
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
        toast(pagato ? 'Premio segnato come pagato' : 'Premio segnato come da pagare');
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

      apriChiusuraTorneo: (legaId, forzaVivi) => {
        const { db, setSettlement } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega?.sessioneAttiva) return { ok: false, motivo: 'sessione-assente' };

        /* Lavoriamo su una copia mutabile della sessione */
        const sess = JSON.parse(JSON.stringify(lega.sessioneAttiva)) as Sessione;
        const entrati = sess.giocatori.filter(g => g.entrato);
        if (entrati.length < 2) {
          return { ok: false, motivo: 'pochi-giocatori' };
        }

        /* Consolida i premi sul montepremi ATTUALE, o RI-consolida se diverge
           da quello congelato (A2): l'add-on non ha un gate di livello come il
           rebuy, quindi può essere preso dopo che premi_consolidati è già
           true (timing normale nel poker) — senza questo ricalcolo il monte
           premi resterebbe congelato su un totale più piccolo di quello
           realmente dovuto dai giocatori. Tolleranza > il normale
           arrotondamento per-posizione di calcolaPremi (pochi centesimi). */
        const montepremiOra = calcolaMontepremi(sess);
        const montepremiCongelato = (sess.premi ?? []).reduce((a, p) => a + p.importo, 0);
        if (!sess.premi_consolidati || Math.abs(montepremiOra - montepremiCongelato) > 0.05) {
          sess.premi = calcolaPremi(montepremiOra, entrati.length);
          sess.premi_consolidati = true;
        }

        /* Assegna posizioni ai vivi. Se sono in più di uno, serve una conferma
           esplicita dell'utente (A1 — lo store non chiede più da solo con
           confirm(): la UI mostra l'Alert e ri-chiama con forzaVivi=true). */
        const vivi = entrati.filter(g => !g.eliminato);
        if (vivi.length > 1) {
          if (!forzaVivi) {
            const n = lega.nomi.find(nm => nm.id === vivi[0]?.id_nome)?.nome ?? '?';
            return { ok: false, motivo: 'vivi-multipli', count: vivi.length, primoNome: n };
          }
          vivi.forEach((g, i) => { if (!g.posizione_finale) g.posizione_finale = i + 1; });
        } else if (vivi.length === 1 && vivi[0] && !vivi[0].posizione_finale) {
          vivi[0].posizione_finale = 1;
        }
        let nextPos = entrati.length;
        entrati.forEach(g => { if (!g.posizione_finale) g.posizione_finale = nextPos--; });

        /* Le posizioni (anche quelle auto-assegnate/provvisorie qui sopra)
           restano SOLO nella copia locale `sess`, usata per costruire il
           settlement qui sotto — NON si persistono su `lega.sessioneAttiva`
           (M10, audit 2026-07-03): se l'utente torna al live invece di
           confermare la chiusura, la sessione live deve restare quella VERA,
           non quella con le posizioni provvisorie. Il salvataggio reale
           avviene in `confermaChiusura`, che sostituisce `sessioneAttiva`. */

        /* Costruisci entrati per settlement */
        const arr: SettlementEntrato[] = entrati.map(g => {
          const ricarTot  = (g.rebuys ?? []).reduce((a, r) => a + r.importo, 0);
          const ricarPaid = (g.rebuys ?? []).reduce((a, r) => a + (r.pagata ? r.importo : 0), 0);
          const addOnAmt  = (g.add_on_fatto && sess.add_on?.abilitato) ? sess.add_on.prezzo : 0; // B08
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
        return { ok: true };
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

      confermaChiusura: (legaId, oraFine, force) => {
        const { db, saveLega, settlement, setSettlement, toast } = get();
        if (!settlement) return { ok: false, motivo: 'nessun-settlement' };
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return { ok: false, motivo: 'lega-assente' };

        const salvaPartita = (partita: Partita) => {
          const serate_bg = [...(lega.serate_bg ?? [])];
          const nuovaAttiva = serate_bg.shift();
          saveLega({ ...lega, partite: [...lega.partite, partita], _pid: lega._pid + 1, sessioneAttiva: nuovaAttiva, serate_bg });
          setSettlement(null);
          set({ serataView: 'hub', overlayOpen: false });
          toast('Serata salvata!');
        };

        const sa = { ...settlement.sessione, ora_fine: oraFine || settlement.sessione.ora_fine };

        /* ── CASH nuovo modello ── */
        if (!settlement.isTorneo && settlement.cashResult) {
          const cr = settlement.cashResult;
          const trasf: Trasferimento[] = settlement.trasferimentiOverride ?? cr.trasferimenti;

          /* Check bilanciamento (non bloccante) */
          const sbilancioFiches = Math.abs(cr.giocatori.reduce((a, g) => a + g.netto, 0));
          let warning = '';
          if (sbilancioFiches > 0.01) {
            warning += `Sbilancio globale fiches: €${sbilancioFiches.toFixed(2).replace('.', ',')}\n(le fiches non tornano al totale stake)\n\n`;
          }
          // B07 (audit 2026-07-03): debito residuo che l'algoritmo di settlement
          // non è riuscito ad abbinare a un creditore (di solito coincide col
          // caso sopra, ma è un segnale distinto: lo esponiamo comunque).
          if (cr.sbilancio > 0.005) {
            warning += `Debito non abbinato: €${cr.sbilancio.toFixed(2).replace('.', ',')}\n(qualcuno resta senza una controparte per il pagamento)\n\n`;
          }
          if (warning && !force) return { ok: false, motivo: 'warning', messaggio: `${warning}Salvare comunque?` };

          /* Costruisci GiocatorePartita[] */
          const giocatori: GiocatorePartita[] = cr.giocatori.map(gc => {
            const sessG = settlement.sessione.giocatori.find(g => g.id_nome === gc.id_nome);
            const pagamenti_effettuati: PagamentoEffettuato[] = trasf
              .filter(t => t.from === gc.id_nome)
              .map(t => conUid({ to: t.to, amount: t.importo }));
            const pagamenti_ricevuti: PagamentoRicevuto[] = trasf
              .filter(t => t.to === gc.id_nome)
              .map(t => conUid({ from: t.from, amount: t.importo }));
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
              // conUid: i movimenti nati nel live hanno già il loro uid (lo
              // conservano); lo riceve qui solo chi viene da una sessione
              // aperta prima di R7.4a-2 — mai una rigenerazione (idempotente).
              ricariche:           (sessG?.ricariche ?? []).map(conUid),
              pagamenti_effettuati,
              pagamenti_ricevuti,
              posizione_finale:    null,
              add_on_fatto:        false,
              add_on_pagato:       false,
              ...nuovoSync(),
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
              ...nuovoSync(),
            }));

          salvaPartita({
            id: lega._pid, data: sa.data,
            ora_inizio: sa.ora_inizio, ora_fine: sa.ora_fine,
            modalita: sa.modalita, buy_in: sa.buy_in,
            giocatori, settlements,
            ...nuovoSync(),
          });
          return { ok: true };
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
        if (warning && !force) return { ok: false, motivo: 'warning', messaggio: `Allocazioni non bilanciate:\n\n${warning}\nSalvare comunque?` };

        const giocatori: GiocatorePartita[] = settlement.entrati.map(c => {
          const isDebtor = c.contributo_residuo > 0.005;
          const pagamenti_effettuati: PagamentoEffettuato[] = isDebtor
            ? (settlement.allocazioni[c.id_nome] ?? []).map(a => conUid({ to: a.to, amount: a.amount }))
            : [];
          // B04 (audit 2026-07-03): niente gate su c.netto (dovuto-vs-premio
          // teorico) — un giocatore può ricevere allocazioni reali anche con
          // netto <= 0 (es. molti rebuy che pesano più del premio vinto).
          // Costruito direttamente dal flusso delle allocazioni: se nessun
          // loser gli ha allocato nulla, il risultato è comunque [].
          const pagamenti_ricevuti: PagamentoRicevuto[] = settlement.losers.flatMap(l =>
            (settlement.allocazioni[l.id_nome] ?? [])
              .filter(a => a.to === c.id_nome)
              .map(a => conUid({ from: l.id_nome, amount: a.amount }))
          );
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
            ricariche:           c.ricariche.map(conUid),   // vedi nota nel ramo cash
            pagamenti_effettuati,
            pagamenti_ricevuti,
            posizione_finale:    c.posizione_finale,
            add_on_fatto:        c.add_on_fatto,
            add_on_pagato:       c.add_on_pagato,
            ...nuovoSync(),
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
              settlements.push({
                from: l.id_nome, to: a.to, amount: Math.round(a.amount * 100) / 100, pagato: false,
                ...nuovoSync(),
              });
            }
          });
        });

        salvaPartita({
          id: lega._pid, data: sa.data,
          ora_inizio: sa.ora_inizio, ora_fine: sa.ora_fine,
          modalita: sa.modalita, buy_in: sa.buy_in,
          giocatori, settlements,
          ...nuovoSync(),
        });
        return { ok: true };
      },

      /* ══════════════════════════════════════════════════════
         SESSIONI GIOCO (multigioco non-poker, M3)
         Ciclo Gioco → Sessione → Partita su lega.sessioniGioco (tipi M1).
         NON tocca il poker (sessioneAttiva/serate_bg/partite restano suoi).
      ══════════════════════════════════════════════════════ */
      creaSessioneGioco: (legaId, giocoId, partecipanti, data, ora, serataId) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return null;
        if (partecipanti.length === 0) { toast('Scegli almeno un partecipante'); return null; }
        const sgid = lega._sgid ?? 1;
        const base = nuovaSessioneGioco(sgid, giocoId, partecipanti, data, ora);
        // R4: se la sessione nasce dentro una serata multi-gioco, la si lega.
        const sess = serataId !== undefined ? { ...base, serataId } : base;
        saveLega({
          ...lega,
          sessioniGioco: [...(lega.sessioniGioco ?? []), sess],
          _sgid: sgid + 1,
        });
        return sgid;
      },

      avviaSessioneGioco: (legaId, sessId) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return;
        const sessioniGioco = (lega.sessioniGioco ?? []).map(s =>
          s.id === sessId && s.stato === 'pre'
            ? touchSync({ ...s, stato: 'attiva' as const, ora_inizio: nowHHMM() })
            : s,
        );
        saveLega({ ...lega, sessioniGioco });
      },

      aggiungiPartita: (legaId, sessId) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return null;
        const sess = (lega.sessioniGioco ?? []).find(s => s.id === sessId);
        if (!sess || sess.stato !== 'attiva') return null;
        if (sess.partite.some(p => p.ora_fine === '')) {
          toast('C\'è già una partita in corso'); return null;
        }
        const pid = prossimoIdPartita(sess);
        const partita = nuovaPartitaGioco(pid, nowHHMM());
        const sessioniGioco = (lega.sessioniGioco ?? []).map(s =>
          s.id === sessId ? { ...s, partite: [...s.partite, partita] } : s,
        );
        saveLega({ ...lega, sessioniGioco });
        return pid;
      },

      chiudiPartita: (legaId, sessId, partitaId, esito) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return;
        const sess = (lega.sessioniGioco ?? []).find(s => s.id === sessId);
        if (!sess) return;
        // Override partecipanti solo se è un vero sottoinsieme diverso dalla sessione.
        const sessPart = sess.partecipanti;
        const eqSessione = !!esito.partecipanti
          && esito.partecipanti.length === sessPart.length
          && esito.partecipanti.every(x => sessPart.includes(x));
        const override = esito.partecipanti && !eqSessione ? esito.partecipanti : undefined;
        const effettivi = override ?? sessPart;
        const vincitori = esito.pareggio ? [] : esito.vincitori.filter(v => effettivi.includes(v));
        const nomeLibero = esito.nomeLibero?.trim() ? esito.nomeLibero.trim() : undefined;

        const sessioniGioco = (lega.sessioniGioco ?? []).map(s => {
          if (s.id !== sessId) return s;
          // touchSync sulla PARTITA, non sulla sessione: sono righe di tabelle
          // diverse nel cloud (partite_gioco / sessioni_gioco) e la riga della
          // sessione qui non cambia — marcarla sporca sarebbe un push a vuoto.
          const partite = s.partite.map(p =>
            p.id === partitaId
              ? touchSync({ ...p, ora_fine: p.ora_fine || nowHHMM(), vincitori, pareggio: esito.pareggio, partecipanti: override, nomeLibero })
              : p,
          );
          return { ...s, partite };
        });
        saveLega({ ...lega, sessioniGioco });
      },

      annullaPartita: (legaId, sessId, partitaId) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return;
        // Tombstone, non delete (R7.4a-3): anche annullare una partita di gioco
        // dev'essere propagato. La sessione padre NON si tocca (non cambia).
        const now = new Date().toISOString();
        const sessioniGioco = (lega.sessioniGioco ?? []).map(s =>
          s.id === sessId ? { ...s, partite: s.partite.map(p => p.id === partitaId ? tombstona(p, now) : p) } : s,
        );
        saveLega({ ...lega, sessioniGioco });
      },

      chiudiSessioneGioco: (legaId, sessId, esitoPareggio) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return;
        const sess = (lega.sessioniGioco ?? []).find(s => s.id === sessId);
        if (!sess) return;
        if (sess.partite.some(p => p.ora_fine === '')) {
          toast('Chiudi prima la partita in corso'); return;
        }
        const sessioniGioco = (lega.sessioniGioco ?? []).map(s =>
          s.id === sessId
            ? touchSync({ ...s, stato: 'chiusa' as const, ora_fine: nowHHMM(), esitoPareggio: !!esitoPareggio })
            : s,
        );
        saveLega({ ...lega, sessioniGioco });
        toast('Sessione chiusa');
      },

      eliminaSessioneGioco: (legaId, sessId) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return;
        // Tombstone + cascade sulle partite (R7.4a-3).
        const now = new Date().toISOString();
        const sessioniGioco = (lega.sessioniGioco ?? []).map(s =>
          s.id === sessId ? tombstonaSessioneGioco(s, now) : s,
        );
        saveLega({ ...lega, sessioniGioco });
      },

      /* ── Serate multi-gioco (R4) ── */
      creaSerata: (legaId, partecipanti, data) => {
        const { db, saveLega, toast } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return null;
        if (partecipanti.length === 0) { toast('Scegli almeno un partecipante'); return null; }
        const id = lega._serataId ?? 1;
        saveLega({
          ...lega,
          serate: [...(lega.serate ?? []), { id, data, partecipanti: [...partecipanti], ...nuovoSync() }],
          _serataId: id + 1,
        });
        return id;
      },

      eliminaSerata: (legaId, serataId) => {
        const { db, saveLega } = get();
        const lega = db.leghe.find(l => l.id === legaId);
        if (!lega) return;
        // Tombstona la serata E le sue sessioni-gioco (il gruppo intero, col
        // loro sottoalbero di partite) — R7.4a-3. Un delete fisico non direbbe
        // mai all'altro device che il gruppo è sparito.
        const now = new Date().toISOString();
        saveLega({
          ...lega,
          serate: (lega.serate ?? []).map(s => s.id === serataId ? tombstona(s, now) : s),
          sessioniGioco: (lega.sessioniGioco ?? []).map(s =>
            s.serataId === serataId ? tombstonaSessioneGioco(s, now) : s,
          ),
        });
      },

      /* ── Migrations ── */
      runMigrations: () => {
        const { db, saveLega } = get();
        db.leghe.forEach(lega => {
          let dirty = false;
          // migrateSessione muta in place (retrocompat ricariche legacy): non
          // sappiamo a buon mercato se ha cambiato qualcosa, quindi se c'è una
          // sessione da processare la persistiamo sempre (idempotente, costa
          // poco al boot) — altrimenti la mutazione non veniva mai salvata né
          // notificava i subscriber (B21, audit 2026-07-03).
          if (lega.sessioneAttiva) { migrateSessione(lega.sessioneAttiva); dirty = true; }
          if ((lega.serate_bg ?? []).length) {
            lega.serate_bg.forEach(s => migrateSessione(s));
            dirty = true;
          }
          (lega.partite ?? []).forEach(p => {
            if (!p.settlements) { migratePartita(p); dirty = true; }
          });
          // Multigioco (M1→M2): default campi gioco. Marca dirty se mancavano.
          const needMultigioco =
            lega.sessioniGioco === undefined ||
            lega._sgid === undefined ||
            lega.personale === undefined;
          migrateLega(lega);
          if (needMultigioco) dirty = true;
          if (dirty) saveLega(lega);
        });

        // Crea la lega "Personale" (default dell'app) se non esiste ancora.
        if (!get().db.leghe.some(l => l.personale)) {
          set(s => ({
            db: {
              ...s.db,
              leghe: [...s.db.leghe, creaLegaPersonale(s.db._lid)],
              _lid: s.db._lid + 1,
            },
          }));
        }
      },
      ...(auth ? auth(get) : {}),
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => storage),
      // Persisti il db + le preferenze GameBar (resto UI ricostruito a ogni avvio)
      partialize: (state) => ({
        db: state.db,
        giocoFiltro: state.giocoFiltro,
        gameBarVisible: state.gameBarVisible,
        gameBarPinned: state.gameBarPinned,
      }),
      // R7.2b: niente auto-idratazione alla creazione — non sappiamo ancora
      // QUALE account (quindi quale chiave) leggere. L'app chiama
      // persist.setOptions({name})+persist.rehydrate() da sola quando lo sa
      // (R7_SCHEMA.md sez. M).
      skipHydration: true,
    }
  )
  );
}

/* ══════════════════════════════════════════════════════
   SELECTOR HELPER
══════════════════════════════════════════════════════ */
export function selectCurrentLega(s: PokerStore): Lega | null {
  if (s.db._currentLegaId === undefined) return null;
  return s.db.leghe.find(l => l.id === s.db._currentLegaId) ?? null;
}

