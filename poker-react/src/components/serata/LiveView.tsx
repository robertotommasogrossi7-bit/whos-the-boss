import { useStore, selectCurrentLega, selectSessioneAttiva } from '../../store/useStore';
import { fmtData, euro } from '../../utils/format';

export default function LiveView() {
  const lega             = useStore(selectCurrentLega);
  const sess             = useStore(selectSessioneAttiva);
  const setSerataView    = useStore(s => s.setSerataView);
  const annullaSessione  = useStore(s => s.annullaSessione);

  if (!lega || !sess) return null;

  const tipo  = sess.modalita === 'torneo' ? '🏆 Torneo' : '💰 Cash';
  const nEnt  = sess.giocatori.filter(g => g.entrato).length;

  return (
    <div className="tab-content">
      {/* Bottone per tornare all'hub di tutte le serate */}
      <button
        className="btn btn-gray btn-sm btn-back-serata"
        onClick={() => setSerataView('hub')}
      >
        ‹ Tutte le serate
      </button>

      {/* Card sessione attiva */}
      <div className="card">
        <div className="card-title">Serata in corso</div>
        <p>
          <strong>{tipo}</strong> · {fmtData(sess.data)}<br />
          Buy-in: €{euro(sess.buy_in)} · {nEnt} giocatori entrati
        </p>
        {sess.modalita === 'torneo' && (
          <p className="help-note">
            Stato: {sess.stato} · Livello {sess.livello_corrente + 1}
          </p>
        )}
      </div>

      <div className="empty">
        <div className="eico">🃏</div>
        <p>Gestione live — disponibile nella Fase 5</p>
      </div>

      {/* Annulla serata */}
      <button
        className="btn btn-red btn-block"
        onClick={() => annullaSessione(lega.id)}
      >
        ✕ Annulla serata
      </button>
    </div>
  );
}
