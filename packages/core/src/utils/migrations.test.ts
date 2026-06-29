import { describe, it, expect } from 'vitest';
import { migrateLega } from './migrations';
import type { Lega, SessioneGioco } from '../types';

/** Lega minimale (solo i campi poker obbligatori); override per i casi. */
function legaBase(over: Partial<Lega> = {}): Lega {
  return {
    id: 1, nome: 'Test', foto: '', nomi: [], partite: [],
    sessioneAttiva: undefined, serate_bg: [], _nid: 1, _pid: 1,
    ...over,
  };
}

const sessioneEsempio: SessioneGioco = {
  id: 5, giocoId: 'scopa', data: '2026-06-01', stato: 'chiusa',
  ora_inizio: '20:00', ora_fine: '21:00', partecipanti: [1], partite: [],
  esitoPareggio: false,
};

describe('migrateLega — default campi multigioco (M1)', () => {

  it('imposta i default su una lega senza campi multigioco', () => {
    const l = legaBase();
    migrateLega(l);
    expect(l.sessioniGioco).toEqual([]);
    expect(l._sgid).toBe(1);
    expect(l.personale).toBe(false);
    expect(l.giochi).toBeUndefined(); // poker implicito: resta undefined
  });

  it('è idempotente: due chiamate danno lo stesso risultato', () => {
    const l = legaBase();
    migrateLega(l);
    const dopoUna = JSON.parse(JSON.stringify(l)) as Lega;
    migrateLega(l);
    const dopoDue = JSON.parse(JSON.stringify(l)) as Lega;
    expect(dopoDue).toEqual(dopoUna);
  });

  it('non sovrascrive valori multigioco già presenti', () => {
    const l = legaBase({ personale: true, _sgid: 9, sessioniGioco: [sessioneEsempio] });
    migrateLega(l);
    expect(l.personale).toBe(true);
    expect(l._sgid).toBe(9);
    expect(l.sessioniGioco).toHaveLength(1);
  });

  it('non tocca i campi poker esistenti', () => {
    const l = legaBase({ nome: 'Poker Night', _pid: 42 });
    migrateLega(l);
    expect(l.nome).toBe('Poker Night');
    expect(l._pid).toBe(42);
  });

});
