import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  calcolaMontepremi, calcolaMontepremiIncassato, calcolaPremi, calcolaPremiPagati,
  euro, type Sessione,
} from '@whos-the-boss/core';

import { IconCoins } from '@/components/icons';
import { Card, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme/theme';

/* Sub-tab PREMI (torneo) — read-only: banner montepremi (consolidato o no) +
   stato cassa (incassato/pagato/da incassare) + struttura premi. */
function medalColor(i: number, t: Theme): string {
  return i === 0 ? t.warn : i === 1 ? t.textMuted : i === 2 ? '#CD7F32' : t.text;
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

export default function SubPremi({ sess }: { sess: Sessione }) {
  const t = useTheme();

  const monte = calcolaMontepremi(sess);
  const incassato = calcolaMontepremiIncassato(sess);
  const giaPagato = calcolaPremiPagati(sess);
  const residuo = Math.max(0, Math.round((monte - giaPagato) * 100) / 100);
  const nonPagato = Math.round((monte - incassato) * 100) / 100;
  const entrati = sess.giocatori.filter((g) => g.entrato).length;
  const premi = sess.premi_consolidati ? sess.premi : calcolaPremi(monte, entrati);

  const banner = (
    <View style={[styles.banner, { backgroundColor: t.surface, borderColor: sess.premi_consolidati ? t.warn : t.accent }]}>
      <Text style={[styles.bLbl, { color: t.textMuted }]}>{sess.premi_consolidati ? 'Montepremi consolidato' : 'Montepremi (include non pagati)'}</Text>
      <Text style={[styles.bVal, { color: t.accent }]}>{euro(monte)}</Text>
      <Text style={[styles.bSub, { color: t.textMuted }]}>{sess.premi_consolidati ? 'Late reg chiusa' : 'Si consolida a fine late reg · Chi non paga creerà un debito'}</Text>
    </View>
  );

  const poolBar = (
    <View style={styles.statsBar}>
      <Stat label="Incassato" value={euro(incassato)} color={t.ok} />
      <Stat label="Pagato a vinc." value={euro(giaPagato)} color={t.text} />
      <Stat label={nonPagato > 0.005 ? 'Da incassare' : 'Residuo monte'} value={euro(nonPagato > 0.005 ? nonPagato : residuo)} color={nonPagato > 0.005 ? t.danger : t.text} />
    </View>
  );

  if (!premi.length || !entrati) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        {banner}
        {poolBar}
        <EmptyState icon={<IconCoins size={46} color={t.accent} />} title="Premi" hint="Aggiungi giocatori entrati per vedere la struttura premi." />
      </ScrollView>
    );
  }

  const payoutNote = entrati <= 4 ? 'winner takes all' : entrati <= 9 ? 'top 2 paid' : entrati <= 15 ? 'top 3 paid' : entrati <= 27 ? 'top 4 paid' : 'top 6 paid';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {banner}
      {poolBar}

      <Card>
        <View style={[styles.prizeHead, { borderBottomColor: t.border }]}>
          <Text style={[styles.phPos, { color: t.textMuted }]}>#</Text>
          <Text style={[styles.phName, { color: t.textMuted }]}>Posizione</Text>
          <Text style={[styles.phNum, { color: t.textMuted }]}>%</Text>
          <Text style={[styles.phAmt, { color: t.textMuted }]}>Premio</Text>
        </View>
        {premi.map((p, i) => (
          <View key={p.posizione} style={styles.prizeRow}>
            <Text style={[styles.prPos, { color: medalColor(i, t) }]}>{i + 1}°</Text>
            <Text style={[styles.prName, { color: t.text }]}>{p.posizione}° posto</Text>
            <Text style={[styles.prPerc, { color: t.textMuted }]}>{p.percentuale}%</Text>
            <Text style={[styles.prAmt, { color: t.text }]}>{euro(p.importo)}</Text>
          </View>
        ))}
      </Card>

      <Text style={[styles.note, { color: t.textMuted }]}>Struttura standard per {entrati} iscritti: {payoutNote}.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  banner: { borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center', gap: 2 },
  bLbl: { fontSize: 12, fontWeight: '600' },
  bVal: { fontSize: 30, fontWeight: '800' },
  bSub: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  statsBar: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 11, textAlign: 'center' },
  statVal: { fontSize: 16, fontWeight: '700' },
  prizeHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8, marginBottom: 4, borderBottomWidth: 1 },
  prizeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  phPos: { width: 36, fontSize: 11, fontWeight: '700' },
  phName: { flex: 1, fontSize: 11, fontWeight: '700' },
  phNum: { width: 44, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  phAmt: { width: 70, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  prPos: { width: 36, fontSize: 15, fontWeight: '800' },
  prName: { flex: 1, fontSize: 14, fontWeight: '600' },
  prPerc: { width: 44, fontSize: 13, textAlign: 'right' },
  prAmt: { width: 70, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  note: { fontSize: 12, lineHeight: 17 },
});
