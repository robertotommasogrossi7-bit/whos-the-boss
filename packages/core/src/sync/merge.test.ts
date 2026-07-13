import { describe, expect, it } from 'vitest';
import { haCambiamentiLocaliNonSincronizzati, mergeLWW, type ConSync } from './merge';

describe('haCambiamentiLocaliNonSincronizzati (contatore, R7.2d-2)', () => {
  it('false se non ha campi di sync (riga mai toccata dal sync)', () => {
    expect(haCambiamentiLocaliNonSincronizzati({})).toBe(false);
  });

  it('true se creata ma mai sincronizzata (syncRev=1, syncedRev assente)', () => {
    expect(haCambiamentiLocaliNonSincronizzati({ syncRev: 1 })).toBe(true);
  });

  it('true se la revisione locale supera quella confermata dal server', () => {
    expect(haCambiamentiLocaliNonSincronizzati({ syncRev: 2, syncedRev: 1 })).toBe(true);
  });

  it('false se la revisione locale è già confermata dal server', () => {
    expect(haCambiamentiLocaliNonSincronizzati({ syncRev: 1, syncedRev: 1 })).toBe(false);
    expect(haCambiamentiLocaliNonSincronizzati({ syncRev: 5, syncedRev: 5 })).toBe(false);
  });

  it('NON usa gli orologi: clock a caso non cambia il verdetto', () => {
    // syncUpdatedAt "vecchio" e lastSyncedAt "nuovo" ingannerebbero il vecchio confronto a timestamp;
    // col contatore conta solo syncRev vs syncedRev.
    expect(haCambiamentiLocaliNonSincronizzati({
      syncRev: 2, syncedRev: 1,
      syncUpdatedAt: '1990-01-01T00:00:00.000Z',
      lastSyncedAt: '2026-07-13T00:00:00.000Z',
    })).toBe(true);
  });
});

describe('mergeLWW (contatore + delete-wins, R7.2d-2)', () => {
  const daCloud = { nome: 'Dal cloud', syncRev: 3, syncedRev: 3 };

  it('nessuna riga locale: prende il cloud', () => {
    expect(mergeLWW(undefined, daCloud)).toEqual(daCloud);
  });

  it('locale pulito (già sincronizzato): vince il cloud', () => {
    const locale = { nome: 'Locale vecchio', syncRev: 1, syncedRev: 1 };
    expect(mergeLWW(locale, daCloud)).toEqual(daCloud);
  });

  it('locale con edit non sincronizzato: resta locale (si riconcilia al prossimo push)', () => {
    const locale = { nome: 'Locale con edit', syncRev: 2, syncedRev: 1 };
    expect(mergeLWW(locale, daCloud)).toEqual(locale);
  });

  it('locale creato e mai sincronizzato: resta locale', () => {
    const locale = { nome: 'Nuovo locale', syncRev: 1 };
    expect(mergeLWW(locale, daCloud)).toEqual(locale);
  });

  it('delete-wins: tombstone nel cloud vince anche su un locale con edit non sincronizzato', () => {
    const cloudDeleted = { nome: 'Cancellato altrove', syncRev: 3, syncedRev: 3, deletedAt: '2026-07-13T10:00:00.000Z' };
    const localeSporco = { nome: 'Modificato qui', syncRev: 2, syncedRev: 1 };
    expect(mergeLWW(localeSporco, cloudDeleted)).toEqual(cloudDeleted);
  });

  it('delete-wins: tombstone locale non viene resuscitato da un cloud vivo "più recente"', () => {
    const localeDeleted = { nome: 'Cancellato qui', syncRev: 2, syncedRev: 1, deletedAt: '2026-07-13T10:00:00.000Z' };
    const cloudVivo = { nome: 'Ancora vivo sul cloud', syncRev: 9, syncedRev: 9 };
    expect(mergeLWW(localeDeleted, cloudVivo)).toEqual(localeDeleted);
  });
});

/* Property-based test (chiesto da entrambi i red team, R7.2d-2). Niente
   fast-check: generatore casuale in-test, coerente col resto del progetto
   (zero dipendenze nuove). Verifica le INVARIANTI di mergeLWW su tanti input,
   non singoli casi. Se una riga rompe, il messaggio la stampa per riprodurla. */
describe('mergeLWW — proprietà su input casuali', () => {
  type Riga = ConSync & { nome: string };
  const N = 500;
  const rint = (max: number) => Math.floor(Math.random() * max);
  const forse = <T>(v: T): T | undefined => (Math.random() < 0.5 ? v : undefined);
  const rigaCasuale = (): Riga => ({
    nome: Math.random().toString(36).slice(2, 6),
    syncRev: forse(rint(5)),
    syncedRev: forse(rint(5)),
    deletedAt: forse(new Date(Date.now() - rint(10000)).toISOString()),
  });
  const coppie = Array.from({ length: N }, () => [rigaCasuale(), rigaCasuale()] as const);

  it('il risultato è SEMPRE uno dei due input, mai un ibrido', () => {
    for (const [l, c] of coppie) {
      const res = mergeLWW(l, c);
      expect(res === l || res === c, `ibrido su ${JSON.stringify({ l, c })}`).toBe(true);
    }
  });

  it('delete-wins: un tombstone (cloud o locale) è sempre nel risultato se presente', () => {
    for (const [l, c] of coppie) {
      const res = mergeLWW(l, c);
      if (c.deletedAt) expect(res, JSON.stringify({ l, c })).toBe(c);
      else if (l.deletedAt) expect(res, JSON.stringify({ l, c })).toBe(l);
    }
  });

  it('senza tombstone: vince il locale se e solo se è sporco', () => {
    for (const [l, c] of coppie) {
      if (l.deletedAt || c.deletedAt) continue;
      const res = mergeLWW(l, c);
      expect(res === l, JSON.stringify({ l, c })).toBe(haCambiamentiLocaliNonSincronizzati(l));
    }
  });

  it('idempotenza: rifare lo stesso pull non cambia il risultato', () => {
    for (const [l, c] of coppie) {
      const uno = mergeLWW(l, c);
      const due = mergeLWW(uno, c);
      expect(due, JSON.stringify({ l, c })).toEqual(uno);
    }
  });

  it('merge di una riga con se stessa la restituisce identica (no perdita di campi/uid)', () => {
    for (const [l] of coppie) {
      const conUid = { ...l, uid: 'uid-fisso' };
      expect(mergeLWW(conUid, conUid)).toEqual(conUid);
    }
  });
});
