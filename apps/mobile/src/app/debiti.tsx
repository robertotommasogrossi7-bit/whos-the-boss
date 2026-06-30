import { Stack } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { euro, fmtData, getNome, type Settlement } from '@whos-the-boss/core';

import { IconCheck, IconCoins } from '@/components/icons';
import { Button, Card, EmptyState } from '@/components/ui';
import { selectCurrentLega, useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* DEBITI aperti della lega corrente (port di DebitiScreen). Raggruppa i
   settlement non pagati per debitore; salda singolo / tutti del debitore /
   tutti della lega. */
interface DebitoItem {
  partitaId: number;
  partitaData: string;
  idx: number;
  settlement: Settlement;
}

export default function DebitiScreen() {
  const t = useTheme();
  const lega = useStore(selectCurrentLega);
  const saldaDebito = useStore((s) => s.saldaDebito);
  const saldaTuttiDi = useStore((s) => s.saldaTuttiDi);

  if (!lega) {
    return (
      <View style={[styles.fill, { backgroundColor: t.bg }]}>
        <Stack.Screen options={{ headerShown: true, title: 'Debiti' }} />
        <View style={styles.pad}>
          <EmptyState icon={<IconCoins size={46} color={t.textMuted} />} title="Nessuna lega" hint="Seleziona una lega per vedere i debiti." />
        </View>
      </View>
    );
  }

  const byDebtor = new Map<number, DebitoItem[]>();
  for (const partita of lega.partite) {
    partita.settlements.forEach((s, idx) => {
      if (s.pagato) return;
      const list = byDebtor.get(s.from) ?? [];
      list.push({ partitaId: partita.id, partitaData: partita.data, idx, settlement: s });
      byDebtor.set(s.from, list);
    });
  }
  const debtorIds = [...byDebtor.keys()];

  const doSaldaTuttiDebiti = () => {
    Alert.alert('Saldare tutti i debiti?', "Tutti i debiti aperti della lega. L'operazione non è reversibile.", [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Salda tutti', onPress: () => saldaTuttiDi(lega.id) },
    ]);
  }

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Debiti' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {debtorIds.length > 0 && (
          <Button block onPress={doSaldaTuttiDebiti}>Salda tutti i debiti della lega</Button>
        )}

        {debtorIds.length === 0 ? (
          <EmptyState icon={<IconCheck size={46} color={t.ok} />} title="Nessun debito aperto!" hint="I debiti da saldare compariranno qui." />
        ) : (
          debtorIds.map((debtorId) => {
            const debiti = byDebtor.get(debtorId) ?? [];
            const totale = debiti.reduce((acc, d) => acc + d.settlement.amount, 0);

            return (
              <Card key={debtorId}>
                <View style={[styles.dHeader, { borderBottomColor: t.border }]}>
                  <Text style={[styles.dName, { color: t.text }]}>{getNome(lega, debtorId)}</Text>
                  <Text style={[styles.dTotal, { color: t.danger }]}>{euro(totale)}</Text>
                </View>

                {debiti.map((d) => (
                  <View key={`${d.partitaId}-${d.idx}`} style={styles.dItem}>
                    <View style={styles.grow}>
                      <Text style={[styles.dArrow, { color: t.text }]}>deve a {getNome(lega, d.settlement.to)}</Text>
                      <Text style={[styles.dMeta, { color: t.textMuted }]}>{fmtData(d.partitaData)}</Text>
                    </View>
                    <Text style={[styles.dAmount, { color: t.text }]}>{euro(d.settlement.amount)}</Text>
                    <Button size="sm" onPress={() => saldaDebito(lega.id, d.partitaId, d.idx)}>Salda</Button>
                  </View>
                ))}

                <Button variant="ghost" block onPress={() => saldaTuttiDi(lega.id, debtorId)} style={styles.saldaTutti}>
                  Salda tutti ({euro(totale)})
                </Button>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { padding: 16 },
  content: { padding: 16, gap: 12 },
  dHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 6, borderBottomWidth: 1 },
  dName: { fontSize: 16, fontWeight: '700' },
  dTotal: { fontSize: 16, fontWeight: '800' },
  dItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  grow: { flex: 1 },
  dArrow: { fontSize: 14 },
  dMeta: { fontSize: 12, marginTop: 2 },
  dAmount: { fontSize: 15, fontWeight: '700' },
  saldaTutti: { marginTop: 8 },
});
