import { describe, expect, it } from 'vitest';
import type { StateStorage } from 'zustand/middleware';
import { chiaveStorage, migraBlobUnicoSeNecessario, perAccountStorage } from './accountStorage';

function fakeStorage(seed: Record<string, string> = {}): StateStorage & { dump: () => Record<string, string> } {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (name) => map.get(name) ?? null,
    setItem: (name, value) => { map.set(name, value); },
    removeItem: (name) => { map.delete(name); },
    dump: () => Object.fromEntries(map),
  };
}

describe('chiaveStorage', () => {
  it('senza accountId ritorna la chiave base invariata', () => {
    expect(chiaveStorage('pokerTracker_v2', null)).toBe('pokerTracker_v2');
    expect(chiaveStorage('pokerTracker_v2', undefined)).toBe('pokerTracker_v2');
  });
  it('con accountId ritorna la chiave namespaced', () => {
    expect(chiaveStorage('pokerTracker_v2', 'a1')).toBe('pokerTracker_v2:a1');
  });
});

describe('perAccountStorage', () => {
  it('senza account attivo legge/scrive la chiave legacy', async () => {
    const base = fakeStorage({ pokerTracker_v2: 'legacy' });
    const s = perAccountStorage(base, () => null);
    expect(await s.getItem('pokerTracker_v2')).toBe('legacy');
    await s.setItem('pokerTracker_v2', 'nuovo');
    expect(base.dump()['pokerTracker_v2']).toBe('nuovo');
  });

  it('con account attivo re-instrada su chiave namespaced, non tocca la legacy', async () => {
    const base = fakeStorage({ pokerTracker_v2: 'legacy' });
    let accountId: string | null = 'a1';
    const s = perAccountStorage(base, () => accountId);
    await s.setItem('pokerTracker_v2', 'dati-a1');
    expect(base.dump()['pokerTracker_v2:a1']).toBe('dati-a1');
    expect(base.dump()['pokerTracker_v2']).toBe('legacy'); // invariata

    accountId = 'a2';
    expect(await s.getItem('pokerTracker_v2')).toBeNull(); // account diverso, niente dati suoi
    await s.setItem('pokerTracker_v2', 'dati-a2');
    expect(base.dump()['pokerTracker_v2:a2']).toBe('dati-a2');
    expect(base.dump()['pokerTracker_v2:a1']).toBe('dati-a1'); // a1 intatto
  });

  it('removeItem tocca solo la chiave dell\'account corrente', async () => {
    const base = fakeStorage({ 'k:a1': 'x', 'k:a2': 'y' });
    const s = perAccountStorage(base, () => 'a1');
    await s.removeItem('k');
    expect(base.dump()['k:a1']).toBeUndefined();
    expect(base.dump()['k:a2']).toBe('y');
  });
});

describe('migraBlobUnicoSeNecessario', () => {
  it('copia il blob legacy nella chiave dell\'account se questa è vuota', async () => {
    const base = fakeStorage({ pokerTracker_v2: '{"leghe":[]}' });
    await migraBlobUnicoSeNecessario(base, 'pokerTracker_v2', 'a1');
    expect(base.dump()['pokerTracker_v2:a1']).toBe('{"leghe":[]}');
    expect(base.dump()['pokerTracker_v2']).toBe('{"leghe":[]}'); // legacy non cancellata
  });

  it('idempotente: se la chiave account ha già qualcosa, non la sovrascrive', async () => {
    const base = fakeStorage({ pokerTracker_v2: 'legacy', 'pokerTracker_v2:a1': 'già-suo' });
    await migraBlobUnicoSeNecessario(base, 'pokerTracker_v2', 'a1');
    expect(base.dump()['pokerTracker_v2:a1']).toBe('già-suo');
  });

  it('nessun blob legacy → no-op (installazione pulita)', async () => {
    const base = fakeStorage({});
    await migraBlobUnicoSeNecessario(base, 'pokerTracker_v2', 'a1');
    expect(base.dump()['pokerTracker_v2:a1']).toBeUndefined();
  });

  it('due account diversi sullo stesso device ricevono ciascuno la propria copia', async () => {
    const base = fakeStorage({ pokerTracker_v2: 'condiviso' });
    await migraBlobUnicoSeNecessario(base, 'pokerTracker_v2', 'a1');
    await migraBlobUnicoSeNecessario(base, 'pokerTracker_v2', 'a2');
    expect(base.dump()['pokerTracker_v2:a1']).toBe('condiviso');
    expect(base.dump()['pokerTracker_v2:a2']).toBe('condiviso');
  });
});
