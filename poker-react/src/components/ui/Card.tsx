import type { HTMLAttributes, ReactNode } from 'react';

/* Card — contenitore base su --surface (DESIGN_SPEC §3). */

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function Card({ className = '', children, ...rest }: Props) {
  return (
    <div className={`ui-card ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
