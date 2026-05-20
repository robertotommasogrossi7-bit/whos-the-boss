import { describe, it, expect } from 'vitest';
import { calcolaSettlement } from './settlement';
import type { Trasferimento } from '../types';

function r(n: number) { return Math.round(n * 100) / 100; }

function transfers(result: ReturnType<typeof calcolaSettlement>): Trasferimento[] {
  return result.trasferimenti;
}

function netto(result: ReturnType<typeof calcolaSettlement>, id: number): number {
  return result.giocatori.find(g => g.id_nome === id)!.netto;
}

// §14 SETTLEMENT_SPEC.md — tutti e 9 gli scenari

describe('calcolaSettlement §14', () => {

  it('ES.1 — entrambi hanno versato, A vince: nessun trasferimento', () => {
    const res = calcolaSettlement([
      { id_nome: 1, dovuto: 25, versato: 25, fiche: 40 },
      { id_nome: 2, dovuto: 25, versato: 25, fiche: 10 },
    ]);
    expect(netto(res, 1)).toBe(r(15));
    expect(netto(res, 2)).toBe(r(-15));
    expect(transfers(res)).toHaveLength(0);
  });

  it('ES.2 — A non ha versato, fiche 10: A→B €15', () => {
    const res = calcolaSettlement([
      { id_nome: 1, dovuto: 25, versato: 0, fiche: 10 },
      { id_nome: 2, dovuto: 25, versato: 25, fiche: 40 },
    ]);
    expect(netto(res, 1)).toBe(r(-15));
    expect(netto(res, 2)).toBe(r(15));
    // A: mancante=25, cancelled=min(25,10)=10 → mancanteP=15, ficheP=0
    // B: bisogno=max(0, 40-25)=15
    expect(transfers(res)).toHaveLength(1);
    expect(transfers(res)[0]).toEqual({ from: 1, to: 2, importo: 15 });
  });

  it('ES.3 — caso "sa": mancante=10 elide fiche=10 → nessun trasferimento', () => {
    // sa: entrata 25, versato 25, ricarica 10 (dovuto 35), fiche 10
    // B: entrata 25, versato 25, fiche 50
    const res = calcolaSettlement([
      { id_nome: 1, dovuto: 35, versato: 25, fiche: 10 }, // sa
      { id_nome: 2, dovuto: 25, versato: 25, fiche: 50 }, // B
    ]);
    expect(netto(res, 1)).toBe(r(-25));
    expect(netto(res, 2)).toBe(r(25));
    // sa: mancante=10, cancelled=min(10,10)=10 → mancanteP=0
    expect(transfers(res)).toHaveLength(0);
    const sa = res.giocatori.find(g => g.id_nome === 1)!;
    expect(sa.mancanteP).toBe(0);
    expect(sa.ficheP).toBe(0);
  });

  it('ES.4 — A mancante 50 elide contro fiche 110: nessun trasferimento', () => {
    // A: entrata 25+ricarica 25, versato 0, fiche 110
    // B,C,D: entrata 25 versata 25, fiche 5 ciascuno
    const res = calcolaSettlement([
      { id_nome: 1, dovuto: 50, versato: 0,  fiche: 110 },
      { id_nome: 2, dovuto: 25, versato: 25, fiche: 5 },
      { id_nome: 3, dovuto: 25, versato: 25, fiche: 5 },
      { id_nome: 4, dovuto: 25, versato: 25, fiche: 5 },
    ]);
    expect(netto(res, 1)).toBe(r(60));
    expect(netto(res, 2)).toBe(r(-20));
    expect(netto(res, 3)).toBe(r(-20));
    expect(netto(res, 4)).toBe(r(-20));
    // A: mancante=50, cancelled=min(50,110)=50 → mancanteP=0
    expect(transfers(res)).toHaveLength(0);
  });

  it('ES.5 — A mancante 20 elide contro fiche 80: nessun trasferimento', () => {
    // A: entrata 25+ricarica 20 versato 0, fiche 80 (versato 25)
    // B: fiche 0, C: fiche 15
    const res = calcolaSettlement([
      { id_nome: 1, dovuto: 45, versato: 25, fiche: 80 }, // A
      { id_nome: 2, dovuto: 25, versato: 25, fiche: 0  }, // B
      { id_nome: 3, dovuto: 25, versato: 25, fiche: 15 }, // C
    ]);
    expect(netto(res, 1)).toBe(r(35));
    expect(netto(res, 2)).toBe(r(-25));
    expect(netto(res, 3)).toBe(r(-10));
    // A: mancante=20, cancelled=min(20,80)=20 → mancanteP=0
    expect(transfers(res)).toHaveLength(0);
  });

  it('ES.6 — A perde tutto (fiche 0), B guadagna 10: nessun trasferimento', () => {
    const res = calcolaSettlement([
      { id_nome: 1, dovuto: 10,  versato: 10,  fiche: 0   },
      { id_nome: 2, dovuto: 100, versato: 100, fiche: 110 },
    ]);
    expect(netto(res, 1)).toBe(r(-10));
    expect(netto(res, 2)).toBe(r(10));
    // A: mancante=0, B: bisogno=max(0, 110-100)=10 ma nessun debitore con mancanteP>0
    expect(transfers(res)).toHaveLength(0);
  });

  it('ES.7 — A pareggio esatto (versato 0, fiche 25): auto-compensazione totale', () => {
    const res = calcolaSettlement([
      { id_nome: 1, dovuto: 25, versato: 0,  fiche: 25 }, // A
      { id_nome: 2, dovuto: 25, versato: 25, fiche: 25 }, // B
      { id_nome: 3, dovuto: 25, versato: 25, fiche: 25 }, // C
    ]);
    expect(netto(res, 1)).toBe(0);
    expect(netto(res, 2)).toBe(0);
    expect(netto(res, 3)).toBe(0);
    // A: mancante=25, cancelled=min(25,25)=25 → mancanteP=0
    const a = res.giocatori.find(g => g.id_nome === 1)!;
    expect(a.mancanteP).toBe(0);
    expect(transfers(res)).toHaveLength(0);
  });

  it('ES.8 — overpay A (versato 30>dovuto 25): nessun trasferimento, eccedenza dal piatto', () => {
    const res = calcolaSettlement([
      { id_nome: 1, dovuto: 25, versato: 30, fiche: 40 }, // A overpay 5
      { id_nome: 2, dovuto: 25, versato: 25, fiche: 10 }, // B
    ]);
    expect(netto(res, 1)).toBe(r(15));
    expect(netto(res, 2)).toBe(r(-15));
    const a = res.giocatori.find(g => g.id_nome === 1)!;
    expect(a.eccedenza).toBe(5);
    expect(transfers(res)).toHaveLength(0);
  });

  it('ES.9 — A non ha versato e fiche 0: trasferimento A→C €25', () => {
    const res = calcolaSettlement([
      { id_nome: 1, dovuto: 25, versato: 0,  fiche: 0  }, // A
      { id_nome: 2, dovuto: 25, versato: 25, fiche: 25 }, // B
      { id_nome: 3, dovuto: 25, versato: 25, fiche: 50 }, // C
    ]);
    expect(netto(res, 1)).toBe(r(-25));
    expect(netto(res, 2)).toBe(r(0));
    expect(netto(res, 3)).toBe(r(25));
    // A: mancante=25, fiche=0 → mancanteP=25
    // C: bisogno=max(0, 50-25)=25
    expect(transfers(res)).toHaveLength(1);
    expect(transfers(res)[0]).toEqual({ from: 1, to: 3, importo: 25 });
  });

});
