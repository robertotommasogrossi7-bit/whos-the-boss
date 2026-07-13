import { describe, expect, it } from 'vitest';
import type { NomeGiocatore } from '../types';
import { costruisciIdUidMap, idSenzaUid, mappaGiocatori } from './idMap';

const g = (id: number, nome: string, uid?: string): NomeGiocatore => ({ id, nome, uid });

describe('costruisciIdUidMap', () => {
  it('costruisce le due direzioni id ↔ uid', () => {
    const { toUid, toLocal } = costruisciIdUidMap(
      [g(1, 'Anna', 'uid-a'), g(2, 'Bruno', 'uid-b')],
      (n) => n.id,
    );
    expect(toUid.get(1)).toBe('uid-a');
    expect(toUid.get(2)).toBe('uid-b');
    expect(toLocal.get('uid-a')).toBe(1);
    expect(toLocal.get('uid-b')).toBe(2);
  });

  it('round-trip: id → uid → id', () => {
    const { toUid, toLocal } = costruisciIdUidMap([g(7, 'Carla', 'uid-c')], (n) => n.id);
    const uid = toUid.get(7)!;
    expect(toLocal.get(uid)).toBe(7);
  });

  it('salta le entità senza uid (creazione offline a catena, S4)', () => {
    const { toUid, toLocal } = costruisciIdUidMap(
      [g(1, 'Anna', 'uid-a'), g(2, 'SenzaUid')],
      (n) => n.id,
    );
    expect(toUid.has(1)).toBe(true);
    expect(toUid.has(2)).toBe(false);
    expect(toUid.size).toBe(1);
    expect(toLocal.size).toBe(1);
  });

  it('lista vuota → mappe vuote', () => {
    const { toUid, toLocal } = costruisciIdUidMap([] as NomeGiocatore[], (n) => n.id);
    expect(toUid.size).toBe(0);
    expect(toLocal.size).toBe(0);
  });
});

describe('mappaGiocatori', () => {
  it('mappa i giocatori di una lega per id_nome', () => {
    const { toUid, toLocal } = mappaGiocatori([g(1, 'Anna', 'uid-a'), g(2, 'Bruno', 'uid-b')]);
    expect(toUid.get(2)).toBe('uid-b');
    expect(toLocal.get('uid-a')).toBe(1);
  });
});

describe('idSenzaUid', () => {
  it('elenca solo gli id delle entità senza uid', () => {
    expect(idSenzaUid([g(1, 'Anna', 'uid-a'), g(2, 'SenzaUid'), g(3, 'Pure')], (n) => n.id)).toEqual([2, 3]);
  });

  it('tutte con uid → lista vuota', () => {
    expect(idSenzaUid([g(1, 'Anna', 'uid-a')], (n) => n.id)).toEqual([]);
  });
});
