import { describe, it, expect } from 'vitest';
import { creaLegaPersonale, assicuraGiocatorePersonale, idBloccatiInclusi, èSeiTuRecord, reclamaGiocatoreInLega } from './personale';
import { migrateLega } from './migrations';
import type { Lega, User } from '../types';

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
    expect(out.nomi).toMatchObject([{ id: 1, nome: 'zelda', accountId: 'a1' }]);
    expect(out.nomi[0]?.uid).toBeTruthy();
    expect(out._nid).toBe(2);
  });

  it('usa il displayName come nome se presente', () => {
    const l = creaLegaPersonale(1);
    const out = assicuraGiocatorePersonale(l, u({ username: 'mario_rossi', id: 'a1', displayName: 'Mario Rossi' }));
    expect(out.nomi).toMatchObject([{ id: 1, nome: 'Mario Rossi', accountId: 'a1' }]);
  });

  it('idempotente: se il record dell\'account c\'è già → invariata (stesso ref)', () => {
    const l1 = assicuraGiocatorePersonale(creaLegaPersonale(1), u({ username: 'zelda', id: 'a1' }));
    const l2 = assicuraGiocatorePersonale(l1, u({ username: 'zelda', id: 'a1' }));
    expect(l2).toBe(l1);
  });

  it('MIGRA il vecchio record creato per nome (senza accountId): lo reclama, stesso id', () => {
    const l = { ...creaLegaPersonale(1), nomi: [{ id: 1, nome: 'Anna' }], _nid: 2 };
    const out = assicuraGiocatorePersonale(l, u({ username: 'anna', id: 'a1' }));
    // toMatchObject: dal 2026-07-17 il reclamo aggiunge anche i campi sync
    // (touchSync, R7.4a-2) — qui interessa l'identità, non il tracking.
    expect(out.nomi).toMatchObject([{ id: 1, nome: 'Anna', accountId: 'a1' }]);
    expect(out._nid).toBe(2); // nessun nuovo record
  });

  it('NON ruba un record già di un ALTRO account (più login sullo stesso device)', () => {
    const l = { ...creaLegaPersonale(1), nomi: [{ id: 1, nome: 'anna', accountId: 'a1' }], _nid: 2 };
    const out = assicuraGiocatorePersonale(l, u({ username: 'anna', id: 'a2' }));
    expect(out.nomi).toHaveLength(2);
    expect(out.nomi[1]).toMatchObject({ id: 2, nome: 'anna', accountId: 'a2' });
  });

  it('fallback demo senza id: dedup per nome come prima', () => {
    const l = { ...creaLegaPersonale(1), nomi: [{ id: 1, nome: 'anna' }], _nid: 2 };
    expect(assicuraGiocatorePersonale(l, u({ username: 'ANNA' }))).toBe(l);
  });

  it('username vuoto senza id → no-op difensivo', () => {
    const l = creaLegaPersonale(1);
    expect(assicuraGiocatorePersonale(l, u({ username: '   ' }))).toBe(l);
  });

  it('M8: reclama per DISPLAYNAME (non solo username) — niente doppione', () => {
    // guest "Mario" preesistente + registrazione username="mario_rossi" displayName="Mario":
    // lo username non combacia col guest, ma il displayName sì -> deve reclamare, non duplicare.
    const l = { ...creaLegaPersonale(1), nomi: [{ id: 1, nome: 'Mario' }], _nid: 2 };
    const out = assicuraGiocatorePersonale(l, u({ username: 'mario_rossi', id: 'a1', displayName: 'Mario' }));
    expect(out.nomi).toMatchObject([{ id: 1, nome: 'Mario', accountId: 'a1' }]);
    expect(out._nid).toBe(2); // nessun secondo "Mario"
  });
});

function mkLega(over: Partial<Lega> & { nomi: Lega['nomi'] }): Lega {
  return { id: 1, nome: 'Lega', foto: '', partite: [], sessioneAttiva: undefined, serate_bg: [], _nid: 100, _pid: 1, ...over };
}

describe('reclamaGiocatoreInLega — migrazione one-shot claim-by-name (R6-B2/M7)', () => {
  it('reclama il record libero che combacia per USERNAME, stesso id', () => {
    const l = mkLega({ nomi: [{ id: 1, nome: 'giulio_rossi' }] });
    const out = reclamaGiocatoreInLega(l, u({ username: 'giulio_rossi', id: 'a1' }));
    expect(out.nomi).toMatchObject([{ id: 1, nome: 'giulio_rossi', accountId: 'a1' }]);
  });

  /* R7.4a-2: agganciare l'accountId cambia la colonna `account_id` nel cloud.
     Senza touchSync la rivendicazione resterebbe su QUESTO device e gli altri
     continuerebbero a vedere un ospite libero. */
  it('il reclamo rimette la riga in coda per il push (touchSync)', () => {
    const l = mkLega({ nomi: [{ id: 1, nome: 'giulio_rossi', uid: 'u1', syncRev: 3, syncedRev: 3 }] });
    const out = reclamaGiocatoreInLega(l, u({ username: 'giulio_rossi', id: 'a1' }));
    expect(out.nomi[0].syncRev).toBe(4);
    expect(out.nomi[0].syncedRev).toBe(3);  // il server è fermo → sporca
  });

  it('reclama per DISPLAYNAME quando lo username non combacia (M8)', () => {
    const l = mkLega({ nomi: [{ id: 1, nome: 'Giulio' }] });
    const out = reclamaGiocatoreInLega(l, u({ username: 'g_rossi_99', id: 'a1', displayName: 'Giulio' }));
    expect(out.nomi[0]).toMatchObject({ id: 1, nome: 'Giulio', accountId: 'a1' });
  });

  it('idempotente: già reclamato → stesso riferimento', () => {
    const l = mkLega({ nomi: [{ id: 1, nome: 'Giulio', accountId: 'a1' }] });
    expect(reclamaGiocatoreInLega(l, u({ username: 'giulio', id: 'a1' }))).toBe(l);
  });

  it('nessun match → stesso riferimento, NON crea (a differenza del Personale)', () => {
    const l = mkLega({ nomi: [{ id: 1, nome: 'Anna' }] });
    const out = reclamaGiocatoreInLega(l, u({ username: 'giulio', id: 'a1' }));
    expect(out).toBe(l);
    expect(out.nomi).toHaveLength(1);
  });

  it('NON ruba un record già di un ALTRO account', () => {
    const l = mkLega({ nomi: [{ id: 1, nome: 'giulio', accountId: 'a1' }] });
    const out = reclamaGiocatoreInLega(l, u({ username: 'giulio', id: 'a2' }));
    expect(out).toBe(l);
  });

  it('senza accountId (demo) → no-op', () => {
    const l = mkLega({ nomi: [{ id: 1, nome: 'giulio' }] });
    expect(reclamaGiocatoreInLega(l, u({ username: 'giulio' }))).toBe(l);
  });

  it('funziona anche su una lega NON personale (il caso d\'uso reale)', () => {
    const l = mkLega({ personale: false, nomi: [{ id: 1, nome: 'giulio' }, { id: 2, nome: 'Anna' }] });
    const out = reclamaGiocatoreInLega(l, u({ username: 'giulio', id: 'a1' }));
    expect(out.nomi[0]?.accountId).toBe('a1');
    expect(out.nomi[1]?.accountId).toBeUndefined();
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
