import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { euro, fmtData, type Lega } from '@whos-the-boss/core';

import { GameIcon, IconLiveDot, IconPlus } from '@/components/icons';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Hub serate — "Nuova serata" + lista delle serate in corso (attiva + bg). */
export default function SerataHub({ lega }: { lega: Lega }) {
  const t = useTheme();
  const setSerataView = useStore((s) => s.setSerataView);
  const setSetupModalita = useStore((s) => s.setSetupModalita);
  const clearSetupPartIds = useStore((s) => s.clearSetupPartIds);
  const apriSerataAttiva = useStore((s) => s.apriSerataAttiva);

  const tutte: { s: NonNullable<Lega['sessioneAttiva']>; bgIdx: number }[] = [];
  if (lega.sessioneAttiva) tutte.push({ s: lega.sessioneAttiva, bgIdx: -1 });
  (lega.serate_bg ?? []).forEach((s, i) => tutte.push({ s, bgIdx: i }));

  function vaiSetup() {
    clearSetupPartIds();
    setSetupModalita('cash');
    setSerataView('setup');
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={vaiSetup} style={[styles.hero, { backgroundColor: t.surface, borderColor: t.accent }]}>
        <View style={[styles.heroIco, { backgroundColor: t.accentSoft }]}><IconPlus size={26} color={t.accent} /></View>
        <View style={styles.grow}>
          <Text style={[styles.heroTitle, { color: t.text }]}>Nuova serata</Text>
          <Text style={[styles.heroSub, { color: t.textMuted }]}>Cash game o torneo</Text>
        </View>
      </Pressable>

      {tutte.length === 0 ? (
        <View style={styles.empty}>
          <GameIcon icona="picche" size={48} color={t.accent} />
          <Text style={[styles.emptyText, { color: t.textMuted }]}>Nessuna serata in corso</Text>
        </View>
      ) : (
        tutte.map(({ s, bgIdx }) => {
          const tipo = s.modalita === 'torneo' ? 'Torneo' : 'Cash';
          const nEnt = (s.giocatori ?? []).filter((g) => g.entrato).length;
          const stato = s.stato === 'attivo' ? ' · In corso' : s.stato === 'pausa' ? ' · In pausa' : '';
          return (
            <Pressable key={bgIdx} onPress={() => apriSerataAttiva(lega.id, bgIdx)} style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
              <IconLiveDot size={14} color={t.danger} />
              <View style={styles.grow}>
                <Text style={[styles.cardTitle, { color: t.text }]}>{tipo} · {fmtData(s.data ?? '')}</Text>
                <Text style={[styles.cardSub, { color: t.textMuted }]}>{nEnt} giocatori · Buy-in {euro(s.buy_in ?? 0)}{stato}</Text>
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 16, padding: 16 },
  heroIco: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  heroTitle: { fontSize: 17, fontWeight: '800' },
  heroSub: { fontSize: 13, marginTop: 2 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 36 },
  emptyText: { fontSize: 14 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 2 },
});
