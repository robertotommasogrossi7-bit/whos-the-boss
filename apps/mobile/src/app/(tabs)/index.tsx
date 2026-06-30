import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GameBar from '@/components/GameBar';
import SchermataGioco from '@/components/gioco/SchermataGioco';
import { GameIcon } from '@/components/icons';
import { Button, EmptyState } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* HOME — "Segna partita" (ambito Personale). In cima la GameBar (ri-tema l'app).
   Il gioco scelto apre il flusso comune sui guest del Personale; il poker
   rimanda alla sua schermata dedicata (in arrivo). */
export default function HomeScreen() {
  const t = useTheme();
  const giocoFiltro = useStore((s) => s.giocoFiltro);
  const personale = useStore((s) => s.db.leghe.find((l) => l.personale));

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: t.bg }]}>
      <GameBar />
      {giocoFiltro === 'poker' ? (
        <View style={styles.pad}>
          <EmptyState
            icon={<GameIcon icona="picche" size={48} color={t.accent} />}
            title="Poker"
            hint="Il poker ha la sua schermata dedicata (serata, soldi, timer, settlement) — in arrivo in R1."
            action={<Button onPress={() => Alert.alert('In arrivo', 'La schermata Poker arriva in R1.')}>Apri il Poker</Button>}
          />
        </View>
      ) : personale ? (
        <SchermataGioco legaId={personale.id} giocoId={giocoFiltro} />
      ) : (
        <View style={styles.pad}>
          <EmptyState title="Un attimo…" hint="Sto preparando il tuo spazio personale." />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { padding: 16 },
});
