import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type Lega } from '@whos-the-boss/core';

import { IconChevronLeft } from '@/components/icons';
import Placeholder from '@/components/Placeholder';
import SerataFlow from '@/components/poker/SerataFlow';
import { useStore } from '@/store/useStore';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/theme/ThemeContext';
import { themeForGame } from '@/theme/theme';

/* SESSIONE POKER (R3) — schermata immersiva a schermo intero, tema feltro SEMPRE.
   SOLO il flusso della serata (SerataFlow: setup / live cash·torneo / chiusura).
   Classifica, storico e giocatori del poker NON vivono piu' qui (erano duplicati):
   stanno nelle viste CONDIVISE — schede della lega e tab globali del Personale —
   come ogni altro gioco (standard BG Stats). La sessione live come modalita'
   dedicata a schermo intero e' lo standard delle app poker note (PokerBoss,
   PokerTimer, Blinds Are Up!, Blind Valet). */
const FELT = themeForGame('poker');

export default function PokerScreen() {
  const { legaId } = useLocalSearchParams<{ legaId: string }>();
  const idNum = Number(legaId);
  const lega = useStore((s) => s.db.leghe.find((l) => l.id === idNum));
  const setCurrentLega = useStore((s) => s.setCurrentLega);

  useEffect(() => {
    if (idNum > 0) setCurrentLega(idNum);
  }, [idNum, setCurrentLega]);

  if (!lega) return <Placeholder title="Lega non trovata" hint="Torna indietro e riprova." />;

  return (
    <AppThemeProvider value={FELT}>
      <PokerInner lega={lega} />
    </AppThemeProvider>
  );
}

function PokerInner({ lega }: { lega: Lega }) {
  const t = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <IconChevronLeft size={24} color={t.text} />
        </Pressable>
        <View style={styles.grow}>
          <Text style={[styles.hTitle, { color: t.text }]} numberOfLines={1}>{lega.nome}</Text>
          <Text style={[styles.hSub, { color: t.textMuted }]}>Poker · {lega.nomi.length} giocatori</Text>
        </View>
      </View>

      <SerataFlow lega={lega} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  grow: { flex: 1 },
  hTitle: { fontSize: 18, fontWeight: '800' },
  hSub: { fontSize: 12, marginTop: 2 },
});
