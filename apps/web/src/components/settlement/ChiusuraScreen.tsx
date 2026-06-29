import { useState } from 'react';
import { useStore } from '../../store/useStore';
import CassaView      from './CassaView';
import ChiusuraCash   from './ChiusuraCash';
import ChiusuraTorneo from './ChiusuraTorneo';

/* ══════════════════════════════════════════════════════
   CHIUSURA SCREEN — dispatcher cash / torneo
   Cash: mostra schermata Cassa + schermata Trasferimenti
   Torneo: comportamento invariato
══════════════════════════════════════════════════════ */

export default function ChiusuraScreen() {
  const settlement       = useStore(s => s.settlement);
  const setSettlement    = useStore(s => s.setSettlement);
  const setSerataView    = useStore(s => s.setSerataView);
  const confermaChiusura = useStore(s => s.confermaChiusura);

  const [oraFine, setOraFine] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  if (!settlement) return null;

  const legaId = settlement.legaId;

  const handleBack = () => {
    setSettlement(null);
    setSerataView('live');
  };

  const handleConferma = () => {
    confermaChiusura(legaId, oraFine);
  };

  /* Trasferimenti effettivi (override se presenti, altrimenti calcolati) */
  const trasferimenti = settlement.trasferimentiOverride
    ?? settlement.cashResult?.trasferimenti
    ?? [];

  return (
    <div className="tab-content">
      <button className="btn btn-gray btn-sm btn-back-serata" onClick={handleBack}>
        ‹ Torna alla partita
      </button>

      <div className="settle-page-title">
        {settlement.isTorneo ? 'Chiusura torneo' : 'Chiusura cash game'}
      </div>

      <div className="form-row">
        <label>Ora fine</label>
        <input
          type="time"
          value={oraFine}
          onChange={e => setOraFine(e.target.value)}
        />
      </div>

      {settlement.isTorneo ? (
        <ChiusuraTorneo legaId={legaId} />
      ) : (
        <>
          {settlement.cashResult && (
            <CassaView
              legaId={legaId}
              cashResult={settlement.cashResult}
            />
          )}
          {settlement.cashResult && (
            <ChiusuraCash
              legaId={legaId}
              cashResult={settlement.cashResult}
              trasferimenti={trasferimenti}
            />
          )}
        </>
      )}

      <div className="btn--mt16">
        <button className="btn btn-green btn-block" onClick={handleConferma}>
          Conferma e salva serata
        </button>
      </div>
      <div className="spacer-20" />
    </div>
  );
}
