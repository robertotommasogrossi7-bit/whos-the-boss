import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GameBar from '@/components/GameBar';
import { GameIcon, IconCheck, IconClock, IconCoins, IconCrown } from '@/components/icons';
import { Avatar, Button, Card, Chip, EmptyState, ListRow, Sheet, Toast } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* R1.2 — anteprima del design system (temporanea).
   Esercita tutte le primitive + le icone native; la Home vera arriva in R1.4. */
export default function HomeScreen() {
  const t = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const numLeghe = useStore((s) => s.db.leghe.length);

  const showToast = () => {
    setToast(true);
    setTimeout(() => setToast(false), 1600);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: t.bg }]}>
      <GameBar />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.h, { color: t.text }]}>Home</Text>
        <Text style={[styles.sub, { color: t.textMuted }]}>
          anteprima design system (R1.2) · la Home vera arriva in R1.4
        </Text>

        <Card>
          <Text style={[styles.cardTitle, { color: t.text }]}>Store condiviso · AsyncStorage</Text>
          <Text style={[styles.cardSub, { color: t.textMuted }]}>
            @whos-the-boss/state attivo · {numLeghe} {numLeghe === 1 ? 'lega' : 'leghe'}
          </Text>
        </Card>

        <Card>
          <View style={styles.row}>
            <Avatar nome="Giulia" />
            <View style={styles.grow}>
              <Text style={[styles.cardTitle, { color: t.text }]}>Card + Avatar</Text>
              <Text style={[styles.cardSub, { color: t.textMuted }]}>contenitore su surface</Text>
            </View>
            <Chip tone="ok">attiva</Chip>
          </View>
        </Card>

        <View style={styles.row}>
          <Chip tone="accent">accent</Chip>
          <Chip tone="warn">warn</Chip>
          <Chip tone="danger">danger</Chip>
          <Chip tone="muted">muted</Chip>
        </View>

        <Card>
          <View style={styles.row}>
            <IconCrown color={t.warn} />
            <IconCheck color={t.ok} />
            <IconClock color={t.accent} />
            <IconCoins color={t.accent} />
            <GameIcon icona="picche" color={t.text} />
            <GameIcon icona="coppe" color={t.text} />
            <GameIcon icona="denari" color={t.text} />
            <GameIcon icona="magic" color={t.text} />
          </View>
        </Card>

        <ListRow
          left={<Avatar nome="Marco" size="sm" />}
          title="Marco Rossi"
          subtitle="ultima partita: ieri"
          right="+120"
          onPress={() => {}}
        />
        <ListRow title="Riga informativa" subtitle="senza azione" right="0" />

        <Button onPress={() => {}}>Primary</Button>
        <Button variant="ghost" onPress={() => setSheetOpen(true)}>Apri sheet</Button>
        <Button variant="danger" onPress={() => {}}>Danger</Button>
        <Button size="sm" onPress={showToast}>Mostra toast</Button>

        <Card>
          <EmptyState
            icon={<GameIcon icona="mazzo" size={40} color={t.textMuted} />}
            title="Empty state"
            hint="quando una lista e' vuota, mai schermo bianco"
          />
        </Card>
      </ScrollView>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Esempio sheet">
        <Text style={[styles.sheetBody, { color: t.text }]}>
          Pannello dal basso nativo. Tap fuori o sul bottone per chiudere.
        </Text>
        <Button block onPress={() => setSheetOpen(false)}>Chiudi</Button>
      </Sheet>

      <Toast message="Fatto!" visible={toast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 16, gap: 12 },
  h: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 13, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  grow: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 13 },
  sheetBody: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
});
