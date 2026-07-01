import { describe, it, expect } from 'vitest';
import { creaLegaPersonale, assicuraGiocatorePersonale, idBloccatiInclusi, èSeiTuRecord } from './personale';
import { migrateLega } from './migrations';
import type { User } from '../types';

const u = (over: Partial<User> & { username: string }): User => ({ ...over });

describe('creaLegaPersonale — lega speciale Personale (§2)', () => {
  it('crea una lega marcata personale coi default multigioco', () => {
    const l = creaLegaPersonale(7);
    expect(l.id).toBe(7);
    expect(l.nome).toBe('Personale');
    expect(l.personale).toBe(true);
    expect(l.sessioniGioco).toEqual([]);
    expect(l._sgid).toBe(1);
    expect(l.nomi).toEqual([]);
    expect(l.partite).toEqual([]);
    expect(l.sessioneAttiva).toBeUndefined();
  });

  it('è già migrata: migrateLega non la modifica (idempotente)', () => {
    const l = creaLegaPersonale(1);
    const prima = JSON.parse(JSON.stringify(l));
    migrateLega(l);
    expect(JSON.parse(JSON.stringify(l))).toEqual(prima);
  });
});

describe('èSeiTuRecord — identità per account (R6)', () => {
  it('true se accountId del record combacia con quello loggato', () => {
    expect(èSeiTuRecord({ accountId: 'a1' }, 'a1')).toBe(true);
  });
  it('false se accountId diverso', () => {
    expect(èSeiTuRecord({ accountId: 'a1' }, 'a2')).toBe(false);
  });
  it('false se il record è un guest (senza accountId)', () => {
    expect(èSeiTuRecord({}, 'a1')).toBe(false);
  });
  it('false se non sei loggato (accountId assente)', () => {
    expect(èSeiTuRecord({ accountId: 'a1' }, null)).toBe(false);
    expect(èSeiTuRecord({ accountId: 'a1' }, undefined)).toBe(false);
  });
});

describe('assicuraGiocatorePersonale — aggancia l\'account (R6)', () => {
  it('crea il record dell\'account su Personale vuoto (nome = username)', () => {
    const l = creaLegaPersonale(1); // _nid = 1
    const out = assicuraGiocatorePersonale(l, u({ username: 'zelda', id: 'a1' }));
    expect(out.nomi).toEqual([{ id: 1, nome: 'zelda', accountId: 'a1' }]);
    expect(out._nid).toBe(2);
  });

  it('usa il displayName come nome se presente', () => {
    const l = creaLegaPersonale(1);
    const out = assicuraGiocatorePersonale(l, u({ username: 'mario_rossi', id: 'a1', displayName: 'Mario Rossi' }));
    expect(out.nomi).toEqual([{ id: 1, nome: 'Mario Rossi', accountId: 'a1' }]);
  });

  it('idempotente: se il record dell\'account c\'è già → invariata (stesso ref)', () => {
    const l1 = assicuraGiocatorePersonale(creaLegaPersonale(1), u({ username: 'zelda', id: 'a1' }));
    const l2 = assicuraGiocatorePersonale(l1, u({ username: 'zelda', id: 'a1' }));
    expect(l2).toBe(l1);
  });

  it('MIGRA il vecchio record creato per nome (senza accountId): lo reclama, stesso id', () => {
    const l = { ...creaLegaPersonale(1), nomi: [{ id: 1, nome: 'Anna' }], _nid: 2 };
    const out = assicuraGiocatorePersonale(l, u({ username: 'anna', id: 'a1' }));
    expect(out.nomi).toEqual([{ id: 1, nome: 'Anna', accountId: 'a1' }]);
    expect(out._nid).toBe(2); // nessun nuovo record
  });

  it('NON ruba un record già di un ALTRO account (più login sullo stesso device)', () => {
    const l = { ...creaLegaPersonale(1), nomi: [{ id: 1, nome: 'anna', accountId: 'a1' }], _nid: 2 };
    const out = assicuraGiocatorePersonale(l, u({ username: 'anna', id: 'a2' }));
    expect(out.nomi).toHaveLength(2);
    expect(out.nomi[1]).toEqual({ id: 2, nome: 'anna', accountId: 'a2' });
  });

  it('fallback demo senza id: dedup per nome come prima', () => {
    const l = { ...creaLegaPersonale(1), nomi: [{ id: 1, nome: 'anna' }], _nid: 2 };
    expect(assicuraGiocatorePersonale(l, u({ username: 'ANNA' }))).toBe(l);
  });

  it('username vuoto senza id → no-op difensivo', () => {
    const l = creaLegaPersonale(1);
    expect(assicuraGiocatorePersonale(l, u({ username: '   ' }))).toBe(l);
  });
});

describe('idBloccatiInclusi — lock partecipazione (R6)', () => {
  it('Personale: ritorna l\'id del record col tuo accountId', () => {
    const l = { ...creaLegaPersonale(1), nomi: [{ id: 1, nome: 'Zelda', accountId: 'a1' }, { id: 2, nome: 'Link' }] };
    expect(idBloccatiInclusi(l, 'a1')).toEqual([1]);
  });

  it('Personale ma accountId assente → nessun lock', () => {
    const l = { ...creaLegaPersonale(1), nomi: [{ id: 1, nome: 'Zelda', accountId: 'a1' }] };
    expect(idBloccatiInclusi(l, null)).toEqual([]);
    expect(idBloccatiInclusi(l, '')).toEqual([]);
  });

  it('lega normale (non Personale) → mai lock', () => {
    const l = { ...creaLegaPersonale(1), personale: false, nomi: [{ id: 1, nome: 'Zelda', accountId: 'a1' }] };
    expect(idBloccatiInclusi(l, 'a1')).toEqual([]);
  });

  it('Personale senza il tuo record → nessun lock', () => {
    const l = { ...creaLegaPersonale(1), nomi: [{ id: 1, nome: 'Link', accountId: 'a2' }] };
    expect(idBloccatiInclusi(l, 'a1')).toEqual([]);
  });
});
