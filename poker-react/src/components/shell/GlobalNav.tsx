import { NavLink } from 'react-router-dom';
import { IconHome, IconTrophy, IconHistory, IconUsers } from '../icons';

/* Bottom nav globale della shell (Card Tracker, MULTIGIOCO_SPEC §5).
   4 voci: Home / Classifica / Storico / Leghe. */
function cls({ isActive }: { isActive: boolean }) {
  return `nav-btn${isActive ? ' active' : ''}`;
}

export default function GlobalNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={cls}>
        <span className="ico"><IconHome size={22} /></span>
        Home
      </NavLink>
      <NavLink to="/classifica" className={cls}>
        <span className="ico"><IconTrophy size={22} /></span>
        Classifica
      </NavLink>
      <NavLink to="/storico" className={cls}>
        <span className="ico"><IconHistory size={22} /></span>
        Storico
      </NavLink>
      <NavLink to="/leghe" className={cls}>
        <span className="ico"><IconUsers size={22} /></span>
        Leghe
      </NavLink>
    </nav>
  );
}
