import { describe, it, expect } from 'vitest';
import {
  calcolaMontepremi, calcolaMontepremiIncassato, calcolaPremiPagati,
  calcolaPremi, consolidaPremiSeNecessario, contaDebitiAperti,
} from './calc';
import type { Sessione, GiocatoreSessione, Lega, Livello } from '../types';

/* B06 (audit 2026-07-03): calc.ts era l'UNICO file soldi senza alcun test. */

function mkGiocatore(id_nome: number, over: Partial<GiocatoreSessione> = {}): GiocatoreSessione {
  return {
    id_nome, entrato: true, entrata: 25, versato: 0,
    buy_in_pagato: true, extra_amt: 0, extra_pagato: true,
    ricariche: [], rebuys: [], soldi_ricevuti: 0,
    fiches_finali: 0, seat: null, add_on_fatto: false, add_on_pagato: false,
    eliminato: false, posizione_finale: null, elim_ts_ms: null, prize_pagato: false,
    ...over,
  };
}

function mkSess(giocatori: GiocatoreSessione[], over: Partial<Sessione> = {}): Sessione {
  const livelli: Livello[] = [
    { tipo: 'gioco', sb: 25, bb: 50, ante: 0, durata: 20 },
    { tipo: 'gioco', sb: 50, bb: 100, ante: 0, durata: 20 },
    { tipo: 'gioco', sb: 75, bb: 150, ante: 0, durata: 20 },
  ];
  return {
    data: '', ora_inizio: '', ora_fine: '', modalita: 'torneo',
    buy_in: 25, fiche_iniziali: 5000, num_giocatori_target: 9, num_tavoli: 1,
    durata_ore: 3, livelli, late_reg: { fino_a_livello: 1 },
    add_on: { abilitato: false, fiche: 0, prezzo: 0 },
    premi: [], premi_consolidati: false,
    stato: 'attivo', livello_corrente: 0, inizio_livello_ms: 0, trascorso_ms: 0,
    giocatori,
    ...over,
  };
}

describe('calcolaMontepremi — monte teorico (pagati + non pagati)', () => {
  it('somma i buy-in di tutti gli entrati', () => {
    const sess = mkSess([mkGiocatore(1), mkGiocatore(2), mkGiocatore(3), mkGiocatore(4)]);
    expect(calcolaMontepremi(sess)).toBe(100); // 4 × 25
  });

  it('include i rebuy (pagati o no)', () => {
    const sess = mkSess([
      mkGiocatore(1, { rebuys: [{ importo: 25, pagata: true }, { importo: 25, pagata: false }] }),
    ]);
    expect(calcolaMontepremi(sess)).toBe(75); // 25 + 25 + 25
  });

  it('esclude i giocatori non entrati', () => {
    const sess = mkSess([mkGiocatore(1), mkGiocatore(2, { entrato: false })]);
    expect(calcolaMontepremi(sess)).toBe(25);
  });

  it('B08: add-on preso ma sess.add_on DISABILITATO -> NON contato', () => {
    const sess = mkSess(
      [mkGiocatore(1, { add_on_fatto: true })],
      { add_on: { abilitato: false, fiche: 5000, prezzo: 20 } },
    );
    expect(calcolaMontepremi(sess)).toBe(25); // niente + 20
  });

  it('add-on preso E abilitato -> contato', () => {
    const sess = mkSess(
      [mkGiocatore(1, { add_on_fatto: true })],
      { add_on: { abilitato: true, fiche: 5000, prezzo: 20 } },
    );
    expect(calcolaMontepremi(sess)).toBe(45); // 25 + 20
  });
});

describe('calcolaMontepremiIncassato — solo cash realmente nel banco', () => {
  it('buy-in non pagato -> non contato', () => {
    const sess = mkSess([mkGiocatore(1, { buy_in_pagato: false })]);
    expect(calcolaMontepremiIncassato(sess)).toBe(0);
  });

  it('rebuy pagata sì, non pagata no', () => {
    const sess = mkSess([
      mkGiocatore(1, { rebuys: [{ importo: 25, pagata: true }, { importo: 25, pagata: false }] }),
    ]);
    expect(calcolaMontepremiIncassato(sess)).toBe(50); // 25 buy-in + 25 rebuy pagata
  });

  it('B08: add-on preso+pagato ma DISABILITATO -> non contato', () => {
    const sess = mkSess(
      [mkGiocatore(1, { add_on_fatto: true, add_on_pagato: true })],
      { add_on: { abilitato: false, fiche: 5000, prezzo: 20 } },
    );
    expect(calcolaMontepremiIncassato(sess)).toBe(25);
  });

  it('add-on preso+pagato+abilitato -> contato', () => {
    const sess = mkSess(
      [mkGiocatore(1, { add_on_fatto: true, add_on_pagato: true })],
      { add_on: { abilitato: true, fiche: 5000, prezzo: 20 } },
    );
    expect(calcolaMontepremiIncassato(sess)).toBe(45);
  });
});

