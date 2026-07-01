import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { classificaSerata, fmtData, getNome, sessioniDiSerata, vincitoriSerata, type Lega } from '@whos-the-boss/core';

import { IconChevronRight, IconCrown } from '@/components/icons';
import { useTheme } from '@/theme/ThemeContext';

/* Sezione "Serate" (R4d) — le serate multi-gioco della lega/Personale nello
   Storico. Ogni riga (data · n. giochi · vincitore) apre il suo hub. Mostra
   solo le serate con almeno un gioco. */
export default function SerateLista({ lega }: { lega: Lega }) {
  const t = useTheme();

  const serate = (lega.serate ?? [])
    .filter((s) => sessioniDiSerata(lega, s.id).length > 0)
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.id - a.id));

  if (serate.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.hdr, { color: t.text }]}>Serate</Text>
      {serate.map((s) => {
        const nGiochi = sessioniDiSerata(lega, s.id).length;
        const vincitori = vincitoriSerata(lega, s.id);
        const nomi = vincitori.map((id) => getNome(lega, id)).join(', ');
        const conVincitore = nomi.length > 0 && !classificaSerata(lega, s.id).every((r) => r.punti === 0);
        return (
          <Pressable
            key={s.id}
            onPress={() => router.push({ pathname: '/serata/[legaId]/[serataId]', params: { legaId: String(lega.id), serataId: String(s.id) } })}
            style={({ pressed }) => [styles.row, { backgroundColor: t.surface, borderColor: t.border }, pressed && styles.pressed]}
          >
            <View style={styles.grow}>
              <Text style={[styles.title, { color: t.text }]}>{fmtData(s.data)}</Text>
              <Text style={[styles.sub, { color: t.textMuted }]} numberOfLines={1}>
                {nGiochi} {nGiochi === 1 ? 'gioco' : 'giochi'}{conVincitore ? ` · vince ${nomi}` : ''}
              </Text>
            </View>
            {conVincitore ? <IconCrown size={16} color={t.accent} /> : null}
            <IconChevronRight size={18} color={t.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  hdr: { fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  grow: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  pressed: { opacity: 0.85 },
});
