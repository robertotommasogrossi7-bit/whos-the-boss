import { describe, expect, it } from 'vitest';
import type { Partita } from '../types';
import { haCambiamentiLocaliNonSincronizzati } from '../sync/merge';
import { soloVive, tombstona, tombstonaPartita, èVivo } from './tombstone';

describe('tombstone — soloVive / èVivo', () => {
  it('èVivo: true senza deletedAt, false con', () => {
    expect(èVivo({})).toBe(true);
    expect(èVivo({ deletedAt: '2026-07-17T10:00:00.000Z' })).toBe(false);
  });

  it('soloVive tiene solo le righe senza deletedAt', () => {
    const xs = [{ id: 1 }, { id: 2, deletedAt: 'x' }, { id: 3 }];
    expect(soloVive(xs).map((x) => x.id)).toEqual([1, 3]);
  });

  it('soloVive(undefined) → [] (i campi multigioco della Lega sono opzionali)', () => {
    expect(soloVive(undefined)).toEqual([]);
  });

  it('non muta l\'array di partenza', () => {
    const xs = [{ id: 1, deletedAt: 'x' }];
    soloVive(xs);
    expect(xs.length).toBe(1);
  });
});

describe('tombstona', () => {
  const NOW = '2026-07-17T10:00:00.000Z';

  it('marca deletedAt e bumpa syncRev (dirty → il push lo spedisce)', () => {
    const out = tombstona({ uid: 'u1', syncRev: 1, syncedRev: 1 }, NOW);
    expect(out.deletedAt).toBe(NOW);
    expect(out.syncRev).toBe(2);
    expect(haCambiamentiLocaliNonSincronizzati(out)).toBe(true);
  });

  it('idempotente sul timestamp: già tombstonata → invariata (niente re-push)', () => {
    const gia = { uid: 'u1', syncRev: 5, syncedRev: 5, deletedAt: '2026-01-01T00:00:00.000Z' };
    expect(tombstona(gia, NOW)).toBe(gia); // stesso riferimento, data preservata
  });

  it('cascade: tombstonaPartita marca la partita e OGNI figlio con lo stesso now', () => {
    const p = {
      id: 1, uid: 'p1', syncRev: 1, syncedRev: 1,
      giocatori: [{ id_nome: 1, uid: 'g1', syncRev: 1, syncedRev: 1 }],
      settlements: [{ from: 1, to: 2, amount: 10, pagato: false, uid: 's1', syncRev: 1, syncedRev: 1 }],
    } as unknown as Partita;
    const out = tombstonaPartita(p, NOW);
    expect(out.deletedAt).toBe(NOW);
    expect(out.giocatori[0].deletedAt).toBe(NOW);
    expect(out.settlements[0].deletedAt).toBe(NOW);
  });
});
