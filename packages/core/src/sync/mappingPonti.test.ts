import { describe, expect, it } from 'vitest';
import { ponteFromUids, ponteToUids } from './mappingPonti';

describe('ponteToUids / ponteFromUids', () => {
  const idNomeAUid: Record<number, string> = { 1: 'uid-alice', 2: 'uid-bob', 3: 'uid-carol' };
  const uidToIdNome: Record<string, number> = { 'uid-alice': 1, 'uid-bob': 2, 'uid-carol': 3 };

  it('ponteToUids traduce una lista di id_nome in uid, preservando l\'ordine', () => {
    expect(ponteToUids([2, 1, 3], (id) => idNomeAUid[id])).toEqual(['uid-bob', 'uid-alice', 'uid-carol']);
  });

  it('ponteFromUids traduce una lista di uid in id_nome, preservando l\'ordine', () => {
    expect(ponteFromUids(['uid-carol', 'uid-alice'], (uid) => uidToIdNome[uid])).toEqual([3, 1]);
  });

  it('lista vuota → lista vuota (nessun partecipante/vincitore)', () => {
    expect(ponteToUids([], () => { throw new Error('non deve essere chiamata'); })).toEqual([]);
    expect(ponteFromUids([], () => { throw new Error('non deve essere chiamata'); })).toEqual([]);
  });

  it('round-trip identità', () => {
    const idNomi = [3, 1, 2];
    const uids = ponteToUids(idNomi, (id) => idNomeAUid[id]);
    const back = ponteFromUids(uids, (uid) => uidToIdNome[uid]);
    expect(back).toEqual(idNomi);
  });
});
