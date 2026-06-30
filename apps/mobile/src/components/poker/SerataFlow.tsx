import { ScrollView, StyleSheet } from 'react-native';

import { type Lega } from '@whos-the-boss/core';

import { GameIcon } from '@/components/icons';
import SerataHub from '@/components/poker/SerataHub';
import SetupForm from '@/components/poker/SetupForm';
import { Button, EmptyState } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Macchina a stati della serata (su store.serataView): hub | setup | live |
   chiusura. Live/chiusura sono placeholder fino a R1.5c-e. */
export default function SerataFlow({ lega }: { lega: Lega }) {
  const t = useTheme();
  const serataView = useStore((s) => s.serataView);
  const setSerataView = useStore((s) => s.setSerataView);

  if (serataView === 'setup') return <SetupForm lega={lega} />;

  if (serataView === 'live' || serataView === 'chiusura') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState
          icon={<GameIcon icona="picche" size={48} color={t.accent} />}
          title="Serata in corso"
          hint="La serata è creata e salvata. La gestione live (cash/torneo) + settlement arriva in R1.5c-e."
        />
        <Button variant="ghost" block onPress={() => setSerataView('hub')}>Torna alle serate</Button>
      </ScrollView>
    );
  }

  return <SerataHub lega={lega} />;
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
});
