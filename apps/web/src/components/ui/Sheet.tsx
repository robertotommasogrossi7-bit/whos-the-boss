import type { ReactNode } from 'react';

/* Sheet / Modal — pannello dal basso (mobile), sfondo --surface (DESIGN_SPEC §3).
   Tap sull'overlay -> onClose. Non renderizza nulla se !open. */

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}

export default function Sheet({ open, onClose, title, children }: Props) {
  if (!open) return null;
  return (
    <div className="ui-sheet-overlay" onClick={onClose}>
      <div className="ui-sheet" onClick={e => e.stopPropagation()}>
        <div className="ui-sheet-handle" />
        {title != null && <div className="ui-sheet-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}
