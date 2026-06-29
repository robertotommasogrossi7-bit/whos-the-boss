import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { GIOCHI_PREIMPOSTATI } from '@poker/core';
import { GameIcon } from '../icons';

/* HOME della lega (M3) — griglia giochi + "segna partita" per la lega.
   Il poker apre la sua app dedicata (/poker); ogni altro gioco apre la
   schermata comune (/g/:giocoId). Niente GameBar: il gioco si sceglie qui. */
export default function LegaHome() {
  const { legaId } = useParams<{ legaId: string }>();
  const navigate   = useNavigate();
  const idNum      = Number(legaId);
  const lega       = useStore(s => s.db.leghe.find(l => l.id === idNum));

  if (!lega) return <Navigate to="/leghe" replace />;

  function entra(id: string) {
    if (id === 'poker') navigate(`/leghe/${idNum}/poker`);
    else                navigate(`/leghe/${idNum}/g/${id}`);
  }

  return (
    <div className="tab-content">
      <div className="sec-hdr"><h2>Giochi</h2></div>
      <div className="game-grid">
        {GIOCHI_PREIMPOSTATI.map(g => (
          <button
            key={g.id}
            className={`game-tile${g.id === 'poker' ? ' game-tile--poker' : ''}`}
            onClick={() => entra(g.id)}
          >
            <span className="game-tile-ico"><GameIcon icona={g.icona} size={34} /></span>
            <span className="game-tile-nome">{g.nome}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
