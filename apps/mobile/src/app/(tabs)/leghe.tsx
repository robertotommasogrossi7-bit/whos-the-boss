import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { euroSigned, èSeiTuRecord, type Lega } from '@whos-the-boss/core';

import { GameIcon, IconChevronRight, IconTrophy } from '@/components/icons';
import { Button, Card, EmptyState } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* R1.4 — Le tue leghe (port di ListaLeghe web). Lista dallo store + stats
   personali (rendimento/vittorie) per lega; tap apre la lega. */
function statsUtente(lega: Lega, accountId?: string) {
  const meId = lega.nomi.find((n) => èSeiTuRecord(n, accountId))?.id;
  if (meId === undefined) return { rendimento: 0, vittorie: 0 };
  let rendimento = 0;
  let vittorie = 0;
  lega.partite.forEach((p) => {
    const g = p.giocatori.find((x) => x.id_nome === meId);
    if (g) {
      rendimento += g.netto_finale ?? 0;
      if (g.vincitore) vittorie += 1;
    }
  });
  return { rendimento, vittorie };
}

export default function LegheScreen() {
  const t = useTheme();
  const leghe = useStore((s) => s.db.leghe.filter((l) => !l.personale));
  const utente = useStore((s) => s.utente);
  const setCurrentLega = useStore((s) => s.setCurrentLega);

  function apri(id: number) {
    setCurrentLega(id);
    router.push({ pathname: '/lega/[id]', params: { id: String(id) } });
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.h, { color: t.text }]}>Le tue leghe</Text>

        {leghe.length === 0 ? (
          <Card>
            <EmptyState
              icon={<IconTrophy size={46} color={t.textMuted} />}
              title="Nessuna lega"
              hint="Non sei ancora in nessuna lega. Creane una nuova!"
              action={<Button onPress={() => router.push('/nuova-lega')}>+ Crea la tua prima lega</Button>}
            />
          </Card>
        ) : (
          <>
            {leghe.map((lega) => {
              const np = lega.nomi.length;
              const ng = lega.partite.length;
              const { rendimento, vittorie } = statsUtente(lega, utente?.id);
              const rendColor = rendimento > 0 ? t.ok : rendimento < 0 ? t.danger : t.textMuted;
              const preview =
                lega.nomi.slice(0, 3).map((n) => n.nome).join(', ') +
                (lega.nomi.length > 3 ? `, +${lega.nomi.length - 3}` : '');

              return (
                <Pressable key={lega.id} onPress={() => apri(lega.id)}>
                  {({ pressed }) => (
                    <Card style={pressed ? styles.pressed : undefined}>
                      <View style={styles.head}>
                        <View style={[styles.foto, { backgroundColor: t.surface2 }]}>
                          {lega.foto
                            ? <Image source={{ uri: lega.foto }} style={styles.fotoImg} />
                            : <GameIcon icona="picche" size={24} color={t.accent} />}
                        </View>
                        <View style={styles.grow}>
                          <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>{lega.nome}</Text>
                          <Text style={[styles.meta, { color: t.textMuted }]} numberOfLines={1}>
                            {np} partecipanti · {preview || '—'}
                          </Text>
                        </View>
                        <IconChevronRight size={20} color={t.textMuted} />
                      </View>

                      <View style={[styles.stats, { borderTopColor: t.border }]}>
                        <Stat label="Serate" value={String(ng)} color={t.text} />
                        <Stat label="Vittorie tue" value={String(vittorie)} color={t.text} />
                        <Stat label="Tuo netto" value={euroSigned(rendimento)} color={rendColor} />
                      </View>
                    </Card>
                  )}
                </Pressable>
              );
            })}

          </>
        )}
      </ScrollView>

      {leghe.length > 0 ? (
        <View style={[styles.footer, { borderTopColor: t.border, backgroundColor: t.bg }]}>
          <Button block onPress={() => router.push('/nuova-lega')}>+ Nuova lega</Button>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const t = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: t.textMuted }]}>{label}</Text>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 16, gap: 12 },
  footer: { padding: 16, borderTopWidth: 1 },
  h: { fontSize: 24, fontWeight: '800' },
  pressed: { opacity: 0.85 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  foto: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fotoImg: { width: 44, height: 44 },
  grow: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 2 },
  stats: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: 1 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 11 },
  statVal: { fontSize: 16, fontWeight: '700' },
});
