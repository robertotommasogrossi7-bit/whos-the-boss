import { describe, expect, it } from 'vitest';
import { haCambiamentiLocaliNonSincronizzati } from '../sync/merge';
import { generaUid, nuovoSync, touchSync } from './uid';

const UUIDV7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generaUid', () => {
  it('produce un UUIDv7 valido (versione 7, variant RFC)', () => {
    for (let i = 0; i < 50; i++) {
      expect(generaUid()).toMatch(UUIDV7_RE);
    }
  });

  it('è unico su tante generazioni', () => {
    const uids = new Set(Array.from({ length: 1000 }, () => generaUid()));
    expect(uids.size).toBe(1000);
  });

  it('è ordinabile per tempo di creazione (i primi 12 hex non decrescono nel tempo)', async () => {
    const a = generaUid();
    await new Promise((r) => setTimeout(r, 5));
    const b = generaUid();
    const prefix = (u: string) => u.slice(0, 13).replace('-', '');
    expect(prefix(b) >= prefix(a)).toBe(true);
  });
});

describe('nuovoSync', () => {
  it('nasce con uid, revisione 1 e timestamp diagnostico', () => {
    const s = nuovoSync();
    expect(s.uid).toBeTruthy();
    expect(s.syncRev).toBe(1);
    expect(s.syncUpdatedAt).toBeTruthy();
  });

  it('una entità appena creata risulta subito "da pushare"', () => {
    // rev 1 e syncedRev assente → sporca finché il push non conferma
    expect(haCambiamentiLocaliNonSincronizzati(nuovoSync())).toBe(true);
  });
});

describe('touchSync', () => {
  it('bumpa la revisione locale di 1 (undefined → 1, poi +1)', () => {
    expect(touchSync({}).syncRev).toBe(1);
    expect(touchSync({ syncRev: 1 }).syncRev).toBe(2);
    expect(touchSync({ syncRev: 4, syncedRev: 4 }).syncRev).toBe(5);
  });

  it('rende "da pushare" una riga prima pulita, senza toccare syncedRev', () => {
    const pulita = { syncRev: 3, syncedRev: 3 };
    expect(haCambiamentiLocaliNonSincronizzati(pulita)).toBe(false);
    const dopo = touchSync(pulita);
    expect(dopo.syncedRev).toBe(3); // invariato: lo scrive solo il sync
    expect(haCambiamentiLocaliNonSincronizzati(dopo)).toBe(true);
  });

  it('non muta l\'oggetto originale (ritorna una copia)', () => {
    const orig = { syncRev: 1, nome: 'x' };
    const dopo = touchSync(orig);
    expect(orig.syncRev).toBe(1);
    expect(dopo).not.toBe(orig);
    expect(dopo.nome).toBe('x');
  });
});
