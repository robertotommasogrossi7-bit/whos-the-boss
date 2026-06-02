import type { SVGProps } from 'react';
import { GAME_GLYPHS } from './gameGlyphs';

/* ══════════════════════════════════════════════════════
   GameIcon (R3 — DESIGN_SPEC §4)
   Disegna il glifo per la chiave `icona` del catalogo
   (utils/giochi.ts). Colore da currentColor (i contenitori
   usano color: var(--accent)). I glifi vivono in gameGlyphs.tsx.
══════════════════════════════════════════════════════ */

interface Props extends SVGProps<SVGSVGElement> {
  icona: string;
  size?: number;
}

export default function GameIcon({ icona, size = 24, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {GAME_GLYPHS[icona] ?? GAME_GLYPHS.mazzo}
    </svg>
  );
}
