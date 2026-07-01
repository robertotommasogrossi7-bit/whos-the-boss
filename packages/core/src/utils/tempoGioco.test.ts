import { describe, it, expect } from 'vitest';

import { tempoGiocoMs } from './tempoGioco';

/* TAVOLO_LIVE_SPEC §4 — timer per-persona. */
describe('tempoGiocoMs', () => {
  it('solo accumulato (non seduto)', () => {
    expect(tempoGiocoMs({ tempo_gioco_ms: 5000 }, 9_999)).toBe(5000);
  });

  it('solo seduta in corso (nessun accumulato)', () => {
    expect(tempoGiocoMs({ seduto_da_ms: 1000 }, 4000)).toBe(3000);
  });

  it('somma accumulato + seduta in corso', () => {
    expect(tempoGiocoMs({ tempo_gioco_ms: 5000, seduto_da_ms: 1000 }, 4000)).toBe(8000);
  });

  it('giocatore "vuoto" (nessun campo) → 0', () => {
    expect(tempoGiocoMs({}, 12345)).toBe(0);
  });

  it('mai negativo (clock skew: seduto nel futuro)', () => {
    expect(tempoGiocoMs({ tempo_gioco_ms: 2000, seduto_da_ms: 5000 }, 4000)).toBe(2000);
  });

  it('doppia seduta: esce (congela) e rientra accumula bene', () => {
    // 1a seduta 1000→4000 = 3000, poi congelato in tempo_gioco_ms; riseduto a 10000
    const g = { tempo_gioco_ms: 3000, seduto_da_ms: 10000 };
    expect(tempoGiocoMs(g, 12000)).toBe(5000); // 3000 + 2000
  });
});
