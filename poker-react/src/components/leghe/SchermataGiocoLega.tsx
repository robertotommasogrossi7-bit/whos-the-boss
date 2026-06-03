import { useParams, Navigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import SchermataGioco from '../gioco/SchermataGioco';

/* Wrapper di route per la schermata comune del gioco DENTRO una lega
   (/leghe/:legaId/g/:giocoId, M3). Riusa lo stesso motore della Home
   Personale, con il back alla griglia giochi della lega. */
export default function SchermataGiocoLega() {
  const { legaId, giocoId } = useParams<{ legaId: string; giocoId: string }>();
  const idNum = Number(legaId);
  const lega  = useStore(s => s.db.leghe.find(l => l.id === idNum));

  if (!lega || !giocoId) return <Navigate to={`/leghe/${legaId}`} replace />;

  return <SchermataGioco legaId={idNum} giocoId={giocoId} backTo={`/leghe/${idNum}`} />;
}
