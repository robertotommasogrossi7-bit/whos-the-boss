import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Placeholder from '@/components/Placeholder';
import LegaClassifica from '@/components/lega/LegaClassifica';
import LegaGiocatori from '@/components/lega/LegaGiocatori';
import LegaHome from '@/components/lega/LegaHome';
import LegaStorico from '@/components/lega/LegaStorico';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Sezione lega — 4 schede (Home/Classifica/Storico/Giocatori) via segmented
   control. Il titolo dell'header nativo prende il nome della lega. */
const TABS = [
  { key: 'home', label: 'Home' },
  { key: 'classifica', label: 'Classifica' },
  { key: 'storico', label: 'Storico' },
  { key: 'giocatori', label: 'Giocatori' },
] as const;

export default function LegaDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idNum = Number(id);
  const lega = useStore((s) => s.db.leghe.find((l) => l.id === idNum));
  const setCurrentLega = useStore((s) => s.setCurrentLega);
  const [tab, setTab] = useState<string>('home');

  useEffect(() => {
    if (idNum > 0) setCurrentLega(idNum);
  }, [idNum, setCurrentLega]);

  if (!lega) {
    return <Placeholder title="Lega non trovata" hint="Torna indietro e riprova." />;
  }

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <Stack.Screen options={{ title: lega.nome }} />

      <View style={[styles.seg, { backgroundColor: t.surface2 }]}>
        {TABS.map((tb) => {
          const sel = tb.key === tab;
          return (
            <Pressable key={tb.key} onPress={() => setTab(tb.key)} style={[styles.segItem, sel && { backgroundColor: t.surface }]}>
              <Text style={[styles.segText, { color: sel ? t.text : t.textMuted }]} numberOfLines={1}>{tb.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'home' && <LegaHome lega={lega} />}
      {tab === 'classifica' && <LegaClassifica lega={lega} />}
      {tab === 'storico' && <LegaStorico lega={lega} />}
      {tab === 'giocatori' && <LegaGiocatori lega={lega} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  seg: { flexDirection: 'row', margin: 12, borderRadius: 10, padding: 3, gap: 3 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  segText: { fontSize: 13, fontWeight: '600' },
});
