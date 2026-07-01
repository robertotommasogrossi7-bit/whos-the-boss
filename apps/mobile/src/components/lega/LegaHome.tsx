import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GIOCHI_PREIMPOSTATI, type Lega } from '@whos-the-boss/core';

import { GameIcon, IconChevronRight, IconCoins, IconPlus } from '@/components/icons';
import SheetNuovaSerata from '@/components/serata/SheetNuovaSerata';
import { useTheme } from '@/theme/ThemeContext';

/* HOME della lega — griglia giochi + "Nuova serata" (multi-gioco). Tap su un
   gioco apre il segna-partita per (lega, gioco); il poker apre la sua sessione
   dedicata. (Niente GameBar: il gioco si sceglie qui.) */
export default function LegaHome({ lega }: { lega: Lega }) {
  const t = useTheme();
  const [nuovaSerata, setNuovaSerata] = useState(false);
  const debitiAperti = lega.partite.flatMap((p) => p.settlements).filter((s) => !s.pagato).length;

  function entra(id: string) {
    if (id === 'poker') {
      router.push({ pathname: '/poker/[legaId]', params: { legaId: String(lega.id) } });
      return;
    }
    router.push({ pathname: '/gioco/[legaId]/[giocoId]', params: { legaId: String(lega.id), giocoId: id } });
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {debitiAperti > 0 ? (
        <Pressable
          onPress={() => router.push('/debiti')}
          style={[styles.debtBanner, { backgroundColor: t.dangerSoft, borderColor: t.danger }]}
        >
          <IconCoins size={18} color={t.danger} />
          <Text style={[styles.debtText, { color: t.danger }]}>
            {debitiAperti} {debitiAperti === 1 ? 'debito aperto' : 'debiti aperti'}
          </Text>
          <IconChevronRight size={16} color={t.danger} />
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => setNuovaSerata(true)}
        style={({ pressed }) => [styles.serataBtn, { backgroundColor: t.accentSoft, borderColor: t.accent }, pressed && styles.pressed]}
      >
        <IconPlus size={18} color={t.accent} />
        <View style={styles.grow}>
          <Text style={[styles.serataTitle, { color: t.accent }]}>Nuova serata</Text>
          <Text style={[styles.serataSub, { color: t.textMuted }]} numberOfLines={1}>Più giochi in una sera, classifica unica</Text>
        </View>
        <IconChevronRight size={18} color={t.accent} />
      </Pressable>

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

      {nuovaSerata && <SheetNuovaSerata lega={lega} onClose={() => setNuovaSerata(false)} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  secHdr: { fontSize: 18, fontWeight: '800' },
  debtBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  debtText: { flex: 1, fontSize: 14, fontWeight: '700' },
  serataBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  serataTitle: { fontSize: 15, fontWeight: '800' },
  serataSub: { fontSize: 12, marginTop: 1 },
  grow: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '30%', flexGrow: 1, minWidth: 96, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, padding: 8 },
  pressed: { opacity: 0.85 },
  tileNome: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
