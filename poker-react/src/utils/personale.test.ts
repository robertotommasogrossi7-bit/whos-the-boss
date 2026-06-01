import { describe, it, expect } from 'vitest';
import { creaLegaPersonale } from './personale';
import { migrateLega } from './migrations';

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
