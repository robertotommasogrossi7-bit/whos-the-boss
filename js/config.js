'use strict';

/* ══════════════════════════════════════════════════════
   COSTANTI — chiavi localStorage / sessionStorage
══════════════════════════════════════════════════════ */
const USER_KEY  = 'pokerTrackerUser_v2';
const STORE_KEY = 'pokerTracker_v2';

/* ══════════════════════════════════════════════════════
   VARIABILI GLOBALI DI STATO
══════════════════════════════════════════════════════ */
// UI generale
let _toastTmr      = null;
let _formRendered  = false;

// Nuova lega
let _nlFoto = '';

// Serata hub / setup
let _serataView    = 'hub';        // 'hub' | 'live' | 'setup'
let _setupPartIds  = new Set();
let _setupModalita = 'cash';
let _setupTorneo   = null;

// Live session (sub-tab attivo nel torneo/cash live)
let _liveSubTab = 'giocatori';

// Torneo
let _timerInterval    = null;
let _pendingPrizeNome = null;

// Settlement / chiusura
let _settlement = null;

// Storico
let _storicoFrom = '';
let _storicoTo   = '';
let _storicoOpen = new Set();

// Classifica
let _classificaFrom = '';
let _classificaTo   = '';
