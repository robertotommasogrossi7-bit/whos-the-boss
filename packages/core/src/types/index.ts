/* ══════════════════════════════════════════════════════
   TIPI DOMINIO — Poker Tracker
   Derivati da POKER_MAP.md — mantenere sincronizzati.
══════════════════════════════════════════════════════ */

export interface User {
  username: string;     // handle univoco (R6)
  email?: string;
  id?: string;          // id account Supabase (B1)
  displayName?: string; // nome visualizzato libero (R6, opzionale)
}

export interface NomeGiocatore {
  id: number;
  nome: string;
  accountId?: string;   // id account Supabase del giocatore reale (R6). Assente = guest.
}

/* ─── SESSIONE (partita in corso) ─── */

export interface Livello {
  tipo: 'gioco' | 'pausa';
  sb: number;
  bb: number;
  ante: number;
  durata: number; // minuti
}

export interface LateReg {
  fino_a_livello: number;
}

export interface AddOn {
  abilitato: boolean;
  fiche: number;
  prezzo: number;
}

export interface Premio {
  posizione: number;
  percentuale: number;
  importo: number;
}

export interface Ricarica {
  importo: number;
  pagata?: boolean; // opzionale: cash non usa più pagata, torneo (rebuys) sì
}

export interface Seat {
  tavolo: number;
  posto: number;
}

export interface GiocatoreSessione {
  id_nome: number;
  entrato: boolean;
  // ── Campi cash (nuovo modello) ──
  entrata: number;        // buy-in effettivo del giocatore (default = Sessione.buy_in)
  versato: number;        // quanto è realmente nel piatto (numero libero)
  // ── Campi torneo (e cash legacy) ──
  buy_in_pagato: boolean;
  extra_amt: number;
  extra_pagato: boolean;
  ricariche: Ricarica[];  // cash: ricariche (importo only), torneo: rebuys
  rebuys: Ricarica[];     // torneo: rebuy con pagata
  soldi_ricevuti: number; // cash legacy
  fiches_finali: number;  // cash
  seat: Seat | null;      // posto al tavolo (torneo; R5: anche cash)
  add_on_fatto: boolean;
  add_on_pagato: boolean;
  eliminato: boolean;
  posizione_finale: number | null;
  elim_ts_ms: number | null;
  prize_pagato: boolean;
  // ── R5 (tavolo live): uscita a metà + timer per-persona (opzionali, additivi) ──
  uscito?: boolean;         // è uscito dal tavolo a metà partita
  valore_uscita?: number;   // fiche contate (cash) o premio (torneo) all'uscita
  ora_uscita?: string;      // HH:MM dell'uscita
  seduto_da_ms?: number;    // timestamp (ms) da quando è (ri)seduto; assente = non al tavolo
  tempo_gioco_ms?: number;  // tempo accumulato nelle sedute precedenti (congelato)
}

export interface Sessione {
  data: string;
  ora_inizio: string;
  ora_fine: string;
  modalita: 'cash' | 'torneo';
  buy_in: number;
  // TORNEO
  fiche_iniziali: number;
  num_giocatori_target: number;
  num_tavoli: number;
  durata_ore: number;
  livelli: Livello[];
  late_reg: LateReg;
  add_on: AddOn;
  premi: Premio[];
  premi_consolidati: boolean;
  stato: 'pre' | 'attivo' | 'pausa' | 'concluso';
  livello_corrente: number;
  inizio_livello_ms: number;
  trascorso_ms: number;
  // GIOCATORI
  giocatori: GiocatoreSessione[];
}

/* ─── PARTITA (salvata) ─── */

export interface Settlement {
  from: number;
  to: number;
  amount: number;
  pagato: boolean;
}

export interface PagamentoEffettuato {
  to: number;
  amount: number;
  pagato?: boolean;
}

export interface PagamentoRicevuto {
  from: number;
  amount: number;
}

export interface GiocatorePartita {
  id_nome: number;
  entrate: number;
  ricarica_fatta: number;
  extra: number;
  soldi_ricevuti: number;
  fiches_finali: number;
  netto_finale: number;
  premio: number;
  vincitore: boolean;
  buy_in_pagato: boolean;
  extra_pagato: boolean;
  ricariche: Ricarica[];
  pagamenti_effettuati: PagamentoEffettuato[];
  pagamenti_ricevuti: PagamentoRicevuto[];
  posizione_finale: number | null;
  add_on_fatto: boolean;
  add_on_pagato: boolean;
}

export interface Partita {
  id: number;
  buy_in: number;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  modalita: 'cash' | 'torneo';
  giocatori: GiocatorePartita[];
  settlements: Settlement[];
}

/* ─── MULTIGIOCO (Card Tracker M1) ─── */
/* Tipi per i giochi non-poker. Vedi MULTIGIOCO_SPEC.md §4.
   Il poker NON usa questi tipi: mantiene Sessione/Partita/serate_bg. */

export interface GiocoLega {
  id: string;             // 'magic', 'scopa', 'custom-<ts>'
  nome: string;
  preimpostato: boolean;
  foto?: string;          // dataURL caricato dall'utente (locale, non nel repo)
  accent?: string;        // colore custom (i preimpostati lo prendono dal catalogo)
  attivo: boolean;
  pareggioComeVittoria: boolean; // default true (vedi SPEC §7)
}

