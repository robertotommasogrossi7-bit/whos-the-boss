import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { euro, fmtData, type Lega } from '@whos-the-boss/core';

import { GameIcon, IconCoins, IconUsers } from '@/components/icons';
import SubAttivi from '@/components/poker/SubAttivi';
import SubGiocatoriCash from '@/components/poker/SubGiocatoriCash';
import TavoloView from '@/components/poker/TavoloView';
import { Button } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Live cash — shell: sommario + sub-tab (Giocatori / Attivi) + chiudi/annulla. */
export default function LiveCash({ lega }: { lega: Lega }) {
  const t = useTheme();
  const liveSubTab = useStore((s) => s.liveSubTab);
  const setLiveSubTab = useStore((s) => s.setLiveSubTab);
  const annullaSessione = useStore((s) => s.annullaSessione);
  const apriChiusura = useStore((s) => s.apriChiusura);
  const setSerataView = useStore((s) => s.setSerataView);

  const sess = lega.sessioneAttiva;
  if (!sess) return null;

  const meta = [
    sess.ora_inizio ? `Inizio ${sess.ora_inizio}` : '',
    sess.ora_fine ? `Fine ${sess.ora_fine}` : '',
    sess.buy_in ? `Buy-in ${euro(sess.buy_in)}` : '',
  ].filter(Boolean).join(' · ');
  const tot = sess.giocatori.length;
  const attivi = sess.giocatori.filter((g) => g.entrato).length;
  const subTab = liveSubTab === 'attivi' ? 'attivi' : liveSubTab === 'giocatori' ? 'giocatori' : 'tavolo';

  function chiudi() {
    if (apriChiusura(lega.id)) setSerataView('chiusura');
    else Alert.alert('Non posso chiudere', 'Controlla che i giocatori attivi abbiano le fiches finali impostate.');
  }

  function annulla() {
    Alert.alert('Annullare la serata?', 'La serata in corso verrà annullata.', [
      { text: 'No', style: 'cancel' },
      { text: 'Annulla serata', style: 'destructive', onPress: () => annullaSessione(lega.id) },
    ]);
  }

  return (
    <View style={styles.fill}>
      <View style={[styles.summary, { borderBottomColor: t.border }]}>
        <View style={styles.sumRow}>
          <Text style={[styles.data, { color: t.text }]}>{fmtData(sess.data)}</Text>
          <View style={styles.mod}>
            <IconCoins size={14} color={t.accent} />
            <Text style={[styles.modText, { color: t.accent }]}>Cash Game</Text>
          </View>
        </View>
        <Text style={[styles.meta, { color: t.textMuted }]}>{meta || '—'}</Text>
      </View>

      <View style={[styles.subtabs, { backgroundColor: t.surface2 }]}>
        <Pressable onPress={() => setLiveSubTab('tavolo')} style={[styles.subtab, subTab === 'tavolo' && { backgroundColor: t.surface }]}>
          <IconCoins size={16} color={subTab === 'tavolo' ? t.accent : t.textMuted} />
          <Text style={[styles.subtabText, { color: subTab === 'tavolo' ? t.text : t.textMuted }]}>Tavolo · {attivi}</Text>
        </Pressable>
        <Pressable onPress={() => setLiveSubTab('giocatori')} style={[styles.subtab, subTab === 'giocatori' && { backgroundColor: t.surface }]}>
          <IconUsers size={16} color={subTab === 'giocatori' ? t.text : t.textMuted} />
          <Text style={[styles.subtabText, { color: subTab === 'giocatori' ? t.text : t.textMuted }]}>Giocatori · {tot}</Text>
        </Pressable>
        <Pressable onPress={() => setLiveSubTab('attivi')} style={[styles.subtab, subTab === 'attivi' && { backgroundColor: t.surface }]}>
          <GameIcon icona="picche" size={16} color={subTab === 'attivi' ? t.accent : t.textMuted} />
          <Text style={[styles.subtabText, { color: subTab === 'attivi' ? t.text : t.textMuted }]}>Conto · {attivi}</Text>
        </Pressable>
      </View>

      <View style={styles.fill}>
        {subTab === 'tavolo' ? <TavoloView lega={lega} sess={sess} />
          : subTab === 'giocatori' ? <SubGiocatoriCash lega={lega} sess={sess} />
          : <SubAttivi lega={lega} sess={sess} />}
      </View>

      <View style={[styles.bottom, { borderTopColor: t.border, backgroundColor: t.bg }]}>
        <Button block onPress={chiudi}>Chiudi serata</Button>
        <Button variant="ghost" block onPress={annulla}>Annulla serata</Button>
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
  subtabText: { fontSize: 13, fontWeight: '600' },
  bottom: { gap: 8, padding: 12, borderTopWidth: 1 },
});
