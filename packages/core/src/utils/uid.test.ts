import { describe, expect, it } from 'vitest';
import { generaUid } from './uid';

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
