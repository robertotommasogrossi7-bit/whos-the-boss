import { describe, it, expect } from 'vitest';

import { mancante, nettoUscita, saldoUscita } from './uscita';

/* USCITA_CASH_SPEC §6 — esempi-test obbligatori. Buy-in (dovuto) 25 dove non
   diversamente detto. Verifica `saldoUscita` (valore − dovuto + versato) e segno. */
describe('saldoUscita (USCITA_CASH_SPEC §6)', () => {
  it('1. cassa copre: versò 25, esce fiche 60 → +60 (netto +35)', () => {
    expect(saldoUscita(60, 25, 25)).toBe(60);
    expect(nettoUscita(60, 25)).toBe(35);
    expect(mancante(25, 25)).toBe(0);
  });

  it('3. perdente non paga: versò 0, esce fiche 5 → −20 (deve 20)', () => {
    expect(saldoUscita(5, 25, 0)).toBe(-20);
    expect(mancante(25, 0)).toBe(25);
  });

  it('4. auto-compensazione vincente che non versò: versò 0, esce fiche 80 → +55 (NON 80)', () => {
    expect(saldoUscita(80, 25, 0)).toBe(55);
    expect(nettoUscita(80, 25)).toBe(55);
  });

  it('5. perdente che aveva versato: versò 25, esce fiche 5 → +5 (riprende le fiche, netto −20)', () => {
    expect(saldoUscita(5, 25, 25)).toBe(5);
    expect(nettoUscita(5, 25)).toBe(-20);
  });

  it('6. torneo, vincitore non pagò il buy-in: dovuto 25, premio 100, versato 0 → +75', () => {
    expect(saldoUscita(100, 25, 0)).toBe(75);
  });

  it('7. overpay: versò 30 (dovuto 25), esce fiche 40 → +45 (riprende anche i 5 in più, netto +15)', () => {
    expect(saldoUscita(40, 25, 30)).toBe(45);
    expect(nettoUscita(40, 25)).toBe(15);
    expect(mancante(25, 30)).toBe(0); // niente mancante quando ha versato di più
  });

  it('nessun movimento: dovuto 25, versò 0, esce fiche 25 → 0 (le fiche pagano il suo debito)', () => {
    expect(saldoUscita(25, 25, 0)).toBe(0);
  });

  it('con ricariche: dovuto = entrata+ricariche (25+25=50), versò 50, esce 30 → +30 (netto −20)', () => {
    expect(saldoUscita(30, 50, 50)).toBe(30);
    expect(nettoUscita(30, 50)).toBe(-20);
  });

  it('identità P&L: saldoUscita = nettoUscita + versato (sempre)', () => {
    const casi = [[60, 25, 25], [5, 25, 0], [80, 25, 0], [40, 25, 30]] as const;
    for (const [v, d, ver] of casi) {
      expect(saldoUscita(v, d, ver)).toBe(nettoUscita(v, d) + ver);
    }
  });
});
