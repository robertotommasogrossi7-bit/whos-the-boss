import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { GIOCHI_PREIMPOSTATI } from '@whos-the-boss/core';

import SchermataGioco from '@/components/gioco/SchermataGioco';
import { useTheme } from '@/theme/ThemeContext';

/* Rotta gioco di una lega — segna-partita per (legaId, giocoId). Raggiunta
   dalla griglia giochi della sezione Lega. Header nativo col nome del gioco. */
export default function GiocoScreen() {
  const t = useTheme();
  const { legaId, giocoId } = useLocalSearchParams<{ legaId: string; giocoId: string }>();
  const nome = GIOCHI_PREIMPOSTATI.find((g) => g.id === giocoId)?.nome ?? 'Gioco';

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <Stack.Screen options={{ headerShown: true, title: nome }} />
      <SchermataGioco legaId={Number(legaId)} giocoId={String(giocoId)} />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
