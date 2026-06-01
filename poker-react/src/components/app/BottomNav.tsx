import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { IconUsers, IconHistory, IconTrophy, IconPlus } from '../icons';

interface Props { legaId: number; }

export default function BottomNav({ legaId }: Props) {
  const base = `/leghe/${legaId}/poker`;
  const navigate = useNavigate();

  const openOverlay       = useStore(s => s.openOverlay);
  const setSerataView     = useStore(s => s.setSerataView);
  const setSetupModalita  = useStore(s => s.setSetupModalita);
  const clearSetupPartIds = useStore(s => s.clearSetupPartIds);

  function cls({ isActive }: { isActive: boolean }) {
    return `nav-btn${isActive ? ' active' : ''}`;
  }

  function apriNuovaPartita() {
    clearSetupPartIds();
    setSetupModalita('cash');
    setSerataView('setup');
    openOverlay();
    navigate(`${base}/serata`);
  }

  return (
    <nav className="bottom-nav">
      <NavLink to={`${base}/partecipanti`} className={cls}>
        <span className="ico"><IconUsers size={22} /></span>
        Partecipanti
      </NavLink>
      <NavLink to={`${base}/storico`} className={cls}>
        <span className="ico"><IconHistory size={22} /></span>
        Storico
      </NavLink>
      <NavLink to={`${base}/classifica`} className={cls}>
        <span className="ico"><IconTrophy size={22} /></span>
        Classifica
      </NavLink>
      <button className="nav-btn" onClick={apriNuovaPartita}>
        <span className="ico"><IconPlus size={22} /></span>
        Nuova partita
      </button>
    </nav>
  );
}
