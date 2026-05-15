/* ══════════════════════════════════════════════════════
   TIPI DOMINIO — Poker Tracker
   Derivati da POKER_MAP.md — mantenere sincronizzati.
══════════════════════════════════════════════════════ */

export interface User {
  username: string;
  email?: string;
}

export interface NomeGiocatore {
  id: number;
  nome: string;
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
  pagata: boolean;
}

export interface Seat {
  tavolo: number;
  posto: number;
}

export interface GiocatoreSessione {
  id_nome: number;
  entrato: boolean;
  buy_in_pagato: boolean;
  extra_amt: number;
  extra_pagato: boolean;
  ricariche: Ricarica[];  // cash: ricariche, torneo: rebuys
  rebuys: Ricarica[];
  soldi_ricevuti: number; // cash
  fiches_finali: number;  // cash
  seat: Seat | null;      // torneo
  add_on_fatto: boolean;
  add_on_pagato: boolean;
  eliminato: boolean;
  posizione_finale: number | null;
  elim_ts_ms: number | null;
  prize_pagato: boolean;
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
}

/* ─── DATABASE (localStorage) ─── */

export interface Db {
  leghe: Lega[];
  _lid: number;
  _currentLegaId: number | undefined;
}

/* ─── SETTLEMENT UI (chiusura serata) ─── */

export interface AllocazioneSettlement {
  idNome: number;
  amount: number;
}

export interface SettlementLoser {
  idNome: number;
  mancante: number;
  allocazioni: AllocazioneSettlement[];
}

export interface SettlementWinner {
  idNome: number;
  credito: number;
  allocazioni: AllocazioneSettlement[];
}

export interface SettlementState {
  isTorneo: boolean;
  losers: SettlementLoser[];
  winners: SettlementWinner[];
  neutri: number[];
}
