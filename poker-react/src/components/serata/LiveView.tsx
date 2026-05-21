import { useStore, selectCurrentLega } from '../../store/useStore';
import LiveCash     from './LiveCash';
import LiveTorneo   from './LiveTorneo';
import WaitingPanel from './WaitingPanel';

/**
 * Dispatcher principale della vista live.
 * - stato 'pre'  → WaitingPanel (serata programmata, non ancora avviata)
 * - altrimenti   → LiveCash / LiveTorneo in base alla modalità
 */
export default function LiveView() {
  const lega = useStore(selectCurrentLega);
  const sess = lega?.sessioneAttiva;

  if (!sess) return null;
  if (sess.stato === 'pre') return <WaitingPanel />;

  return sess.modalita === 'torneo' ? <LiveTorneo /> : <LiveCash />;
}
