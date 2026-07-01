import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GameBar from '@/components/GameBar';
import SchermataGioco from '@/components/gioco/SchermataGioco';
import { GameIcon, IconChevronRight, IconPlus, IconUsers } from '@/components/icons';
import SheetNuovaSerata from '@/components/serata/SheetNuovaSerata';
import { Avatar, Button, EmptyState } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* HOME — "Segna partita" (ambito Personale). In cima la GameBar (ri-tema l'app).
   Il gioco scelto apre il flusso comune sui guest del Personale; il poker
   rimanda alla sua schermata dedicata (in arrivo). */
export default function HomeScreen() {
  const t = useTheme();
  const giocoFiltro = useStore((s) => s.giocoFiltro);
  const personale = useStore((s) => s.db.leghe.find((l) => l.personale));
  const utente = useStore((s) => s.utente);
  const [nuovaSerata, setNuovaSerata] = useState(false);

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: t.bg }]}>
      <View style={styles.topbar}>
        <Text style={[styles.brand, { color: t.text }]} numberOfLines={1}>Who&apos;s the Boss</Text>
        <View style={styles.topActions}>
          {personale ? (
            <Pressable
              onPress={() => router.push({ pathname: '/giocatori/[legaId]', params: { legaId: String(personale.id) } })}
              hitSlop={8}
              accessibilityLabel="Giocatori"
            >
              <IconUsers size={22} color={t.textMuted} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.push('/profilo')} hitSlop={8} accessibilityLabel="Profilo">
            <Avatar nome={utente?.username} size="sm" />
          </Pressable>
        </View>
      </View>
      <GameBar />
      {personale ? (
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
      ) : null}
      {giocoFiltro === 'poker' ? (
        <View style={styles.pad}>
          <EmptyState
            icon={<GameIcon icona="picche" size={48} color={t.accent} />}
            title="Poker"
            hint="Serata dal vivo: cash o torneo, con soldi, timer e chi paga chi. Classifica e storico li trovi nelle sezioni condivise."
            action={<Button onPress={() => { if (personale) router.push({ pathname: '/poker/[legaId]', params: { legaId: String(personale.id) } }); }}>Apri il poker</Button>}
          />
        </View>
      ) : personale ? (
        <SchermataGioco legaId={personale.id} giocoId={giocoFiltro} />
      ) : (
        <View style={styles.pad}>
          <EmptyState title="Un attimo…" hint="Sto preparando il tuo spazio personale." />
        </View>
      )}

      {nuovaSerata && personale && (
        <SheetNuovaSerata lega={personale} onClose={() => setNuovaSerata(false)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { padding: 16 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  brand: { fontSize: 20, fontWeight: '800', flex: 1 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  serataBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginHorizontal: 16, marginTop: 12 },
  serataTitle: { fontSize: 15, fontWeight: '800' },
  serataSub: { fontSize: 12, marginTop: 1 },
  grow: { flex: 1 },
  pressed: { opacity: 0.85 },
});
