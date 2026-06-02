import type { ReactNode } from 'react';

/* Chip / Tag — pill piccola, sfondo tenue + testo colorato (DESIGN_SPEC §3). */

type Tone = 'accent' | 'ok' | 'warn' | 'danger' | 'muted';

interface Props {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

export default function Chip({ children, tone = 'accent', className = '' }: Props) {
  return (
    <span className={`ui-chip ui-chip--${tone} ${className}`.trim()}>
      {children}
    </span>
  );
}
