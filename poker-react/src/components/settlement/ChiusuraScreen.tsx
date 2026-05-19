import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import ChiusuraCash    from './ChiusuraCash';
import ChiusuraTorneo  from './ChiusuraTorneo';

/* ══════════════════════════════════════════════════════
   CHIUSURA SCREEN — dispatcher cash / torneo
   Route: /app/:legaId/chiusura
   Derivato da apriChiusura() / apriChiusuraTorneo() in vanilla
══════════════════════════════════════════════════════ */

export default function ChiusuraScreen() {
  const { legaId: legaIdStr } = useParams<{ legaId: string }>();
  const legaId = Number(legaIdStr);
  const navigate = useNavigate();

  const settlement       = useStore(s => s.settlement);
  const confermaChiusura = useStore(s => s.confermaChiusura);
  const setSettlement    = useStore(s => s.setSettlement);

  const [oraFine, setOraFine] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  /* Redirect se settlement già chiuso o non inizializzato */
  if (!settlement) {
    return <Navigate to={`/app/${legaId}/serata`} replace />;
  }

  const handleBack = () => {
    setSettlement(null);
    navigate(`/app/${legaId}/serata`, { replace: true });
  };

  const handleConferma = () => {
    confermaChiusura(legaId, oraFine);
    /* Naviga solo se il settlement è stato effettivamente salvato
       (confermaChiusura imposta settlement=null solo in caso di successo) */
    if (useStore.getState().settlement === null) {
      navigate(`/app/${legaId}/serata`, { replace: true });
    }
  };

  return (
    <div className="tab-content">
      <button className="btn btn-gray btn-sm btn-back-serata" onClick={handleBack}>
        ‹ Torna alla serata
      </button>

      <div className="settle-page-title">
        {settlement.isTorneo ? '🏆 Chiusura torneo' : '💰 Chiusura cash game'}
      </div>

      <div className="form-row">
        <label>Ora fine</label>
        <input
          type="time"
          value={oraFine}
          onChange={e => setOraFine(e.target.value)}
        />
      </div>

      {settlement.isTorneo
        ? <ChiusuraTorneo legaId={legaId} />
        : <ChiusuraCash   legaId={legaId} />
      }

      <div className="btn--mt16">
        <button className="btn btn-green btn-block" onClick={handleConferma}>
          ✓ Conferma e salva serata
        </button>
      </div>
      <div className="spacer-20" />
    </div>
  );
}