export interface PartitaGioco {
  id: number;
  ora_inizio: string;      // auto (HH:MM) all'avvio
  ora_fine: string;        // auto (HH:MM) alla chiusura
  vincitori: number[];     // id_nome (vuoto + pareggio=true → pareggio)
  pareggio: boolean;
  partecipanti?: number[]; // override: chi ha giocato QUESTA partita (default: sessione)
  nomeLibero?: string;     // gioco "una tantum"/sconosciuto per la singola partita
}

export interface SessioneGioco {
  id: number;
  giocoId: string;
  data: string;            // "YYYY-MM-DD"
  stato: 'pre' | 'attiva' | 'chiusa'; // femminile, distinto da Sessione.stato del poker
  ora_inizio: string;      // programmata, poi reale all'avvio
  ora_fine: string;        // auto alla chiusura
  partecipanti: number[];  // id_nome di default per le partite
  partite: PartitaGioco[];
  esitoPareggio: boolean;  // true se la sessione è chiusa in pareggio
  serataId?: number;       // R4: se la sessione fa parte di una serata multi-gioco
}

/* ─── SERATA MULTI-GIOCO (R4) ───
   Contenitore leggero: una "serata" coi suoi partecipanti che raggruppa più
   SessioneGioco (una per gioco). Ogni gioco resta un record a sé (salvabile /
   migrabile 1:1 nel DB); la serata li lega via `SessioneGioco.serataId`. Il
   poker NON entra qui (resta serata a parte, suo modello). */
export interface SerataMulti {
  id: number;
  data: string;            // "YYYY-MM-DD"
  partecipanti: number[];  // id_nome invitati alla serata
}

/* ─── LEGA ─── */

export interface Lega {
  id: number;
  nome: string;
  foto: string; // dataURL
  nomi: NomeGiocatore[];
  partite: Partita[];
  sessioneAttiva: Sessione | undefined;
  serate_bg: Sessione[];
  _nid: number;
  _pid: number;
  // ── Multigioco (Card Tracker M1) — opzionali, poker implicito se assenti ──
  personale?: boolean;            // true SOLO per la lega "Personale"
  giochi?: GiocoLega[];           // undefined = solo poker implicito
  sessioniGioco?: SessioneGioco[];
  _sgid?: number;                 // auto-increment id sessione gioco
  serate?: SerataMulti[];         // R4: serate multi-gioco (raggruppano le sessioniGioco)
  _serataId?: number;             // auto-increment id serata multi-gioco
  monoGiocoId?: string;           // (predisposizione M2d) lega mono-gioco: id del solo gioco attivo (admin/post-backend)
  adminIds?: number[];            // #4.5: marcatore creatore=admin (solo dato; i poteri sono #7.5)
}

/* ─── DATABASE (localStorage) ─── */

export interface Db {
  leghe: Lega[];
  _lid: number;
  _currentLegaId: number | undefined;
}

/* ─── SETTLEMENT UI (chiusura serata) ─── */

/** Singolo pagamento: da loser → to winner */
export interface SettlementAlloc {
  to:     number;   // idNome del vincitore/creditore
  amount: number;
}

/** Contante che cambia mano nel settlement cash (§7) */
export interface Trasferimento {
  from:    number;
  to:      number;
  importo: number;
}

/** Dati per-giocatore calcolati da calcolaSettlement */
export interface GiocatoreCalcolato {
  id_nome:          number;
  dovuto:           number;
  versato:          number;
  mancante:         number;   // max(0, dovuto - versato)
  mancanteP:        number;   // mancante' dopo auto-compensazione
  fiche:            number;
  ficheP:           number;   // fiche' dopo auto-compensazione
  eccedenza:        number;   // max(0, versato - dovuto)
  versatoLegittimo: number;   // min(versato, dovuto)
  bisogno:          number;   // contanti extra da ricevere oltre al piatto
  netto:            number;   // fiche - dovuto
}

/** Risultato di calcolaSettlement */
export interface CashSettlementResult {
  piatto: {
    totaleVersato: number;
    totaleDovuto:  number;
    breakdown: Array<{ id_nome: number; versato: number; dovuto: number; eccedenza: number; }>;
  };
  trasferimenti: Trasferimento[];
  giocatori:     GiocatoreCalcolato[];
}

/** Snapshot di un giocatore nel settlement (cash e torneo condiviso) */
export interface SettlementEntrato {
  id_nome:            number;
  // ── Cash ──
  mancante:           number;   // debito da versare (0 se torneo)
  netto:              number;   // netto calcolato
  ricaricheTot:       number;
  buy_in_pagato:      boolean;
  extra_amt:          number;
  extra_pagato:       boolean;
  ricariche:          Ricarica[]; // cash: ricariche, torneo: rebuys
  fiches:             number;
  ricevuti:           number;
  // ── Torneo ──
  contributo_dovuto:  number;
  contributo_pagato:  number;
  contributo_residuo: number;
  premio_dovuto:      number;
  premio_residuo:     number;
  posizione_finale:   number | null;
  add_on_fatto:       boolean;
  add_on_pagato:      boolean;
  prize_pagato:       boolean;
}

/** Stato completo del settlement aperto (rimpiazza il vecchio _settlement vanilla) */
export interface SettlementState {
  legaId:      number;
  isTorneo:    boolean;
  sessione:    Sessione;                          // snapshot deep copy
  entrati:     SettlementEntrato[];
  losers:      SettlementEntrato[];
  winners:     SettlementEntrato[];
  neutri:      SettlementEntrato[];
  allocazioni: Record<number, SettlementAlloc[]>; // { [loserId]: allocs } — torneo
  // Cash nuovo modello (§8)
  cashResult?:            CashSettlementResult;
  trasferimentiOverride?: Trasferimento[];         // override manuali utente
}
