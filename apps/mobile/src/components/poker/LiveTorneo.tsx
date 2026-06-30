import type { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { euro, fmtData, type Lega } from '@whos-the-boss/core';

import { GameIcon, IconClock, IconCoins, IconTrophy, IconUsers } from '@/components/icons';
import SubOrologio from '@/components/poker/SubOrologio';
import { Button, EmptyState } from '@/components/ui';
import { useTimer } from '@/hooks/useTimer';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Live torneo — shell: timer (useTimer, gira su tutti i sub-tab) + sub-tab
   Orologio / Player / Premi + chiudi/annulla. Player/Premi = placeholder
   (R1.5d2/d3). */
export default function LiveTorneo({ lega }: { lega: Lega }) {
  const t = useTheme();
  const liveSubTab = useStore((s) => s.liveSubTab);
  const setLiveSubTab = useStore((s) => s.setLiveSubTab);
  const annullaSessione = useStore((s) => s.annullaSessione);
  const avanzaLivelloAuto = useStore((s) => s.avanzaLivelloAuto);
  const recoveryTorneo = useStore((s) => s.recoveryTorneo);
  const apriChiusuraTorneo = useStore((s) => s.apriChiusuraTorneo);
  const setSerataView = useStore((s) => s.setSerataView);

  const sess = lega.sessioneAttiva;
  const { clockStr } = useTimer(sess, () => avanzaLivelloAuto(lega.id), () => recoveryTorneo(lega.id));

  if (!sess) return null;

  const subTab: 'orologio' | 'giocatori' | 'premi' =
    liveSubTab === 'giocatori' || liveSubTab === 'premi' ? liveSubTab : 'orologio';

  const meta = [
    sess.ora_inizio ? `Inizio ${sess.ora_inizio}` : '',
    sess.buy_in ? `Buy-in ${euro(sess.buy_in)}` : '',
    sess.fiche_iniziali ? `${sess.fiche_iniziali.toLocaleString('it-IT')} fiche` : '',
  ].filter(Boolean).join(' · ');

  const vivi = sess.giocatori.filter((g) => g.entrato && !g.eliminato).length;
  const totEntrati = sess.giocatori.filter((g) => g.entrato).length;
  const totGioc = sess.giocatori.length;

  function chiudi() {
    if (apriChiusuraTorneo(lega.id)) setSerataView('chiusura');
    else Alert.alert('Non posso chiudere', 'Imposta le posizioni finali dei giocatori (premi).');
  }

  function annulla() {
    Alert.alert('Annullare il torneo?', 'Il torneo in corso verrà annullato.', [
      { text: 'No', style: 'cancel' },
      { text: 'Annulla torneo', style: 'destructive', onPress: () => annullaSessione(lega.id) },
    ]);
  }

  const tab = (key: 'orologio' | 'giocatori' | 'premi', label: string, icon: ReactNode) => {
    const sel = subTab === key;
    return (
      <Pressable onPress={() => setLiveSubTab(key)} style={[styles.subtab, sel && { backgroundColor: t.surface }]}>
        {icon}
        <Text style={[styles.subtabText, { color: sel ? t.text : t.textMuted }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.fill}>
      <View style={[styles.summary, { borderBottomColor: t.border }]}>
        <View style={styles.sumRow}>
          <Text style={[styles.data, { color: t.text }]}>{fmtData(sess.data)}</Text>
          <View style={styles.mod}><IconTrophy size={14} color={t.accent} /><Text style={[styles.modText, { color: t.accent }]}>Torneo</Text></View>
        </View>
        <Text style={[styles.meta, { color: t.textMuted }]}>{meta || '—'}</Text>
      </View>

      <View style={[styles.subtabs, { backgroundColor: t.surface2 }]}>
        {tab('orologio', 'Orologio', <IconClock size={16} color={subTab === 'orologio' ? t.text : t.textMuted} />)}
        {tab('giocatori', `Player ${vivi}/${totEntrati || totGioc}`, <IconUsers size={16} color={subTab === 'giocatori' ? t.text : t.textMuted} />)}
        {tab('premi', 'Premi', <IconCoins size={16} color={subTab === 'premi' ? t.text : t.textMuted} />)}
      </View>

      <View style={styles.fill}>
        {subTab === 'orologio' && <SubOrologio lega={lega} sess={sess} clockStr={clockStr} />}
        {subTab === 'giocatori' && (
          <ScrollView contentContainerStyle={styles.ph}>
            <EmptyState icon={<GameIcon icona="picche" size={44} color={t.accent} />} title="Player" hint="Iscritti, rebuy/add-on, eliminazioni e revive arrivano in R1.5d2." />
          </ScrollView>
        )}
        {subTab === 'premi' && (
          <ScrollView contentContainerStyle={styles.ph}>
            <EmptyState icon={<IconCoins size={44} color={t.accent} />} title="Premi" hint="Montepremi e assegnazione premi arrivano in R1.5d3." />
          </ScrollView>
        )}
      </View>

      <View style={[styles.bottom, { borderTopColor: t.border, backgroundColor: t.bg }]}>
        <Button block onPress={chiudi}>Chiudi serata</Button>
        <Button variant="ghost" block onPress={annulla}>Annulla torneo</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  summary: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  sumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  data: { fontSize: 15, fontWeight: '700' },
  mod: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  modText: { fontSize: 13, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 4 },
  subtabs: { flexDirection: 'row', margin: 12, borderRadius: 10, padding: 3, gap: 3 },
  subtab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 8 },
  subtabText: { fontSize: 12, fontWeight: '600' },
  ph: { padding: 16 },
  bottom: { gap: 8, padding: 12, borderTopWidth: 1 },
});
