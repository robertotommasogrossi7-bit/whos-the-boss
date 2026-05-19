import { describe, it, expect } from 'vitest';
import {
  calcolaSettlementCash,
  calcolaGrandezze,
  type GiocatoreCashInput,
  type SettlementCash,
  type Trasferimento,
} from './settlement';

/* ══════════════════════════════════════════════════════
   TEST SETTLEMENT CASH — collaudo del modello SETTLEMENT_SPEC.md.
   I 6 esempi del §12 sono i test di accettazione obbligatori.
══════════════════════════════════════════════════════ */

/** Costruisce un giocatore di input. */
function g(
  id: number,
  entrata: number,
  entrata_pagata: boolean,
  fiche: number,
  ricariche: { importo: number; pagata: boolean }[] = [],
): GiocatoreCashInput {
  return { id_nome: id, entrata, entrata_pagata, ricariche, fiche };
}

/** Netto calcolato di un giocatore nel risultato. */
function netto(r: SettlementCash, id: number): number {
  const gc = r.giocatori.find(x => x.id_nome === id);
  if (!gc) throw new Error(`giocatore ${id} non trovato`);
  return gc.netto;
}

/** Ordina i trasferimenti per confronto stabile (l'ordine non conta). */
function norm(t: Trasferimento[]): Trasferimento[] {
  return [...t].sort(
    (a, b) => a.from - b.from || a.to - b.to || a.importo - b.importo,
  );
}

/** Totale ricevuto da un giocatore dai trasferimenti. */
function ricevuto(r: SettlementCash, id: number): number {
  return Math.round(
    r.trasferimenti.filter(t => t.to === id).reduce((a, t) => a + t.importo, 0) * 100,
  ) / 100;
}

describe('§12 — esempi di accettazione', () => {
  it('ES.1 — A versa entrata e vince, B versa entrata e perde', () => {
    // A: entrata 25 pagata, fiche 40 · B: entrata 25 pagata, fiche 10
    const r = calcolaSettlementCash([
      g(1, 25, true, 40),
      g(2, 25, true, 10),
    ]);
    expect(netto(r, 1)).toBe(15);
    expect(netto(r, 2)).toBe(-15);
    expect(norm(r.trasferimenti)).toEqual([{ from: 2, to: 1, importo: 15 }]);
    expect(r.sbilancio).toBe(0);
  });

  it('ES.2 — A non versa e perde, B versa e vince', () => {
    // A: entrata 25 NON pagata, fiche 10 · B: entrata 25 pagata, fiche 40
    const r = calcolaSettlementCash([
      g(1, 25, false, 10),
      g(2, 25, true, 40),
    ]);
    expect(netto(r, 1)).toBe(-15);
    expect(netto(r, 2)).toBe(15);
    expect(norm(r.trasferimenti)).toEqual([{ from: 1, to: 2, importo: 15 }]);
    expect(r.sbilancio).toBe(0);
  });

  it('ES.3 — A vince con entrata+ricarica non pagate (auto-compensazione)', () => {
    // A: entrata 25 + ricarica 25, entrambe NON pagate, fiche 110
    // altri perdono 60: B entrata 30 pagata fiche 0, C entrata 30 pagata fiche 0
    const r = calcolaSettlementCash([
      g(1, 25, false, 110, [{ importo: 25, pagata: false }]),
      g(2, 30, true, 0),
      g(3, 30, true, 0),
    ]);
    expect(netto(r, 1)).toBe(60);
    expect(netto(r, 2)).toBe(-30);
    expect(netto(r, 3)).toBe(-30);
    // A riceve in totale 60; il debito 50 si è eliso contro le vincite
    expect(ricevuto(r, 1)).toBe(60);
    expect(r.trasferimenti.every(t => t.to === 1)).toBe(true);
    expect(r.sbilancio).toBe(0);
  });

  it('ES.4 — A vince con ricarica non pagata (compensazione parziale)', () => {
    // A: entrata 25 pagata + ricarica 20 NON pagata, fiche 80
    // altri perdono 35: B entrata 35 pagata fiche 0
    const r = calcolaSettlementCash([
      g(1, 25, true, 80, [{ importo: 20, pagata: false }]),
      g(2, 35, true, 0),
    ]);
    expect(netto(r, 1)).toBe(35);
    expect(netto(r, 2)).toBe(-35);
    expect(ricevuto(r, 1)).toBe(35);
    expect(norm(r.trasferimenti)).toEqual([{ from: 2, to: 1, importo: 35 }]);
    expect(r.sbilancio).toBe(0);
  });

  it('ES.5 — entrate di taglia diversa', () => {
    // A: entrata 10 pagata, fiche 0 · B: entrata 100 pagata, fiche 110
    const r = calcolaSettlementCash([
      g(1, 10, true, 0),
      g(2, 100, true, 110),
    ]);
    expect(netto(r, 1)).toBe(-10);
    expect(netto(r, 2)).toBe(10);
    expect(norm(r.trasferimenti)).toEqual([{ from: 1, to: 2, importo: 10 }]);
    expect(r.sbilancio).toBe(0);
  });

  it('ES.6 — chi pareggia senza pagare si auto-compensa ed esce', () => {
    // A: entrata 25 NON pagata, fiche 25 (pareggia) · B, C in pari
    const r = calcolaSettlementCash([
      g(1, 25, false, 25),
      g(2, 25, true, 25),
      g(3, 25, true, 25),
    ]);
    expect(netto(r, 1)).toBe(0);
    expect(netto(r, 2)).toBe(0);
    expect(netto(r, 3)).toBe(0);
    expect(r.trasferimenti).toEqual([]);
    expect(r.sbilancio).toBe(0);
  });
});

