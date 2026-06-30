import { type Lega } from '@whos-the-boss/core';

import ChiusuraScreen from '@/components/poker/ChiusuraScreen';
import LiveCash from '@/components/poker/LiveCash';
import LiveTorneo from '@/components/poker/LiveTorneo';
import SerataHub from '@/components/poker/SerataHub';
import SetupForm from '@/components/poker/SetupForm';
import { useStore } from '@/store/useStore';

/* Macchina a stati della serata (su store.serataView):
   hub → SerataHub · setup → SetupForm · live → LiveCash / LiveTorneo (per
   modalità) · chiusura → ChiusuraScreen. */
export default function SerataFlow({ lega }: { lega: Lega }) {
  const serataView = useStore((s) => s.serataView);
  const sess = lega.sessioneAttiva;

  if (serataView === 'setup') return <SetupForm lega={lega} />;

  if (serataView === 'live' && sess) {
    return sess.modalita === 'torneo' ? <LiveTorneo lega={lega} /> : <LiveCash lega={lega} />;
  }

  if (serataView === 'chiusura') return <ChiusuraScreen />;

  return <SerataHub lega={lega} />;
}
