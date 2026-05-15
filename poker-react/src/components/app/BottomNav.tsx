import { NavLink } from 'react-router-dom';

interface Props { legaId: number; }

export default function BottomNav({ legaId }: Props) {
  const base = `/app/${legaId}`;

  function cls({ isActive }: { isActive: boolean }) {
    return `nav-btn${isActive ? ' active' : ''}`;
  }

  return (
    <nav className="bottom-nav">
      <NavLink to={`${base}/partecipanti`} className={cls}>
        <span className="ico">👥</span>
        Partecipanti
      </NavLink>
      <NavLink to={`${base}/serata`} className={cls}>
        <span className="ico">🃏</span>
        Serata
      </NavLink>
      <NavLink to={`${base}/storico`} className={cls}>
        <span className="ico">📋</span>
        Storico
      </NavLink>
      <NavLink to={`${base}/classifica`} className={cls}>
        <span className="ico">🏆</span>
        Classifica
      </NavLink>
    </nav>
  );
}
