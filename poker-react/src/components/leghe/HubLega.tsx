import { useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { IconChevronLeft, GameIcon, IconChevronRight } from '../icons';

/* HUB DI LEGA (/leghe/:legaId) — MULTIGIOCO_SPEC §5/§10.
   In M2a è minimale: header + ingresso al poker. La griglia giochi,
   la classifica di lega e i giocatori arrivano in M2d. NIENTE GameBar
   dentro la lega (il gioco si sceglie qui). */
export default function HubLega() {
  const { legaId } = useParams<{ legaId: string }>();
  const navigate = useNavigate();
  const leghe = useStore(s => s.db.leghe);
  const setCurrentLega = useStore(s => s.setCurrentLega);

  const idNum = Number(legaId);
  const lega = leghe.find(l => l.id === idNum) ?? null;

  useEffect(() => {
    if (!isNaN(idNum) && idNum > 0) setCurrentLega(idNum);
  }, [idNum, setCurrentLega]);

  if (!lega) return <Navigate to="/leghe" replace />;

  return (
    <>
      <header className="app-header">
        <button className="hdr-back" onClick={() => navigate('/leghe')}>
          <IconChevronLeft size={20} />
        </button>
        <div className="hdr-center">
          <h1>{lega.nome}</h1>
          <p>{lega.nomi.length} giocatori</p>
        </div>
        <div className="hdr-right" />
      </header>

      <div className="tab-content">
        <div className="sec-hdr"><h2>Giochi</h2></div>
        <button
          className="ui-listrow"
          onClick={() => navigate(`/leghe/${idNum}/poker`)}
        >
          <GameIcon icona="picche" size={28} />
          <div className="ui-listrow-body">
            <div className="ui-listrow-title">Poker</div>
            <div className="ui-listrow-sub">Cash, tornei, settlement</div>
          </div>
          <IconChevronRight size={18} className="ui-listrow-right" />
        </button>
      </div>
    </>
  );
}
