import { describe, it, expect } from 'vitest';
import { validaUsername } from './username';

describe('validaUsername — handle univoco (R6)', () => {
  it('accetta un handle valido', () => {
    expect(validaUsername('mario_rossi')).toEqual({ ok: true, value: 'mario_rossi' });
  });

  it('trimma e mette in minuscolo (come Instagram)', () => {
    expect(validaUsername('  Mario_Rossi ')).toEqual({ ok: true, value: 'mario_rossi' });
  });

  it('accetta cifre e punto', () => {
    expect(validaUsername('player.1')).toEqual({ ok: true, value: 'player.1' });
  });

  it('vuoto → errore', () => {
    expect(validaUsername('   ')).toEqual({ ok: false, error: 'Scegli un username' });
  });

  it('meno di 3 caratteri → errore', () => {
    expect(validaUsername('ab').ok).toBe(false);
  });

  it('più di 20 caratteri → errore', () => {
    expect(validaUsername('a'.repeat(21)).ok).toBe(false);
  });

  it('spazi interni → errore charset', () => {
    const r = validaUsername('mario rossi');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Solo lettere/);
  });

  it('accenti → errore charset (niente strip silenzioso)', () => {
    expect(validaUsername('josé').ok).toBe(false);
  });

  it('altri simboli (@, -) → errore charset', () => {
    expect(validaUsername('mario-rossi').ok).toBe(false);
    expect(validaUsername('mario@x').ok).toBe(false);
  });

  it('punto/underscore ai bordi → errore', () => {
    expect(validaUsername('.mario').ok).toBe(false);
    expect(validaUsername('mario_').ok).toBe(false);
  });

  it('. o _ ripetuti di fila → errore', () => {
    expect(validaUsername('ma..rio').ok).toBe(false);
    expect(validaUsername('ma__rio').ok).toBe(false);
    expect(validaUsername('ma._rio').ok).toBe(false);
  });

  it('handle valido con . e _ non consecutivi', () => {
    expect(validaUsername('a.b_c.d')).toEqual({ ok: true, value: 'a.b_c.d' });
  });

  it('tutto ciò che passa qui rispetta anche il vincolo DB ^[a-z0-9._]{3,20}$', () => {
    for (const raw of ['mario_rossi', '  Mario_Rossi ', 'player.1', 'a.b_c.d', 'abc']) {
      const r = validaUsername(raw);
      expect(r.ok).toBe(true);
      if (r.ok) expect(/^[a-z0-9._]{3,20}$/.test(r.value)).toBe(true);
    }
  });
});