describe('§4 — grandezze del giocatore', () => {
  it('dovuto, versato, mancante, netto con entrata e ricariche', () => {
    // entrata 25 pagata + ricarica 20 non pagata + ricarica 10 pagata, fiche 80
    const c = calcolaGrandezze(
      g(1, 25, true, 80, [
        { importo: 20, pagata: false },
        { importo: 10, pagata: true },
      ]),
    );
    expect(c.dovuto).toBe(55);    // 25 + 20 + 10
    expect(c.versato).toBe(35);   // 25 (entrata) + 10 (ricarica pagata)
    expect(c.mancante).toBe(20);  // 55 − 35
    expect(c.netto).toBe(25);     // 80 − 55
  });

  it('mancante non è mai negativo', () => {
    const c = calcolaGrandezze(g(1, 25, true, 200));
    expect(c.mancante).toBe(0);
  });
});

describe('§9-§10 — casi limite', () => {
  it('fiche non quadrano: sbilancio segnalato, calcolo procede comunque', () => {
    // A conta 50 di fiche ma B solo 10: lo stake totale è 50 → sbilancio +10
    const r = calcolaSettlementCash([
      g(1, 25, true, 50),
      g(2, 25, true, 10),
    ]);
    expect(netto(r, 1)).toBe(25);
    expect(netto(r, 2)).toBe(-15);
    expect(r.sbilancio).toBe(10);
    // greedy: B copre solo 15 dei 25 di bisogno di A, il residuo resta scoperto
    expect(norm(r.trasferimenti)).toEqual([{ from: 2, to: 1, importo: 15 }]);
  });

  it('importi con centesimi: trasferimento arrotondato a 2 decimali', () => {
    const r = calcolaSettlementCash([
      g(1, 25, true, 33.33),
      g(2, 25, true, 16.67),
    ]);
    expect(netto(r, 1)).toBe(8.33);
    expect(netto(r, 2)).toBe(-8.33);
    expect(norm(r.trasferimenti)).toEqual([{ from: 2, to: 1, importo: 8.33 }]);
    expect(r.sbilancio).toBe(0);
  });

  it('un solo vincitore alimentato da più perdenti', () => {
    // A vince 90; B, C, D perdono 30 ciascuno
    const r = calcolaSettlementCash([
      g(1, 30, true, 120),
      g(2, 30, true, 0),
      g(3, 30, true, 0),
      g(4, 30, true, 0),
    ]);
    expect(netto(r, 1)).toBe(90);
    expect(ricevuto(r, 1)).toBe(90);
    expect(r.trasferimenti).toHaveLength(3);
    expect(r.sbilancio).toBe(0);
  });

  it('nessun trasferimento se tutti pagano e nessuno vince', () => {
    const r = calcolaSettlementCash([
      g(1, 25, true, 25),
      g(2, 25, true, 25),
    ]);
    expect(r.trasferimenti).toEqual([]);
    expect(r.sbilancio).toBe(0);
  });
});
