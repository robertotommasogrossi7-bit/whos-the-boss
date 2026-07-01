import { describe, it, expect } from 'vitest';

import { classificaSerata, sessioniDiSerata, vincitoriSerata } from './serate';
import type { Lega, PartitaGioco, SessioneGioco } from '../types';

/* R4 — punteggio serata multi-gioco. Regola (utente):
   vittoria = +1 a ogni vincitore (coppie: +1 a testa); patta = +0.5 a ogni
   partecipante; vincitore = totale ASSOLUTO più alto (>0), pari → più vincitori. */

const ME = 1, PIPPO = 2, FRANCO = 3;

function partita(
  id: number,
  vincitori: number[],
  opts: { pareggio?: boolean; partecipanti?: number[] } = {},
): PartitaGioco {
  return {
    id, ora_inizio: '21:00', ora_fine: '21:20',
    vincitori, pareggio: opts.pareggio ?? false,
    ...(opts.partecipanti ? { partecipanti: opts.partecipanti } : {}),
  };
}

function sessione(
  id: number, giocoId: string, partecipanti: number[], partite: PartitaGioco[], serataId?: number,
): SessioneGioco {
  return {
    id, giocoId, data: '2026-07-01', stato: 'chiusa', ora_inizio: '21:00', ora_fine: '23:00',
    partecipanti, partite, esitoPareggio: false,
    ...(serataId !== undefined ? { serataId } : {}),
  };
}

function mkLega(sessioniGioco: SessioneGioco[], partecipanti = [ME, PIPPO, FRANCO]): Lega {
  return {
    id: 1, nome: 'Lega', foto: '', nomi: [], partite: [],
    sessioneAttiva: undefined, serate_bg: [], _nid: 10, _pid: 10,
    sessioniGioco, serate: [{ id: 1, data: '2026-07-01', partecipanti }],
    _serataId: 2, personale: false,
  };
}

const punti = (lega: Lega, id: number) =>
  classificaSerata(lega, 1).find((r) => r.idNome === id)?.punti ?? 0;

describe('classificaSerata / vincitoriSerata (R4)', () => {
  it('esempio 1: 3 mie a scopa vs 3 di Pippo a tressette → 3–3, entrambi vincitori', () => {
    const scopa = sessione(1, 'scopa', [ME, PIPPO, FRANCO], [partita(1, [ME]), partita(2, [ME]), partita(3, [ME])], 1);
    const tressette = sessione(2, 'tressette', [ME, PIPPO, FRANCO], [partita(1, [PIPPO]), partita(2, [PIPPO]), partita(3, [PIPPO])], 1);
    const lega = mkLega([scopa, tressette]);
    expect(punti(lega, ME)).toBe(3);
    expect(punti(lega, PIPPO)).toBe(3);
    expect(punti(lega, FRANCO)).toBe(0);
    expect(vincitoriSerata(lega, 1)).toEqual([ME, PIPPO]);
  });

  it('esempio 2: Pippo 3+1=4, Franco 2+2+2=6 → vince Franco', () => {
    const scopa = sessione(1, 'scopa', [PIPPO, FRANCO],
      [partita(1, [PIPPO]), partita(2, [PIPPO]), partita(3, [PIPPO]), partita(4, [FRANCO]), partita(5, [FRANCO])], 1);
    const tressette = sessione(2, 'tressette', [PIPPO, FRANCO],
      [partita(1, [PIPPO]), partita(2, [FRANCO]), partita(3, [FRANCO])], 1);
    const briscola = sessione(3, 'briscola', [PIPPO, FRANCO],
      [partita(1, [FRANCO]), partita(2, [FRANCO])], 1);
    const lega = mkLega([scopa, tressette, briscola]);
    expect(punti(lega, PIPPO)).toBe(4);
    expect(punti(lega, FRANCO)).toBe(6);
    expect(vincitoriSerata(lega, 1)).toEqual([FRANCO]);
  });

  it('vittoria in coppia → +1 a ogni vincitore della coppia', () => {
    const s = sessione(1, 'x', [ME, PIPPO, FRANCO], [partita(1, [ME, PIPPO])], 1);
    const lega = mkLega([s]);
    expect(punti(lega, ME)).toBe(1);
    expect(punti(lega, PIPPO)).toBe(1);
    expect(punti(lega, FRANCO)).toBe(0);
  });

  it('patta → +0.5 a ogni partecipante della partita (override e default sessione)', () => {
    const override = sessione(1, 'x', [ME, PIPPO, FRANCO], [partita(1, [], { pareggio: true, partecipanti: [ME, PIPPO] })], 1);
    expect(punti(mkLega([override]), ME)).toBe(0.5);
    expect(punti(mkLega([override]), PIPPO)).toBe(0.5);
    expect(punti(mkLega([override]), FRANCO)).toBe(0);

    const def = sessione(1, 'x', [ME, PIPPO], [partita(1, [], { pareggio: true })], 1);
    expect(punti(mkLega([def]), ME)).toBe(0.5);
    expect(punti(mkLega([def]), PIPPO)).toBe(0.5);
  });

  it('parità con mix vittoria/patte (1 vs 0.5+0.5) → più vincitori', () => {
    const s = sessione(1, 'x', [ME, PIPPO], [
      partita(1, [ME]),                                   // ME +1
      partita(2, [], { pareggio: true, partecipanti: [PIPPO] }), // PIPPO +0.5
      partita(3, [], { pareggio: true, partecipanti: [PIPPO] }), // PIPPO +0.5
    ], 1);
    const lega = mkLega([s], [ME, PIPPO]);
    expect(punti(lega, ME)).toBe(1);
    expect(punti(lega, PIPPO)).toBe(1);
    expect(vincitoriSerata(lega, 1)).toEqual([ME, PIPPO]);
  });

  it('conta SOLO le sessioni della serata (isolamento via serataId)', () => {
    const inSerata = sessione(1, 'scopa', [ME], [partita(1, [ME])], 1);
    const altra = sessione(2, 'scopa', [PIPPO], [partita(1, [PIPPO]), partita(2, [PIPPO])], 99);
    const lega = mkLega([inSerata, altra]);
    expect(sessioniDiSerata(lega, 1)).toHaveLength(1);
    expect(punti(lega, ME)).toBe(1);
    expect(punti(lega, PIPPO)).toBe(0); // le sue vittorie sono in un'altra serata
    expect(vincitoriSerata(lega, 1)).toEqual([ME]);
  });

  it('serata senza partite decise → nessun vincitore', () => {
    const s = sessione(1, 'x', [ME, PIPPO], [], 1);
    expect(vincitoriSerata(mkLega([s]), 1)).toEqual([]);
  });
});
