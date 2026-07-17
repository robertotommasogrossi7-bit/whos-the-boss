import { describe, expect, it } from 'vitest';
import { soloVive, èVivo } from './tombstone';

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
