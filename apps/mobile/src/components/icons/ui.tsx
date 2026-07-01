import type { ReactNode } from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

/* ══════════════════════════════════════════════════════
   ICONE D'INTERFACCIA — port nativo (react-native-svg) di icons/ui.tsx web.
   SVG originali, monocrome; il colore arriva dal prop `color` (mappa
   `currentColor`). NIENTE emoji, NIENTE loghi di marca (DESIGN_SPEC §4).
══════════════════════════════════════════════════════ */

export interface IconProps {
  size?: number;
  color?: ColorValue;
}

/* Base: viewBox 24, stroke ereditato dal <G> (1.8, round), color = currentColor. */
function Base({ size = 24, color = '#000', children }: IconProps & { children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" color={color}>
      <G fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </G>
    </Svg>
  );
}

/* ── Navigazione principale ── */
export const IconHome = (p: IconProps) => (
  <Base {...p}><Path d="M3 11.5 12 4l9 7.5" /><Path d="M5.5 10.5V20h13v-9.5" /></Base>
);
export const IconTrophy = (p: IconProps) => (
  <Base {...p}>
    <Path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
    <Path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11" />
    <Path d="M17 6h3v1.5A3.5 3.5 0 0 1 16.5 11" />
    <Path d="M12 13v4" /><Path d="M8.5 20.5h7" /><Path d="M9.5 20.5v-1.5h5v1.5" />
  </Base>
);
export const IconHistory = (p: IconProps) => (
  <Base {...p}>
    <Path d="M8 6h12" /><Path d="M8 12h12" /><Path d="M8 18h12" />
    <Circle cx="3.6" cy="6" r="1.1" /><Circle cx="3.6" cy="12" r="1.1" /><Circle cx="3.6" cy="18" r="1.1" />
  </Base>
);
export const IconUsers = (p: IconProps) => (
  <Base {...p}>
    <Circle cx="9" cy="8" r="3.2" />
    <Path d="M3 19c0-3.2 2.7-5.3 6-5.3s6 2.1 6 5.3" />
    <Path d="M16 5.4a3 3 0 0 1 0 5.7" />
    <Path d="M21 19c0-2.5-1.5-4.4-3.8-5.1" />
  </Base>
);

/* ── Controlli comuni ── */
export const IconChevronLeft = (p: IconProps) => (<Base {...p}><Path d="M15 5l-7 7 7 7" /></Base>);
export const IconChevronRight = (p: IconProps) => (<Base {...p}><Path d="M9 5l7 7-7 7" /></Base>);
export const IconChevronDown = (p: IconProps) => (<Base {...p}><Path d="M6 9l6 6 6-6" /></Base>);
export const IconChevronUp = (p: IconProps) => (<Base {...p}><Path d="M6 15l6-6 6 6" /></Base>);
export const IconPlus = (p: IconProps) => (<Base {...p}><Path d="M12 5v14M5 12h14" /></Base>);
export const IconClose = (p: IconProps) => (<Base {...p}><Path d="M6 6l12 12M18 6 6 18" /></Base>);

export const IconSettings = (p: IconProps) => (
  <Base {...p}>
    <Path d="M4 7h8M16.5 7H20" /><Path d="M4 17h3.5M11.5 17H20" />
    <Circle cx="14" cy="7" r="2.4" /><Circle cx="9" cy="17" r="2.4" />
  </Base>
);
export const IconUser = (p: IconProps) => (
  <Base {...p}><Circle cx="12" cy="8" r="3.5" /><Path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></Base>
);
export const IconCrown = (p: IconProps) => (
  <Base {...p}><Path d="M4 18h16" /><Path d="M4 18 5 8l4 3.5L12 5l3 6.5L19 8l1 10z" /></Base>
);
export const IconLogout = (p: IconProps) => (
  <Base {...p}>
    <Path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
    <Path d="M14 8l4 4-4 4" /><Path d="M18 12H9" />
  </Base>
);

/* ── Stato / azioni poker ── */
export const IconWarning = (p: IconProps) => (
  <Base {...p}><Path d="M12 4 2.5 20.5h19L12 4z" /><Path d="M12 10v4.5" /><Path d="M12 18h.01" /></Base>
);
export const IconRefresh = (p: IconProps) => (
  <Base {...p}><Path d="M20 11A8 8 0 1 0 18.5 16" /><Path d="M20 5v6h-6" /></Base>
);
export const IconSwap = (p: IconProps) => (
  <Base {...p}><Path d="M3 8h14" /><Path d="M14 5l3 3-3 3" /><Path d="M21 16H7" /><Path d="M10 13l-3 3 3 3" /></Base>
);
export const IconArrowRight = (p: IconProps) => (<Base {...p}><Path d="M5 12h14" /><Path d="M13 6l6 6-6 6" /></Base>);
export const IconClock = (p: IconProps) => (<Base {...p}><Circle cx="12" cy="12" r="8" /><Path d="M12 7.5V12l3 2" /></Base>);
export const IconCalendar = (p: IconProps) => (<Base {...p}><Rect x="3" y="5" width="18" height="16" rx="2" /><Path d="M3 9.5h18M8 3v4M16 3v4" /></Base>);
export const IconCoins = (p: IconProps) => (
  <Base {...p}>
    <Ellipse cx="12" cy="6.5" rx="7" ry="3" />
    <Path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
    <Path d="M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
  </Base>
);

/* ── Azioni / stato ── */
export const IconCheck = (p: IconProps) => (<Base {...p}><Path d="M5 12.5l4.5 4.5L19 7" /></Base>);
export const IconTrash = (p: IconProps) => (
  <Base {...p}><Path d="M4 7h16" /><Path d="M9 7V5h6v2" /><Path d="M6.5 7l1 12.5h9L17.5 7" /><Path d="M10 11v5M14 11v5" /></Base>
);
export const IconEdit = (p: IconProps) => (
  <Base {...p}><Path d="M14.5 5 19 9.5" /><Path d="M4 20l1-4L15.5 5.5l3 3L8 19l-4 1z" /></Base>
);
export const IconPlay = (p: IconProps) => (
  <Base {...p}><Path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none" /></Base>
);
export const IconPause = (p: IconProps) => (<Base {...p}><Path d="M9 5v14M15 5v14" /></Base>);
export const IconStop = (p: IconProps) => (
  <Base {...p}><Rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" /></Base>
);
export const IconSkip = (p: IconProps) => (
  <Base {...p}><Path d="M6 5l9 7-9 7z" fill="currentColor" stroke="none" /><Path d="M18 5v14" /></Base>
);
export const IconLock = (p: IconProps) => (
  <Base {...p}><Rect x="5" y="11" width="14" height="9" rx="2" /><Path d="M8 11V8a4 4 0 0 1 8 0v3" /></Base>
);

/* Pallino "live" pieno */
export const IconLiveDot = ({ size = 12, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" color={color}>
    <Circle cx="12" cy="12" r="7" fill="currentColor" />
  </Svg>
);
