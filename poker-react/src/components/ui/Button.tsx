import type { ButtonHTMLAttributes, ReactNode } from 'react';

/* Button — varianti primary/ghost/danger (DESIGN_SPEC §3).
   Solo presentazione: colore dai token, touch >=44px. */

type Variant = 'primary' | 'ghost' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  size?: 'md' | 'sm';
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  block = false,
  size = 'md',
  className = '',
  children,
  ...rest
}: Props) {
  const cls = [
    'ui-btn',
    `ui-btn--${variant}`,
    size === 'sm' && 'ui-btn--sm',
    block && 'ui-btn--block',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
