import type { ReactNode, SVGProps } from 'react';

/* ══════════════════════════════════════════════════════
   ICONE D'INTERFACCIA (R3 — DESIGN_SPEC §4)
   SVG originali, monocrome, colore via currentColor.
   NIENTE emoji, NIENTE loghi di marca.
══════════════════════════════════════════════════════ */

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function Svg({ size = 24, children, ...rest }: IconProps & { children: ReactNode }) {
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
      {children}
    </svg>
  );
}

/* ── Navigazione principale ── */
export const IconHome = (p: IconProps) => (
  <Svg {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /></Svg>
);
export const IconTrophy = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
    <path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11" />
    <path d="M17 6h3v1.5A3.5 3.5 0 0 1 16.5 11" />
    <path d="M12 13v4" /><path d="M8.5 20.5h7" /><path d="M9.5 20.5v-1.5h5v1.5" />
  </Svg>
);
export const IconHistory = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 6h12" /><path d="M8 12h12" /><path d="M8 18h12" />
    <circle cx="3.6" cy="6" r="1.1" /><circle cx="3.6" cy="12" r="1.1" /><circle cx="3.6" cy="18" r="1.1" />
  </Svg>
);
export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19c0-3.2 2.7-5.3 6-5.3s6 2.1 6 5.3" />
    <path d="M16 5.4a3 3 0 0 1 0 5.7" />
    <path d="M21 19c0-2.5-1.5-4.4-3.8-5.1" />
  </Svg>
);

/* ── Controlli comuni ── */
export const IconChevronLeft  = (p: IconProps) => (<Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>);
export const IconChevronRight = (p: IconProps) => (<Svg {...p}><path d="M9 5l7 7-7 7" /></Svg>);
export const IconChevronDown  = (p: IconProps) => (<Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>);
export const IconPlus  = (p: IconProps) => (<Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>);
export const IconClose = (p: IconProps) => (<Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>);

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h8M16.5 7H20" /><path d="M4 17h3.5M11.5 17H20" />
    <circle cx="14" cy="7" r="2.4" /><circle cx="9" cy="17" r="2.4" />
  </Svg>
);
export const IconUser = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></Svg>
);
export const IconCrown = (p: IconProps) => (
  <Svg {...p}><path d="M4 18h16" /><path d="M4 18 5 8l4 3.5L12 5l3 6.5L19 8l1 10z" /></Svg>
);
export const IconLogout = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
    <path d="M14 8l4 4-4 4" /><path d="M18 12H9" />
  </Svg>
);

/* ── Stato / azioni poker (sostituiscono emoji in TavoloView ecc.) ── */
export const IconWarning = (p: IconProps) => (
  <Svg {...p}><path d="M12 4 2.5 20.5h19L12 4z" /><path d="M12 10v4.5" /><path d="M12 18h.01" /></Svg>
);
export const IconRefresh = (p: IconProps) => (
  <Svg {...p}><path d="M20 11A8 8 0 1 0 18.5 16" /><path d="M20 5v6h-6" /></Svg>
);
export const IconSwap = (p: IconProps) => (
  <Svg {...p}><path d="M3 8h14" /><path d="M14 5l3 3-3 3" /><path d="M21 16H7" /><path d="M10 13l-3 3 3 3" /></Svg>
);
export const IconArrowRight = (p: IconProps) => (<Svg {...p}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></Svg>);
export const IconClock = (p: IconProps) => (<Svg {...p}><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></Svg>);
export const IconCoins = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="12" cy="6.5" rx="7" ry="3" />
    <path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
    <path d="M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
  </Svg>
);

/* ── Azioni / stato (sostituiscono ✓ ✎ 🗑 ▶ ⏸ ⏹ ⏭ 🔒 ecc.) ── */
export const IconCheck = (p: IconProps) => (<Svg {...p}><path d="M5 12.5l4.5 4.5L19 7" /></Svg>);
export const IconTrash = (p: IconProps) => (
  <Svg {...p}><path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6.5 7l1 12.5h9L17.5 7" /><path d="M10 11v5M14 11v5" /></Svg>
);
export const IconEdit = (p: IconProps) => (
  <Svg {...p}><path d="M14.5 5 19 9.5" /><path d="M4 20l1-4L15.5 5.5l3 3L8 19l-4 1z" /></Svg>
);
export const IconPlay = (p: IconProps) => (
  <Svg {...p}><path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none" /></Svg>
);
export const IconPause = (p: IconProps) => (<Svg {...p}><path d="M9 5v14M15 5v14" /></Svg>);
export const IconStop = (p: IconProps) => (
  <Svg {...p}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" /></Svg>
);
export const IconSkip = (p: IconProps) => (
  <Svg {...p}><path d="M6 5l9 7-9 7z" fill="currentColor" stroke="none" /><path d="M18 5v14" /></Svg>
);
export const IconLock = (p: IconProps) => (
  <Svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>
);
export const IconChevronUp = (p: IconProps) => (<Svg {...p}><path d="M6 15l6-6 6 6" /></Svg>);

/* Pallino "live" pieno (sostituisce 🔴) */
export const IconLiveDot = ({ size = 12, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
    <circle cx="12" cy="12" r="7" fill="currentColor" />
  </svg>
);
