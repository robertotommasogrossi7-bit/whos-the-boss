import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GIOCHI_PREIMPOSTATI, type Lega } from '@whos-the-boss/core';

import { GameIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeContext';

/* HOME della lega — griglia giochi. Tap = avvia il gioco (poker / segna-partita):
   quelle schermate arrivano dopo, per ora un avviso. (Niente GameBar: il gioco
   si sceglie qui.) */
export default function LegaHome({ lega: _lega }: { lega: Lega }) {
  const t = useTheme();

  function entra(id: string) {
    Alert.alert(
      'In arrivo',
      id === 'poker' ? 'La schermata Poker (serata/live) arriva in R1.' : 'Il segna-partita arriva in R1.',
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.secHdr, { color: t.text }]}>Giochi</Text>
      <View style={styles.grid}>
        {GIOCHI_PREIMPOSTATI.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => entra(g.id)}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: t.surface, borderColor: g.id === 'poker' ? t.accent : t.border },
              pressed && styles.pressed,
            ]}
          >
            <GameIcon icona={g.icona} size={34} color={t.accent} />
            <Text style={[styles.tileNome, { color: t.text }]} numberOfLines={1}>{g.nome}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  secHdr: { fontSize: 18, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '30%', flexGrow: 1, minWidth: 96, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, padding: 8 },
  pressed: { opacity: 0.85 },
  tileNome: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
