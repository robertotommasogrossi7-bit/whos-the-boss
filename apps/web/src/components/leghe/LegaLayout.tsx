import { useEffect } from 'react';
import { useParams, useMatch, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { applyTema } from '@whos-the-boss/core';
import LegaNav from './LegaNav';

/* SEZIONE LEGA (M3) — pagina dedicata con nav propria a 4 schede
   (Home/Classifica/Storico/Giocatori), sostituisce l'Hub singolo di R/M2.
   Tema: accento del gioco quando si è su una schermata gioco (/g/:giocoId),
   altrimenti scuro/generico. Niente GameBar globale dentro la lega (SPEC §5). */
export default function LegaLayout() {
  const { legaId }     = useParams<{ legaId: string }>();
  const navigate       = useNavigate();
  const leghe          = useStore(s => s.db.leghe);
  const setCurrentLega = useStore(s => s.setCurrentLega);

  const idNum = Number(legaId);
  const lega  = leghe.find(l => l.id === idNum) ?? null;

  // Accento del gioco attivo (se sulla schermata gioco), sennò generico.
  const matchGioco = useMatch('/leghe/:legaId/g/:giocoId');
  const giocoTema  = matchGioco?.params.giocoId ?? 'generico';

  useEffect(() => {
    if (!isNaN(idNum) && idNum > 0) setCurrentLega(idNum);
  }, [idNum, setCurrentLega]);

  useEffect(() => {
    document.body.classList.add('in-app');
    return () => document.body.classList.remove('in-app');
  }, []);

  useEffect(() => { applyTema(giocoTema); }, [giocoTema]);

  // Il "Personale" è la Home globale, non una lega navigabile come sezione.
  if (lega?.personale) return <Navigate to="/" replace />;
  if (!lega) return <Navigate to="/leghe" replace />;

  return (
    <>
      <header className="app-header">
        <button className="hdr-back" onClick={() => navigate('/leghe')}>‹</button>
        <div className="hdr-center">
          <h1>{lega.nome}</h1>
          <p>{lega.nomi.length} {lega.nomi.length === 1 ? 'giocatore' : 'giocatori'}</p>
        </div>
        <div className="hdr-right" />
      </header>

      <Outlet />

      <LegaNav legaId={idNum} />
    </>
  );
}
