import { useStore, selectCurrentLega } from '../../store/useStore';
import { fmtData, euro } from '../../utils/format';
import SetupForm      from '../serata/SetupForm';
import LiveView       from '../serata/LiveView';
import ChiusuraScreen from '../settlement/ChiusuraScreen';

export default function PartitaOverlay() {
  const overlayOpen  = useStore(s => s.overlayOpen);
  const serataView   = useStore(s => s.serataView);
  const settlement   = useStore(s => s.settlement);
  const closeOverlay = useStore(s => s.closeOverlay);
  const lega         = useStore(selectCurrentLega);

  if (!overlayOpen) return null;

  const sess = lega?.sessioneAttiva;
  const titleLabel = serataView === 'setup'
    ? 'Nuova partita'
    : serataView === 'chiusura'
      ? (settlement?.isTorneo ? '🏆 Chiusura torneo' : '💰 Chiusura cash')
      : sess
        ? (sess.modalita === 'torneo'
            ? `🏆 Torneo · ${fmtData(sess.data)} · €${euro(sess.buy_in)}`
            : `💰 Cash · ${fmtData(sess.data)} · €${euro(sess.buy_in)}`)
        : '';

  return (
    <div className="partita-overlay">
      <div className="overlay-topbar">
        <button className="overlay-minimize" onClick={closeOverlay}>
          ‹ Minimizza
        </button>
        {titleLabel && (
          <span className="overlay-title">{titleLabel}</span>
        )}
      </div>
      <div className="overlay-body">
        {serataView === 'setup'    && <SetupForm />}
        {serataView === 'live'     && <LiveView />}
        {serataView === 'chiusura' && (settlement ? <ChiusuraScreen /> : <LiveView />)}
      </div>
    </div>
  );
}
