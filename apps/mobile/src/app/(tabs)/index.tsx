import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Button, Card, Chip, EmptyState, ListRow, Sheet, Toast } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

/* R1.2 — anteprima del design system (temporanea).
   Esercita tutte le primitive native; la Home vera arriva in R1.4. */
export default function HomeScreen() {
  const t = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState(false);

  const showToast = () => {
    setToast(true);
    setTimeout(() => setToast(false), 1600);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.h, { color: t.text }]}>Home</Text>
        <Text style={[styles.sub, { color: t.textMuted }]}>
          anteprima design system (R1.2) · la Home vera arriva in R1.4
        </Text>

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
          <EmptyState title="Empty state" hint="quando una lista e' vuota, mai schermo bianco" />
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
