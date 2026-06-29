import { temaPerGioco, accentPerGioco } from '@whos-the-boss/core';

/* ══════════════════════════════════════════════════════
   TEMA RN — port dei design token della web (styles.css :root).
   Niente CSS variables su RN: gli stessi token vivono qui come
   oggetto, con la variante "feltro" (poker) e l'accento dinamico
   per gioco. La logica pura (quale tema / quale accento) si RIUSA
   da @whos-the-boss/core (temaPerGioco / accentPerGioco): unica
   fonte di verita', identica alla web.
══════════════════════════════════════════════════════ */

export interface Theme {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  ok: string;
  warn: string;
  danger: string;
  okSoft: string;
  warnSoft: string;
  dangerSoft: string;
  radius: number;
  radiusSm: number;
  /** true = tema feltro (poker) */
  isFelt: boolean;
}

/* Tema scuro di base (DESIGN_SPEC §2 / styles.css :root) */
const SCURO: Theme = {
  bg: '#0F1115',
  surface: '#1A1D23',
  surface2: '#232730',
  border: '#2C313B',
  text: '#F2F4F8',
  textMuted: '#9AA3B2',
  accent: '#5B8DEF',
  accentInk: '#FFFFFF',
  accentSoft: '#5B8DEF22',
  ok: '#2E9E5B',
  warn: '#E2B33C',
  danger: '#D24B40',
  okSoft: '#2E9E5B22',
  warnSoft: '#E2B33C22',
  dangerSoft: '#D24B4022',
  radius: 14,
  radiusSm: 10,
  isFelt: false,
};

/* Tema feltro poker (DESIGN_SPEC §6 / [data-tema="poker"]) */
const FELT: Theme = {
  ...SCURO,
  bg: '#0E3D24',
  surface: '#145232',
  surface2: '#0B311D',
  border: '#1C6B41',
  text: '#F3F8F4',
  textMuted: '#B7D2C2',
  accent: '#E2B33C',
  accentInk: '#1A1A1A',
  accentSoft: '#E2B33C22',
  isFelt: true,
};

/** Tema per il gioco selezionato: feltro per il poker, altrimenti scuro
    con l'accento del gioco (dal catalogo) o quello generico di default. */
export function themeForGame(giocoId: string): Theme {
  if (temaPerGioco(giocoId) === 'poker') return FELT;
  const accent = accentPerGioco(giocoId);
  return accent ? { ...SCURO, accent, accentSoft: `${accent}22` } : SCURO;
}

/** Tema di partenza (nessun gioco selezionato): scuro generico. */
export const defaultTheme: Theme = SCURO;
