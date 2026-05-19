import type { Livello, Sessione, GiocatoreSessione } from '../types';

/* ══════════════════════════════════════════════════════
   CONFIGURAZIONE TORNEO (durante il setup)
══════════════════════════════════════════════════════ */
export interface TorneoSetupConfig {
  fiche_iniziali: number;
  num_giocatori:  number;
  durata_ore:     number;
  livelli:        Livello[];
  late_reg:       { fino_a_livello: number };
  add_on:         { abilitato: boolean; fiche: number; prezzo: number };
}

/* ── Arrotonda a valori chip "puliti" ── */
export function roundChipVal(v: number): number {
  v = Math.max(0, Math.round(v));
  if (v === 0)    return 0;
  if (v < 25)     return 25;
  if (v < 2000)   return Math.round(v / 25)  * 25;
  if (v < 10000)  return Math.round(v / 100) * 100;
  return Math.round(v / 500) * 500;
}

/* ── Genera struttura blind suggerita ── */
export function suggerisciTorneo(num_giocatori: number, durata_ore: number): TorneoSetupConfig {
  num_giocatori = Math.max(2, Math.min(200, Math.round(num_giocatori || 9)));
  durata_ore    = Math.max(1, Math.min(12,  +durata_ore || 3));

  let fiche_iniziali: number;
  if (durata_ore < 2)      fiche_iniziali = 5_000;
  else if (durata_ore < 3) fiche_iniziali = 7_500;
  else if (durata_ore < 4) fiche_iniziali = 10_000;
  else if (durata_ore < 5) fiche_iniziali = 15_000;
  else                     fiche_iniziali = 20_000;

  let durata_livello: number;
  if (durata_ore < 2)      durata_livello = 10;
  else if (durata_ore < 3) durata_livello = 12;
  else if (durata_ore < 4) durata_livello = 15;
  else if (durata_ore < 5) durata_livello = 18;
  else                     durata_livello = 20;

  const baseBB = roundChipVal(fiche_iniziali / 100);

  // [bb_multiplier, ante_multiplier]
  const mults: [number, number][] = [
    [1, 0], [1.5, 0], [2, 0], [3, 0], [4, 0],
    [6, 0.75], [8, 1], [10, 1.25], [12, 2], [16, 2.5],
    [20, 3], [30, 4], [40, 5], [60, 8],
    [80, 10], [100, 15], [150, 20], [200, 25],
  ];

  const numLivelliNeeded = Math.ceil((durata_ore * 60) / (durata_livello + 2.5));
  const numLivelli       = Math.min(mults.length, Math.max(6, numLivelliNeeded));

  const livelli: Livello[] = [];
  for (let i = 0; i < numLivelli; i++) {
    const [bbMult, anteMult] = mults[i]!;
    const bb   = roundChipVal(baseBB * bbMult);
    const sb   = roundChipVal(bb / 2);
    const ante = anteMult > 0 ? roundChipVal(baseBB * anteMult) : 0;
    livelli.push({ tipo: 'gioco', sb, bb, ante, durata: durata_livello });
    if ((i + 1) % 4 === 0 && i < numLivelli - 1) {
      livelli.push({ tipo: 'pausa', sb: 0, bb: 0, ante: 0, durata: 10 });
    }
  }

  const lateRegLevel = Math.min(6, Math.max(3, Math.ceil(numLivelli * 0.3)));

  return {
    fiche_iniziali,
    num_giocatori,
    durata_ore,
    livelli,
    late_reg: { fino_a_livello: lateRegLevel },
    add_on: { abilitato: true, fiche: fiche_iniziali, prezzo: 0 },
  };
}

/* ── Giocatore sessione "vuoto" ── */
export function nuovoGiocatoreSessione(id_nome: number, buyIn: number): GiocatoreSessione {
  return {
    id_nome,
    entrato:          false,
    buy_in_pagato:    false,
    entrata:          buyIn,
    entrata_pagata:   false,
    ricariche:        [],
    rebuys:           [],
    fiches_finali:    0,
    seat:             null,
    add_on_fatto:     false,
    add_on_pagato:    false,
    eliminato:        false,
    posizione_finale: null,
    elim_ts_ms:       null,
    prize_pagato:     false,
  };
}

/* ── Assegna posti casuali (torneo) ── */
export function assegnaPostiCasuali(sess: Sessione): void {
  const num_tavoli = sess.num_tavoli || Math.ceil((sess.num_giocatori_target || 9) / 9);
  const seats: { tavolo: number; posto: number }[] = [];
  for (let t = 1; t <= num_tavoli; t++) {
    for (let p = 1; p <= 9; p++) seats.push({ tavolo: t, posto: p });
  }
  // Fisher-Yates shuffle
  for (let i = seats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seats[i], seats[j]] = [seats[j]!, seats[i]!];
  }
  sess.giocatori.forEach((g, i) => { g.seat = seats[i] ?? null; });
}

/* ── Costruisce un oggetto Sessione completo ── */
export function creaSessione(
  data:         string,
  oraInizio:    string,
  oraFine:      string,
  buyIn:        number,
  modalita:     'cash' | 'torneo',
  giocatori:    GiocatoreSessione[],
  torneoConfig?: TorneoSetupConfig,
): Sessione {
  const sess: Sessione = {
    data,
    ora_inizio: oraInizio,
    ora_fine:   oraFine,
    modalita,
    buy_in:     buyIn,
    // Campi torneo (defaults per cash, sovrascritti sotto se torneo)
    fiche_iniziali:       0,
    num_giocatori_target: giocatori.length,
    num_tavoli:           1,
    durata_ore:           3,
    livelli:              [],
    late_reg:             { fino_a_livello: 0 },
    add_on:               { abilitato: false, fiche: 0, prezzo: 0 },
    premi:                [],
    premi_consolidati:    false,
    stato:                'pre',
    livello_corrente:     0,
    inizio_livello_ms:    0,
    trascorso_ms:         0,
    giocatori,
  };

  if (modalita === 'torneo' && torneoConfig) {
    const numTavoli   = Math.ceil(torneoConfig.num_giocatori / 9);
    const addOnPrezzo = torneoConfig.add_on.prezzo
      || Math.round(buyIn / 2 * 100) / 100;

    sess.fiche_iniziali       = torneoConfig.fiche_iniziali;
    sess.num_giocatori_target = torneoConfig.num_giocatori;
    sess.num_tavoli           = numTavoli;
    sess.durata_ore           = torneoConfig.durata_ore;
    sess.livelli              = JSON.parse(JSON.stringify(torneoConfig.livelli)) as Livello[];
    sess.late_reg             = { ...torneoConfig.late_reg };
    sess.add_on               = { ...torneoConfig.add_on, prezzo: addOnPrezzo };
    assegnaPostiCasuali(sess);
  }

  return sess;
}
