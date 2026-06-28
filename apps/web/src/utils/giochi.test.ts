import { describe, it, expect } from 'vitest';
import { GIOCHI_PREIMPOSTATI, accentDaNome, nuovoGiocoCustom } from './giochi';
import { GAME_ICON_KEYS } from '../components/icons/gameGlyphs';

describe('accentDaNome — accento deterministico (DESIGN_SPEC §4/§9)', () => {
  it('restituisce un hex #RRGGBB valido', () => {
    expect(accentDaNome('Risiko')).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('è deterministico: stesso nome → stesso accento', () => {
    expect(accentDaNome('Briscola Chiamata')).toBe(accentDaNome('Briscola Chiamata'));
  });

  it('nomi diversi danno (di norma) accenti diversi', () => {
    expect(accentDaNome('Alfa')).not.toBe(accentDaNome('Omega'));
  });
});

describe('nuovoGiocoCustom — default (SPEC §9)', () => {
  it('crea un gioco custom coi default attesi', () => {
    const g = nuovoGiocoCustom('Sasso Carta Forbice');
    expect(g.id.startsWith('custom-')).toBe(true);
    expect(g.nome).toBe('Sasso Carta Forbice');
    expect(g.preimpostato).toBe(false);
    expect(g.attivo).toBe(true);
    expect(g.pareggioComeVittoria).toBe(true);
    expect(g.accent).toBe(accentDaNome('Sasso Carta Forbice'));
    expect(g.foto).toBeUndefined();
  });

  it('mantiene la foto se passata', () => {
    const g = nuovoGiocoCustom('Tombola', 'data:image/png;base64,xxx');
    expect(g.foto).toBe('data:image/png;base64,xxx');
  });
});

describe('catalogo ↔ glifi GameIcon', () => {
  it('ogni gioco preimpostato ha un glifo disegnato', () => {
    for (const gioco of GIOCHI_PREIMPOSTATI) {
      expect(GAME_ICON_KEYS).toContain(gioco.icona);
    }
  });
});
