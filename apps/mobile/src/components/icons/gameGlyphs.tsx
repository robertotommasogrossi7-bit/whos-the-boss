import type { ReactNode } from 'react';
import { Circle, Path, Rect } from 'react-native-svg';

/* ══════════════════════════════════════════════════════
   GLIFI DEI GIOCHI — port nativo (react-native-svg) di icons/gameGlyphs.tsx.
   Glifi ORIGINALI monocromi per la chiave `icona` del catalogo (core/giochi).
   Nessun logo di marca: i TCG (magic/yugioh/pokemon) usano un glifo neutro
   "carta + scintilla/stella". I nodi vivono dentro il <G> di GameIcon.
══════════════════════════════════════════════════════ */

export const GAME_GLYPHS: Record<string, ReactNode> = {
  /* Picche (poker) — seme pieno */
  picche: (
    <Path
      d="M12 3c-2.6 3.6-7.5 5.8-7.5 9.6A3.5 3.5 0 0 0 11 15.4c-.2 2-.9 3.2-2 4.6h6c-1.1-1.4-1.8-2.6-2-4.6a3.5 3.5 0 0 0 6.5-2.8C19.5 8.8 14.6 6.6 12 3z"
      fill="currentColor"
      stroke="none"
    />
  ),
  /* Mazzo generico — due carte sovrapposte */
  mazzo: (
    <>
      <Rect x="8.5" y="4" width="10" height="14" rx="2" />
      <Path d="M5.5 7.5 4.7 16a2 2 0 0 0 1.7 2.2l7.1.9" />
    </>
  ),
  /* Coppe — calice */
  coppe: (
    <>
      <Path d="M6.5 4h11l-1 6.2a4.5 4.5 0 0 1-9 0L6.5 4z" />
      <Path d="M12 14.7V19" /><Path d="M8 19.5h8" />
    </>
  ),
  /* Bastoni — bastone con pomelli */
  bastoni: (
    <>
      <Path d="M6.5 18 17 7.5" />
      <Circle cx="18" cy="6.2" r="2.4" /><Circle cx="6" cy="18.2" r="1.8" />
    </>
  ),
  /* Denari — moneta */
  denari: (
    <>
      <Circle cx="12" cy="12" r="8" /><Circle cx="12" cy="12" r="3.2" />
    </>
  ),
  /* Due mazzi (burraco) — due pile di carte */
  'due-mazzi': (
    <>
      <Rect x="3.5" y="6" width="7.5" height="12" rx="1.5" />
      <Rect x="13" y="6" width="7.5" height="12" rx="1.5" />
    </>
  ),
  /* Scala — sequenza ascendente */
  scala: <Path d="M4 18h3.5v-4H11v-4h3.5V6H20" />,
  /* Uno — cerchio con "1" */
  uno: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M10.8 9.2 12.6 8v8" />
    </>
  ),
  /* Magic — carta + scintilla (4 punte) */
  magic: (
    <>
      <Rect x="6" y="3.5" width="12" height="17" rx="2" />
      <Path d="M12 7.5l1.2 2.6 2.6 1.2-2.6 1.2L12 15.2l-1.2-2.6L8.2 11.3l2.6-1.2z" fill="currentColor" stroke="none" />
    </>
  ),
  /* Yu-Gi-Oh! — carta + stella (contorno) */
  yugioh: (
    <>
      <Rect x="6" y="3.5" width="12" height="17" rx="2" />
      <Path d="M12 7l1.3 2.9 3.2.3-2.4 2.1.7 3.1L12 13.9 9.2 15.5l.7-3.1L7.5 10.2l3.2-.3z" />
    </>
  ),
  /* Pokemon — carta + stella (piena) */
  pokemon: (
    <>
      <Rect x="6" y="3.5" width="12" height="17" rx="2" />
      <Path d="M12 7l1.3 2.9 3.2.3-2.4 2.1.7 3.1L12 13.9 9.2 15.5l.7-3.1L7.5 10.2l3.2-.3z" fill="currentColor" stroke="none" />
    </>
  ),
};

/** Chiavi `icona` per cui esiste un glifo. */
export const GAME_ICON_KEYS = Object.keys(GAME_GLYPHS);
