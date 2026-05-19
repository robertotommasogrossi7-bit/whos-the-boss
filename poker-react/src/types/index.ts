/* ══════════════════════════════════════════════════════
   TIPI DOMINIO — Poker Tracker
   Derivati da POKER_MAP.md — mantenere sincronizzati.
══════════════════════════════════════════════════════ */

import type { GiocatoreCashCalc, Trasferimento } from '../utils/settlement';

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
  buy_in_pagato: boolean;   // torneo
  entrata: number;          // cash: stake d'ingresso scelto dal giocatore
  entrata_pagata: boolean;  // cash: l'entrata è stata versata?
  ricariche: Ricarica[];    // cash: ricariche, torneo: rebuys
  rebuys: Ricarica[];
  fiches_finali: number;    // cash
  seat: Seat | null;        // torneo
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
  extra: number;          // torneo: importo add-on (0 per il cash)
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

/** Singolo pagamento: da loser → to winner */
export interface SettlementAlloc {
  to:     number;   // idNome del vincitore/creditore
  amount: number;
}

/** Snapshot di un giocatore nel settlement TORNEO (modello §11, separato dal cash). */
export interface SettlementEntrato {
  id_nome:            number;
  mancante:           number;
  netto:              number;
  ricaricheTot:       number;
  buy_in_pagato:      boolean;
  extra_amt:          number;   // torneo: importo add-on
  extra_pagato:       boolean;
  ricariche:          Ricarica[]; // torneo: rebuys
  fiches:             number;
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

/** Settlement CASH: trasferimenti finali di contante (§7-§8). */
export interface SettlementStateCash {
  isTorneo:      false;
  legaId:        number;
  sessione:      Sessione;              // snapshot deep copy
  giocatori:     GiocatoreCashCalc[];   // grandezze §4 dei giocatori entrati
  trasferimenti: Trasferimento[];       // suggeriti da §7, modificabili a mano §8
  sbilancio:     number;                // somma netti: ≠ 0 = fiche contate male §9
}

/** Settlement TORNEO: modello contributi/premi separato (§11). */
export interface SettlementStateTorneo {
  isTorneo:    true;
  legaId:      number;
  sessione:    Sessione;
  entrati:     SettlementEntrato[];
  losers:      SettlementEntrato[];
  winners:     SettlementEntrato[];
  neutri:      SettlementEntrato[];
  allocazioni: Record<number, SettlementAlloc[]>; // { [loserId]: allocs }
}

/** Stato del settlement aperto: discriminato su `isTorneo`. */
export type SettlementState = SettlementStateCash | SettlementStateTorneo;
