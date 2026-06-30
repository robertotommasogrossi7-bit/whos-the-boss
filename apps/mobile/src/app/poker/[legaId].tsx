import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { classificaUnificata, vociStorico, type Lega } from '@whos-the-boss/core';

import ClassificaTable from '@/components/classifica/ClassificaTable';
import FiltroNome from '@/components/classifica/FiltroNome';
import { GameIcon, IconChevronLeft } from '@/components/icons';
import LegaGiocatori from '@/components/lega/LegaGiocatori';
import StoricoLista from '@/components/storico/StoricoLista';
import { EmptyState } from '@/components/ui';
import Placeholder from '@/components/Placeholder';
import { useStore } from '@/store/useStore';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/theme/ThemeContext';
import { themeForGame } from '@/theme/theme';

/* APP POKER (shell, R1.5a) — tema feltro SEMPRE (a prescindere dalla GameBar).
   4 schede: Serata (placeholder → flusso live in R1.5b+), Giocatori/Storico/
   Classifica riusano i componenti condivisi. Header proprio (feltro). */
const FELT = themeForGame('poker');

const TABS = [
  { key: 'serata', label: 'Serata' },
  { key: 'giocatori', label: 'Giocatori' },
  { key: 'storico', label: 'Storico' },
  { key: 'classifica', label: 'Classifica' },
] as const;

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
  const [tab, setTab] = useState<string>('serata');

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

      {tab === 'serata' && (
        <ScrollView contentContainerStyle={styles.content}>
          <EmptyState
            icon={<GameIcon icona="picche" size={48} color={t.accent} />}
            title="Serata di poker"
            hint="Il flusso serata live (cash/torneo) + settlement arriva nelle prossime sotto-fasi (R1.5b+)."
          />
        </ScrollView>
      )}
      {tab === 'giocatori' && <LegaGiocatori lega={lega} />}
      {tab === 'storico' && <PokerStorico lega={lega} />}
      {tab === 'classifica' && <PokerClassifica lega={lega} />}
    </SafeAreaView>
  );
}

function PokerStorico({ lega }: { lega: Lega }) {
  const [query, setQuery] = useState('');
  const voci = vociStorico(lega, { giocoId: 'poker' });
  return (
    <ScrollView contentContainerStyle={styles.content}>
      {voci.length > 0 ? <FiltroNome value={query} onChange={setQuery} /> : null}
      <StoricoLista lega={lega} voci={voci} query={query} />
    </ScrollView>
  );
}

function PokerClassifica({ lega }: { lega: Lega }) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const classifica = classificaUnificata(lega, 'poker');
  const haDati = classifica.righe.some((r) => (r.kpi.tipo === 'soldi' ? r.kpi.partiteGiocate > 0 : false));
  return (
    <ScrollView contentContainerStyle={styles.content}>
      {!haDati ? (
        <EmptyState icon={<GameIcon icona="picche" size={44} color={t.accent} />} title="Nessuna serata" hint="Gioca e chiudi qualche serata di poker per vedere la classifica." />
      ) : (
        <>
          <FiltroNome value={query} onChange={setQuery} />
          <ClassificaTable classifica={classifica} query={query} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  grow: { flex: 1 },
  hTitle: { fontSize: 18, fontWeight: '800' },
  hSub: { fontSize: 12, marginTop: 2 },
  seg: { flexDirection: 'row', margin: 12, borderRadius: 10, padding: 3, gap: 3 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  segText: { fontSize: 12, fontWeight: '600' },
  content: { padding: 16, gap: 12 },
});
