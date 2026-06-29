import { describe, it, expect } from 'vitest';
import { normalizzaNome, èSeiTu } from './normalizzaNome';

describe('normalizzaNome — match tollerante (#4.5)', () => {
  it('trim + minuscolo', () => {
    expect(normalizzaNome('  giuliA ')).toBe('giulia');
  });

  it('rimuove accenti/diacritici', () => {
    expect(normalizzaNome('José')).toBe('jose');
  });

  it('collassa spazi multipli', () => {
    expect(normalizzaNome('Mario  Rossi')).toBe('mario rossi');
  });

  it('maiuscole → minuscole', () => {
    expect(normalizzaNome('ANNA')).toBe('anna');
  });

  it('stringa vuota / solo spazi → vuoto', () => {
    expect(normalizzaNome('')).toBe('');
    expect(normalizzaNome('   ')).toBe('');
  });

  it('combina tutto (accenti + spazi + case)', () => {
    expect(normalizzaNome('  Niccolò   DE Lùca ')).toBe('niccolo de luca');
  });
});

describe('èSeiTu — l\'utente loggato è quel giocatore?', () => {
  it('false se username nullo o vuoto', () => {
    expect(èSeiTu('Anna', null)).toBe(false);
    expect(èSeiTu('Anna', undefined)).toBe(false);
    expect(èSeiTu('Anna', '')).toBe(false);
    expect(èSeiTu('Anna', '   ')).toBe(false);
  });

  it('match case-insensitive', () => {
    expect(èSeiTu('anna', 'ANNA')).toBe(true);
    expect(èSeiTu('Giulia', '  giuliA ')).toBe(true);
  });

  it('match a meno di accenti', () => {
    expect(èSeiTu('José', 'jose')).toBe(true);
  });

  it('nomi diversi → false', () => {
    expect(èSeiTu('Link', 'Zelda')).toBe(false);
  });
});
