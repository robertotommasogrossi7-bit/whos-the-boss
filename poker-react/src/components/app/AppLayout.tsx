import { useEffect } from 'react';
import { useParams, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import BottomNav from './BottomNav';
import FabDebiti from '../common/FabDebiti';
import FabPartiteAttive from '../common/FabPartiteAttive';
import PartitaOverlay from './PartitaOverlay';

export default function AppLayout() {
  const { legaId } = useParams<{ legaId: string }>();
  const navigate = useNavigate();
  const setCurrentLega = useStore(s => s.setCurrentLega);
  const leghe      = useStore(s => s.db.leghe);
  const overlayOpen = useStore(s => s.overlayOpen);

  const idNum = Number(legaId);
  const lega = leghe.find(l => l.id === idNum) ?? null;

  useEffect(() => {
    if (!isNaN(idNum) && idNum > 0) setCurrentLega(idNum);
  }, [idNum, setCurrentLega]);

  useEffect(() => {
    document.body.classList.add('in-app');
    return () => document.body.classList.remove('in-app');
  }, []);

  /* Tema feltro del poker (DESIGN_SPEC §6): il poker è sempre feltro,
     a prescindere dal gioco filtrato nella shell. */
  useEffect(() => {
    const prev = document.documentElement.dataset.tema;
    document.documentElement.dataset.tema = 'poker';
    return () => {
      if (prev) document.documentElement.dataset.tema = prev;
      else delete document.documentElement.dataset.tema;
    };
  }, []);

  /* Blocca lo scroll del body quando l'overlay è aperto */
  useEffect(() => {
    if (overlayOpen) {
      document.body.classList.add('overlay-open');
    } else {
      document.body.classList.remove('overlay-open');
    }
    return () => document.body.classList.remove('overlay-open');
  }, [overlayOpen]);

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

      {/* Bottom nav e FAB nascosti quando l'overlay copre tutto */}
      {!overlayOpen && <BottomNav legaId={idNum} />}
      {!overlayOpen && <FabDebiti legaId={idNum} />}
      {!overlayOpen && <FabPartiteAttive legaId={idNum} />}

      <PartitaOverlay />
    </>
  );
}
