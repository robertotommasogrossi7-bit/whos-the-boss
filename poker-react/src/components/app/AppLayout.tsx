import { useEffect } from 'react';
import { useParams, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import BottomNav from './BottomNav';
import FabDebiti from '../common/FabDebiti';
import PartitaOverlay from './PartitaOverlay';

export default function AppLayout() {
  const { legaId } = useParams<{ legaId: string }>();
  const navigate = useNavigate();
  const setCurrentLega = useStore(s => s.setCurrentLega);
  const leghe = useStore(s => s.db.leghe);

  const idNum = Number(legaId);
  const lega = leghe.find(l => l.id === idNum) ?? null;

  useEffect(() => {
    if (!isNaN(idNum) && idNum > 0) setCurrentLega(idNum);
  }, [idNum, setCurrentLega]);

  useEffect(() => {
    document.body.classList.add('in-app');
    return () => document.body.classList.remove('in-app');
  }, []);

  if (!lega) return <Navigate to="/circoli" replace />;

  return (
    <>
      <header className="app-header">
        <button className="hdr-back" onClick={() => navigate('/circoli')}>‹</button>
        <div className="hdr-center">
          <h1>{lega.nome}</h1>
          <p>{lega.nomi.length} partecipanti</p>
        </div>
        <div className="hdr-right" />
      </header>

      <Outlet />

      <BottomNav legaId={idNum} />
      <FabDebiti legaId={idNum} />
      <PartitaOverlay />
    </>
  );
}
