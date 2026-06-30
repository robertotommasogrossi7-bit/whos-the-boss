import { ScrollView, StyleSheet } from 'react-native';

import { type Lega } from '@whos-the-boss/core';

import { GameIcon } from '@/components/icons';
import ChiusuraScreen from '@/components/poker/ChiusuraScreen';
import LiveCash from '@/components/poker/LiveCash';
import SerataHub from '@/components/poker/SerataHub';
import SetupForm from '@/components/poker/SetupForm';
import { Button, EmptyState } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Macchina a stati della serata (su store.serataView):
   hub → SerataHub · setup → SetupForm · live → LiveCash (cash) / placeholder
   torneo (R1.5d) · chiusura → placeholder settlement (R1.5e). */
export default function SerataFlow({ lega }: { lega: Lega }) {
  const t = useTheme();
  const serataView = useStore((s) => s.serataView);
  const setSerataView = useStore((s) => s.setSerataView);
  const sess = lega.sessioneAttiva;

  if (serataView === 'setup') return <SetupForm lega={lega} />;

  if (serataView === 'live' && sess) {
    if (sess.modalita === 'torneo') {
      return (
        <ScrollView contentContainerStyle={styles.content}>
          <EmptyState
            icon={<GameIcon icona="picche" size={48} color={t.accent} />}
            title="Torneo live"
            hint="La gestione torneo dal vivo (timer, livelli, rebuy, premi) arriva in R1.5d. La serata è salvata."
          />
          <Button variant="ghost" block onPress={() => setSerataView('hub')}>Torna alle serate</Button>
        </ScrollView>
      );
    }
    return <LiveCash lega={lega} />;
  }

  if (serataView === 'chiusura') return <ChiusuraScreen />;

  return <SerataHub lega={lega} />;
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
});
