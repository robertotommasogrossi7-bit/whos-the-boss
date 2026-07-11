import { describe, expect, it } from 'vitest';
import { haCambiamentiLocaliNonSincronizzati, mergeLWW } from './merge';

describe('haCambiamentiLocaliNonSincronizzati', () => {
  it('false se non è mai stata toccata (nessun syncUpdatedAt)', () => {
    expect(haCambiamentiLocaliNonSincronizzati({})).toBe(false);
  });

  it('true se ha un edit locale e non è mai stata sincronizzata', () => {
    expect(haCambiamentiLocaliNonSincronizzati({ syncUpdatedAt: '2026-07-11T10:00:00.000Z' })).toBe(true);
  });

  it('true se l\'edit locale è dopo l\'ultimo sync riuscito', () => {
    expect(haCambiamentiLocaliNonSincronizzati({
      syncUpdatedAt: '2026-07-11T10:05:00.000Z',
      lastSyncedAt: '2026-07-11T10:00:00.000Z',
    })).toBe(true);
  });

  it('false se l\'ultimo sync è successivo (o uguale) all\'edit locale', () => {
    expect(haCambiamentiLocaliNonSincronizzati({
      syncUpdatedAt: '2026-07-11T10:00:00.000Z',
      lastSyncedAt: '2026-07-11T10:05:00.000Z',
    })).toBe(false);
    expect(haCambiamentiLocaliNonSincronizzati({
      syncUpdatedAt: '2026-07-11T10:00:00.000Z',
      lastSyncedAt: '2026-07-11T10:00:00.000Z',
    })).toBe(false);
  });
});

describe('mergeLWW', () => {
  const daCloud = {
    nome: 'Dal cloud',
    syncUpdatedAt: '2026-07-11T12:00:00.000Z',
    lastSyncedAt: '2026-07-11T12:00:00.000Z',
  };

  it('nessuna riga locale: prende il cloud', () => {
    expect(mergeLWW(undefined, daCloud)).toEqual(daCloud);
  });

  it('locale pulito (già sincronizzato, nessun edit dopo): vince il cloud', () => {
    const locale = { nome: 'Locale vecchio', syncUpdatedAt: '2026-07-11T09:00:00.000Z', lastSyncedAt: '2026-07-11T09:00:00.000Z' };
    expect(mergeLWW(locale, daCloud)).toEqual(daCloud);
  });

  it('locale con edit MAI sincronizzato: resta locale anche se il cloud è "più recente"', () => {
    const locale = { nome: 'Locale con edit', syncUpdatedAt: '2026-07-11T08:00:00.000Z' };
    expect(mergeLWW(locale, daCloud)).toEqual(locale);
  });

  it('locale con edit successivo all\'ultimo sync: resta locale (in attesa del prossimo push)', () => {
    const locale = {
      nome: 'Locale con edit recente',
      syncUpdatedAt: '2026-07-11T13:00:00.000Z',
      lastSyncedAt: '2026-07-11T11:00:00.000Z',
    };
    expect(mergeLWW(locale, daCloud)).toEqual(locale);
  });

  it('locale senza edit dopo l\'ultimo sync (anche se sync è "vecchio" rispetto al cloud): vince il cloud', () => {
    const locale = {
      nome: 'Locale sincronizzato tempo fa',
      syncUpdatedAt: '2026-07-11T07:00:00.000Z',
      lastSyncedAt: '2026-07-11T07:00:00.000Z',
    };
    expect(mergeLWW(locale, daCloud)).toEqual(daCloud);
  });
});
