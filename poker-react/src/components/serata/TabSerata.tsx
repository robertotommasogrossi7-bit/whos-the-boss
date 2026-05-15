import { useStore, selectCurrentLega } from '../../store/useStore';
import SerataHub from './SerataHub';
import SetupForm from './SetupForm';
import LiveView  from './LiveView';

/**
 * Dispatcher principale del tab Serata.
 * Replica la logica di renderPartitaForm() in session-hub.js:
 *   serataView === 'live' && sessioneAttiva → LiveView
 *   serataView === 'setup'                  → SetupForm
 *   default ('hub')                         → SerataHub
 */
export default function TabSerata() {
  const serataView = useStore(s => s.serataView);
  const lega       = useStore(selectCurrentLega);

  if (!lega) return null;

  if (serataView === 'live' && lega.sessioneAttiva) {
    return <LiveView />;
  }
  if (serataView === 'setup') {
    return <SetupForm />;
  }
  // default: hub
  return <SerataHub />;
}