describe('calcolaPremiPagati', () => {
  it('somma solo i premi di chi ha prize_pagato + posizione_finale', () => {
    const sess = mkSess(
      [
        mkGiocatore(1, { posizione_finale: 1, prize_pagato: true }),
        mkGiocatore(2, { posizione_finale: 2, prize_pagato: false }), // non ancora pagato
      ],
      { premi: [{ posizione: 1, percentuale: 65, importo: 65 }, { posizione: 2, percentuale: 35, importo: 35 }] },
    );
    expect(calcolaPremiPagati(sess)).toBe(65);
  });

  it('nessun premio -> 0', () => {
    expect(calcolaPremiPagati(mkSess([]))).toBe(0);
  });
});

describe('contaDebitiAperti', () => {
  it('conta solo i settlement non pagati, su tutte le partite della lega', () => {
    const lega = {
      partite: [
        { settlements: [{ from: 1, to: 2, amount: 10, pagato: false }, { from: 1, to: 3, amount: 5, pagato: true }] },
        { settlements: [{ from: 2, to: 3, amount: 20, pagato: false }] },
      ],
    } as unknown as Lega;
    expect(contaDebitiAperti(lega)).toBe(2);
  });
});

describe('calcolaPremi — B02 (Σimporti === montepremi SEMPRE, mai un residuo perso)', () => {
  it('montepremi o giocatori a 0 -> nessun premio', () => {
    expect(calcolaPremi(0, 9)).toEqual([]);
    expect(calcolaPremi(100, 0)).toEqual([]);
  });

  it('1 solo premio (≤4 giocatori): tutto il montepremi', () => {
    const premi = calcolaPremi(100, 4);
    expect(premi).toEqual([{ posizione: 1, percentuale: 100, importo: 100 }]);
  });

  it('2 premi, caso che tornava già esatto (100 × 0.65/0.35)', () => {
    const premi = calcolaPremi(100, 9);
    expect(premi.map(p => p.importo)).toEqual([65, 35]);
    expect(premi.reduce((a, p) => a + p.importo, 0)).toBe(100);
  });

  it('B02: montepremi che SENZA il fix produceva un residuo (42,50 su 2 posizioni)', () => {
    // 42.50 × 0.65 = 27.625 → arrotonda a 27.63; 42.50 × 0.35 = 14.875 → 14.88 (o 14.87)
    // la somma "ingenua" può sballare di un centesimo: col fix il 1° posto
    // assorbe sempre il residuo esatto.
    const premi = calcolaPremi(42.5, 9);
    const somma = premi.reduce((a, p) => a + p.importo, 0);
    expect(Math.round(somma * 100) / 100).toBe(42.5);
  });

  it('B02: batteria di montepremi "scomodi" su tutte le fasce -> somma sempre esatta', () => {
    const montepremi = [10.01, 33.33, 42.5, 99.99, 123.45, 250.01, 777.77, 1000.5, 3.33];
    const conteggi = [3, 7, 12, 20, 40];
    for (const m of montepremi) {
      for (const n of conteggi) {
        const premi = calcolaPremi(m, n);
        const somma = premi.reduce((a, p) => a + p.importo, 0);
        expect(Math.round(somma * 100) / 100).toBe(Math.round(m * 100) / 100);
      }
    }
  });

  it('percentuali e numero posizioni corretti per fascia (27 giocatori -> 4 premi)', () => {
    const premi = calcolaPremi(1000, 27);
    expect(premi.map(p => p.percentuale)).toEqual([45, 27, 18, 10]);
    expect(premi).toHaveLength(4);
  });

  it('6 premi per tornei grandi (>27 entrati)', () => {
    const premi = calcolaPremi(1000, 40);
    expect(premi).toHaveLength(6);
    expect(premi.reduce((a, p) => a + p.importo, 0)).toBe(1000);
  });
});

describe('consolidaPremiSeNecessario', () => {
  it('già consolidati -> no-op (non ricalcola)', () => {
    const sess = mkSess([mkGiocatore(1)], {
      premi: [{ posizione: 1, percentuale: 100, importo: 999 }], // valore "sentinella"
      premi_consolidati: true,
    });
    consolidaPremiSeNecessario(sess);
    expect(sess.premi).toEqual([{ posizione: 1, percentuale: 100, importo: 999 }]);
  });

  it('late reg ancora aperta e torneo non concluso -> non consolida', () => {
    const sess = mkSess([mkGiocatore(1)], { livello_corrente: 0, late_reg: { fino_a_livello: 2 } });
    consolidaPremiSeNecessario(sess);
    expect(sess.premi_consolidati).toBe(false);
    expect(sess.premi).toEqual([]);
  });

  it('late reg chiusa (livello corrente oltre la soglia) -> consolida', () => {
    const sess = mkSess([mkGiocatore(1), mkGiocatore(2), mkGiocatore(3), mkGiocatore(4)], {
      livello_corrente: 2, late_reg: { fino_a_livello: 1 },
    });
    consolidaPremiSeNecessario(sess);
    expect(sess.premi_consolidati).toBe(true);
    expect(sess.premi.reduce((a, p) => a + p.importo, 0)).toBe(100); // 4×25
  });

  it('torneo concluso -> consolida anche se la late reg (teorica) sarebbe ancora aperta', () => {
    const sess = mkSess([mkGiocatore(1), mkGiocatore(2)], {
      stato: 'concluso', livello_corrente: 0, late_reg: { fino_a_livello: 5 },
    });
    consolidaPremiSeNecessario(sess);
    expect(sess.premi_consolidati).toBe(true);
  });
});
