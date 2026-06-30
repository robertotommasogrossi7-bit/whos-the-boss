import { describe, it, expect } from 'vitest';
import { computeLive } from './computeLive';
import type { Sessione } from '../types';

function makeSess(buy_in: number, giocatori: Sessione['giocatori']): Sessione {
  return {
    data: '', ora_inizio: '', ora_fine: '', modalita: 'cash',
    buy_in,
    fiche_iniziali: 0, num_giocatori_target: 0, num_tavoli: 1,
    durata_ore: 0, livelli: [], late_reg: { fino_a_livello: 0 },
    add_on: { abilitato: false, fiche: 0, prezzo: 0 },
    premi: [], premi_consolidati: false,
    stato: 'attivo', livello_corrente: 0, inizio_livello_ms: 0, trascorso_ms: 0,
    giocatori,
  };
}

function base(id_nome: number, overrides: Partial<Sessione['giocatori'][0]>): Sessione['giocatori'][0] {
  return {
    id_nome, entrato: true, entrata: 25, versato: 0,
    buy_in_pagato: false, extra_amt: 0, extra_pagato: true,
    ricariche: [], rebuys: [], soldi_ricevuti: 0,
    fiches_finali: 0, seat: null, add_on_fatto: false, add_on_pagato: false,
    eliminato: false, posizione_finale: null, elim_ts_ms: null, prize_pagato: false,
    ...overrides,
  };
}

describe('computeLive — entrata per giocatore', () => {

  it('usa entrata del giocatore, non sess.buy_in', () => {
    // Mario entra con 10 invece di 25 (buy-in di serata)
    // A: entrata 10, ricariche 0, versato 10, fiche 5
    // B: entrata 25, ricariche 0, versato 25, fiche 30
    const sess = makeSess(25, [
      base(1, { entrata: 10, versato: 10, fiches_finali: 5 }),
      base(2, { entrata: 25, versato: 25, fiches_finali: 30 }),
    ]);
    const { arr } = computeLive(sess);
    const a = arr.find(g => g.id_nome === 1)!;
    const b = arr.find(g => g.id_nome === 2)!;

    expect(a.dovuto).toBe(10);           // non 25
    expect(a.mancante).toBe(0);          // 10-10=0
    expect(a.netto).toBe(-5);            // 5-10=-5

    expect(b.dovuto).toBe(25);
    expect(b.mancante).toBe(0);
    expect(b.netto).toBe(5);             // 30-25=5
  });

  it('entrata con ricarica: dovuto = entrata + ricaricheTot', () => {
    // entrata 10, ricarica 15, versato 25, fiche 10
    const sess = makeSess(25, [
      base(1, { entrata: 10, ricariche: [{ importo: 15 }], versato: 25, fiches_finali: 10 }),
      base(2, { entrata: 25, versato: 25, fiches_finali: 25 }),
    ]);
    const { arr } = computeLive(sess);
    const a = arr.find(g => g.id_nome === 1)!;

    expect(a.dovuto).toBe(25);           // 10+15=25
    expect(a.mancante).toBe(0);          // 25-25=0
    expect(a.netto).toBe(-15);           // 10-25=-15
  });

  it('entrata mancante → fallback a sess.buy_in', () => {
    // giocatore legacy senza entrata (undefined) → deve usare sess.buy_in
    const g = base(1, { versato: 25, fiches_finali: 40 });
    (g as unknown as Record<string, unknown>).entrata = undefined;
    const sess = makeSess(25, [g, base(2, { entrata: 25, versato: 25, fiches_finali: 10 })]);
    const { arr } = computeLive(sess);
    const a = arr.find(g => g.id_nome === 1)!;

    expect(a.dovuto).toBe(25);
    expect(a.netto).toBe(15);
  });

});
