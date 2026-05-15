import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { contaDebitiAperti } from '../../utils/calc';

interface Props { legaId: number; }

export default function FabDebiti({ legaId }: Props) {
  const navigate = useNavigate();
  const leghe = useStore(s => s.db.leghe);
  const lega = leghe.find(l => l.id === legaId);
  const nDebiti = lega ? contaDebitiAperti(lega) : 0;

  /* Nessun debito aperto → FAB nascosto del tutto (come la versione vanilla) */
  if (nDebiti === 0) return null;

  return (
    <button
      className="fab-debiti"
      onClick={() => navigate('/debiti')}
      title="Debiti aperti"
    >
      💳
      <span className="fab-count">{nDebiti}</span>
    </button>
  );
}
