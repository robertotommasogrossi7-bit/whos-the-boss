import { useStore, selectCurrentLega } from '../../store/useStore';
import LiveCash   from './LiveCash';
import LiveTorneo from './LiveTorneo';

/**
 * Dispatcher principale della vista live.
 * Smista a LiveCash o LiveTorneo in base alla modalità della sessione attiva.
 */
export default function LiveView() {
  const lega = useStore(selectCurrentLega);
  const sess = lega?.sessioneAttiva;

  if (!sess) return null;

  return sess.modalita === 'torneo' ? <LiveTorneo /> : <LiveCash />;
}
