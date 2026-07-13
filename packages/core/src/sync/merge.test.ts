import { describe, expect, it } from 'vitest';
import { haCambiamentiLocaliNonSincronizzati, mergeLWW } from './merge';

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
