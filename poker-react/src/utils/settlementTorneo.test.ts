import { describe, it, expect } from 'vitest';
import { calcolaSettlementTorneo } from './settlementTorneo';
import type { SettlementEntrato } from '../types';

/** SettlementEntrato minimale: contano solo contributo_residuo e premio_residuo. */
function te(id_nome: number, contributo_residuo: number, premio_residuo: number): SettlementEntrato {
  return {
    id_nome, mancante: contributo_residuo, netto: 0,
    ricaricheTot: 0, buy_in_pagato: false, extra_amt: 0, extra_pagato: true,
    ricariche: [], fiches: 0, ricevuti: 0,
    contributo_dovuto: 0, contributo_pagato: 0, contributo_residuo,
    premio_dovuto: 0, premio_residuo,
    posizione_finale: null, add_on_fatto: false, add_on_pagato: false, prize_pagato: false,
  };
}

const totAlloc = (r: ReturnType<typeof calcolaSettlementTorneo>) =>
  Object.values(r.allocazioni).flat().reduce((s, a) => s + a.amount, 0);

// Scenari posti dall'utente: buy-in 25, premio vincitore 100.
describe('calcolaSettlementTorneo — auto-compensazione contributo↔premio', () => {

  it('Caso 1 — vincitore HA versato, tutti hanno versato: nessuna allocazione (premio dal piatto)', () => {
    const res = calcolaSettlementTorneo([te(1, 0, 100), te(2, 0, 0), te(3, 0, 0), te(4, 0, 0)]);
    expect(res.losers).toHaveLength(0);
    expect(res.winners.map(w => w.id_nome)).toEqual([1]);
    expect(res.winners[0]!.premio_residuo).toBe(100); // riceve 100 dal piatto (25 suoi + 75 altri)
    expect(totAlloc(res)).toBe(0);
  });

  it('Caso 1b — vincitore ha versato, un altro NON ha versato: A paga il residuo al vincitore', () => {
    const res = calcolaSettlementTorneo([te(1, 0, 100), te(2, 25, 0), te(3, 0, 0), te(4, 0, 0)]);
    expect(res.losers.map(l => l.id_nome)).toEqual([2]);
    expect(res.allocazioni[2]).toEqual([{ to: 1, amount: 25 }]);
  });

  it('Caso 2 — vincitore NON ha versato: compensa 25, riceve 75, NESSUN auto-pagamento V→V', () => {
    const res = calcolaSettlementTorneo([te(1, 25, 100), te(2, 0, 0), te(3, 0, 0), te(4, 0, 0)]);
    const v = res.arr.find(p => p.id_nome === 1)!;
    expect(v.contributo_residuo).toBe(0); // il buy-in si elide col premio
    expect(v.premio_residuo).toBe(75);    // ne riceve 75 dagli altri/dal piatto
    expect(res.losers).toHaveLength(0);    // non è più debitore
    expect(res.winners.map(w => w.id_nome)).toEqual([1]);
    expect(res.allocazioni[1]).toBeUndefined(); // niente V→V
    expect(totAlloc(res)).toBe(0);
  });

  it('Caso 3 — vincitore non versato + altro debitore: A→V 25, nessun V→V', () => {
    const res = calcolaSettlementTorneo([te(1, 25, 100), te(2, 25, 0), te(3, 0, 0), te(4, 0, 0)]);
    const v = res.arr.find(p => p.id_nome === 1)!;
    expect(v.contributo_residuo).toBe(0);
    expect(v.premio_residuo).toBe(75);
    expect(res.allocazioni[2]).toEqual([{ to: 1, amount: 25 }]); // A paga 25 a V
    expect(res.allocazioni[1]).toBeUndefined();                  // V non paga nulla
  });

  it('Compensazione parziale — contributo 30 > premio 20: resta debitore di 10', () => {
    const res = calcolaSettlementTorneo([te(1, 30, 20), te(2, 0, 50)]);
    const v = res.arr.find(p => p.id_nome === 1)!;
    expect(v.contributo_residuo).toBe(10);
    expect(v.premio_residuo).toBe(0);
    expect(res.allocazioni[1]).toEqual([{ to: 2, amount: 10 }]); // paga il residuo a un altro winner
  });

});
