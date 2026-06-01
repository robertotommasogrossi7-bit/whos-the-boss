import type { ReactNode } from 'react';

/* EmptyState — icona + testo quando una lista e' vuota (mai schermo bianco).
   DESIGN_SPEC §3/§8. L'icona e' un nodo (di norma un SVG da R3). */

interface Props {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, hint, action }: Props) {
  return (
    <div className="ui-empty">
      {icon && <div className="ui-empty-icon">{icon}</div>}
      <div className="ui-empty-title">{title}</div>
      {hint && <p className="ui-empty-hint">{hint}</p>}
      {action && <div className="ui-empty-action">{action}</div>}
    </div>
  );
}
