import { useParams, Navigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import StoricoSessioni from '../gioco/StoricoSessioni';

/* STORICO della lega (M3) — tutte le sessioni di gioco concluse della lega
   (qualsiasi gioco). Riusa StoricoSessioni senza filtro per gioco. */
export default function LegaStorico() {
  const { legaId } = useParams<{ legaId: string }>();
  const idNum      = Number(legaId);
  const lega       = useStore(s => s.db.leghe.find(l => l.id === idNum));

  if (!lega) return <Navigate to="/leghe" replace />;

  return <StoricoSessioni legaId={idNum} />;
}
