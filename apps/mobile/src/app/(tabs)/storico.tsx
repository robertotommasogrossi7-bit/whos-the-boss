import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { vociStorico } from '@whos-the-boss/core';

import FiltroNome from '@/components/classifica/FiltroNome';
import GameBar from '@/components/GameBar';
import { IconHistory } from '@/components/icons';
import StoricoLista from '@/components/storico/StoricoLista';
import { EmptyState } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* STORICO globale / Personale (#4.7b) — port nativo di StoricoShell.
   Filtrato dalla GameBar (giocoFiltro), sul componente condiviso StoricoLista. */
export default function StoricoScreen() {
  const t = useTheme();
  const giocoFiltro = useStore((s) => s.giocoFiltro);
  const personale = useStore((s) => s.db.leghe.find((l) => l.personale));
  const [query, setQuery] = useState('');

  if (!personale) {
    return (
      <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: t.bg }]}>
        <GameBar />
        <View style={styles.pad}>
          <EmptyState icon={<IconHistory size={48} color={t.textMuted} />} title="Storico in arrivo" />
        </View>
      </SafeAreaView>
    );
  }

  const voci = vociStorico(personale, { giocoId: giocoFiltro });

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: t.bg }]}>
      <GameBar />
      <ScrollView contentContainerStyle={styles.content}>
        {(voci.length > 0 || query.trim().length > 0) && <FiltroNome value={query} onChange={setQuery} />}
        <StoricoLista lega={personale} voci={voci} query={query} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { padding: 16 },
  content: { padding: 16, gap: 12 },
});
