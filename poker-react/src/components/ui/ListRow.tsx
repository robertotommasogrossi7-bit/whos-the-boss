import type { ReactNode } from 'react';

/* ListRow — riga elenco (left + titolo/sottotitolo + valore a destra).
   DESIGN_SPEC §3. Se passi onClick diventa un <button> (touch >=44px). */

interface Props {
  left?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function ListRow({ left, title, subtitle, right, onClick, className = '' }: Props) {
  const cls = `ui-listrow ${className}`.trim();
  const content = (
    <>
      {left}
      <div className="ui-listrow-body">
        <div className="ui-listrow-title">{title}</div>
        {subtitle != null && <div className="ui-listrow-sub">{subtitle}</div>}
      </div>
      {right != null && <div className="ui-listrow-right">{right}</div>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick}>
        {content}
      </button>
    );
  }
  return <div className={cls}>{content}</div>;
}
