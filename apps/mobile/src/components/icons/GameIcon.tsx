import type { ColorValue } from 'react-native';
import Svg, { G } from 'react-native-svg';

import { GAME_GLYPHS } from './gameGlyphs';

/* GameIcon — disegna il glifo per la chiave `icona` del catalogo (core/giochi).
   Colore dal prop `color` (currentColor). Fallback su "mazzo". (DESIGN_SPEC §4) */
interface Props {
  icona: string;
  size?: number;
  color?: ColorValue;
}

export default function GameIcon({ icona, size = 24, color = '#000' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" color={color}>
      <G fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {GAME_GLYPHS[icona] ?? GAME_GLYPHS.mazzo}
      </G>
    </Svg>
  );
}
