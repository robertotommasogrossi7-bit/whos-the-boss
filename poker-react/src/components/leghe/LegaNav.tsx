import { NavLink } from 'react-router-dom';
import { IconHome, IconTrophy, IconHistory, IconUsers } from '../icons';

/* Bottom nav della SEZIONE LEGA (M3, decisione 2026-06-02) — 4 schede:
   Home / Classifica / Storico / Giocatori. Simmetrica alla shell globale,
   con "Giocatori" (rubrica della lega) al posto di "Leghe". */
interface Props { legaId: number; }

function cls({ isActive }: { isActive: boolean }) {
  return `nav-btn${isActive ? ' active' : ''}`;
}

export default function LegaNav({ legaId }: Props) {
  const base = `/leghe/${legaId}`;
  return (
    <nav className="bottom-nav">
      <NavLink to={base} end className={cls}>
        <span className="ico"><IconHome size={22} /></span>
        Home
      </NavLink>
      <NavLink to={`${base}/classifica`} className={cls}>
        <span className="ico"><IconTrophy size={22} /></span>
        Classifica
      </NavLink>
      <NavLink to={`${base}/storico`} className={cls}>
        <span className="ico"><IconHistory size={22} /></span>
        Storico
      </NavLink>
      <NavLink to={`${base}/giocatori`} className={cls}>
        <span className="ico"><IconUsers size={22} /></span>
        Giocatori
      </NavLink>
    </nav>
  );
}
