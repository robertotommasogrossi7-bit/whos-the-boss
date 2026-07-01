import { describe, it, expect } from 'vitest';
import { normalizzaNome } from './normalizzaNome';

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
