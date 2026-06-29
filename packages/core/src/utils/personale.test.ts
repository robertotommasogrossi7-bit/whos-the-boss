import { describe, it, expect } from 'vitest';
import { creaLegaPersonale, assicuraGiocatorePersonale, idBloccatiInclusi } from './personale';
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

describe('assicuraGiocatorePersonale — auto-add "sei tu" (#4.5)', () => {
  it('aggiunge il giocatore su un Personale vuoto, usando _nid', () => {
    const l = creaLegaPersonale(1); // _nid = 1
    const out = assicuraGiocatorePersonale(l, 'Zelda');
    expect(out.nomi).toEqual([{ id: 1, nome: 'Zelda' }]);
    expect(out._nid).toBe(2);
  });

  it('idempotente: richiamata 2× non duplica', () => {
    const l = creaLegaPersonale(1);
    const a = assicuraGiocatorePersonale(l, 'Zelda');
    const b = assicuraGiocatorePersonale(a, 'Zelda');
    expect(b).toBe(a); // stesso riferimento → lega invariata
    expect(b.nomi).toHaveLength(1);
  });

  it('match per nome normalizzato: "ANNA" aggancia "anna" senza doppione', () => {
    const l = { ...creaLegaPersonale(1), nomi: [{ id: 1, nome: 'anna' }], _nid: 2 };
    const out = assicuraGiocatorePersonale(l, 'ANNA');
    expect(out).toBe(l); // invariata
    expect(out.nomi).toHaveLength(1);
  });

  it('match a meno di accenti: "Jose" aggancia "José"', () => {
    const l = { ...creaLegaPersonale(1), nomi: [{ id: 1, nome: 'José' }], _nid: 2 };
    const out = assicuraGiocatorePersonale(l, 'Jose');
    expect(out).toBe(l);
  });

  it('salva il nome con trim ma case originale', () => {
    const l = creaLegaPersonale(1);
    const out = assicuraGiocatorePersonale(l, '  Mario Rossi  ');
    expect(out.nomi).toEqual([{ id: 1, nome: 'Mario Rossi' }]);
  });

  it('username vuoto → no-op difensivo', () => {
    const l = creaLegaPersonale(1);
    expect(assicuraGiocatorePersonale(l, '   ')).toBe(l);
  });
});

describe('idBloccatiInclusi — lock partecipazione (#4.5)', () => {
  it('Personale: ritorna l\'id "sei tu" che matcha lo username', () => {
    const l = { ...creaLegaPersonale(1), nomi: [{ id: 1, nome: 'Zelda' }, { id: 2, nome: 'Link' }] };
    expect(idBloccatiInclusi(l, 'zelda')).toEqual([1]);
  });

  it('Personale ma username assente → nessun lock', () => {
    const l = { ...creaLegaPersonale(1), nomi: [{ id: 1, nome: 'Zelda' }] };
    expect(idBloccatiInclusi(l, null)).toEqual([]);
    expect(idBloccatiInclusi(l, '')).toEqual([]);
  });

  it('lega normale (non Personale) → mai lock, anche con nome che matcha', () => {
    const l = { ...creaLegaPersonale(1), personale: false, nomi: [{ id: 1, nome: 'Zelda' }] };
    expect(idBloccatiInclusi(l, 'Zelda')).toEqual([]);
  });

  it('Personale senza il tuo record (non ancora aggiunto) → nessun lock', () => {
    const l = { ...creaLegaPersonale(1), nomi: [{ id: 1, nome: 'Link' }] };
    expect(idBloccatiInclusi(l, 'Zelda')).toEqual([]);
  });
});
