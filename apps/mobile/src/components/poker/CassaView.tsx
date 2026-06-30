import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { euro, type CashSettlementResult } from '@whos-the-boss/core';

import { IconCheck, IconChevronDown, IconChevronUp, IconWarning } from '@/components/icons';
import { Card } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Cassa (§6) — totale nel piatto vs dovuto + quadratura + breakdown. */
export default function CassaView({ legaId, cashResult }: { legaId: number; cashResult: CashSettlementResult }) {
  const t = useTheme();
  const lega = useStore((s) => s.db.leghe.find((l) => l.id === legaId));
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!lega) return null;
  const nomeDi = (id: number) => lega.nomi.find((n) => n.id === id)?.nome ?? '?';

  const { piatto, giocatori } = cashResult;
  const diff = Math.round((piatto.totaleVersato - piatto.totaleDovuto) * 100) / 100;
  const quadra = Math.abs(diff) <= 0.01;
  const sbilancioFiche = Math.abs(giocatori.reduce((a, g) => a + g.netto, 0));

  return (
    <Card>
      <Text style={[styles.title, { color: t.text }]}>Il Piatto (Cassa)</Text>

      <View style={styles.row}><Text style={[styles.lbl, { color: t.textMuted }]}>Totale nel piatto</Text><Text style={[styles.val, { color: t.text }]}>{euro(piatto.totaleVersato)}</Text></View>
      <View style={styles.row}><Text style={[styles.lbl, { color: t.textMuted }]}>Totale dovuto</Text><Text style={[styles.val, { color: t.text }]}>{euro(piatto.totaleDovuto)}</Text></View>

      <View style={[styles.quad, { backgroundColor: quadra ? t.okSoft : t.warnSoft }]}>
        {quadra ? <IconCheck size={13} color={t.ok} /> : <IconWarning size={13} color={t.warn} />}
        <Text style={[styles.quadText, { color: quadra ? t.ok : t.warn }]}>
          {quadra ? 'Cassa quadra' : diff > 0 ? `Eccedenza in cassa: +${euro(Math.abs(diff))}` : `Cassa scoperta: −${euro(Math.abs(diff))}`}
        </Text>
      </View>

      {sbilancioFiche > 0.01 && (
        <View style={[styles.quad, { backgroundColor: t.warnSoft }]}>
          <IconWarning size={13} color={t.warn} />
          <Text style={[styles.quadText, { color: t.warn }]}>Le fiche non quadrano (sbilancio {euro(sbilancioFiche)}) — contarle di nuovo</Text>
        </View>
      )}

      <Pressable onPress={() => setShowBreakdown((v) => !v)} style={styles.bdToggle}>
        {showBreakdown ? <IconChevronUp size={14} color={t.accent} /> : <IconChevronDown size={14} color={t.accent} />}
        <Text style={[styles.bdToggleText, { color: t.accent }]}>{showBreakdown ? 'Nascondi' : 'Di chi sono i soldi'}</Text>
      </Pressable>

      {showBreakdown && (
        <View style={styles.breakdown}>
          {piatto.breakdown.map((b) => (
            <View key={b.id_nome} style={styles.bdRow}>
              <Text style={[styles.bdName, { color: t.text }]}>{nomeDi(b.id_nome)}</Text>
              <Text style={[styles.bdVers, { color: t.textMuted }]}>
                versato {euro(b.versato)}{b.eccedenza > 0.005 ? ` (ecc. ${euro(b.eccedenza)} → restituita)` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  lbl: { fontSize: 14 },
  val: { fontSize: 15, fontWeight: '700' },
  quad: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginTop: 10 },
  quadText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  bdToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, marginTop: 8 },
  bdToggleText: { fontSize: 13, fontWeight: '600' },
  breakdown: { gap: 6, marginTop: 4 },
  bdRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  bdName: { fontSize: 13, fontWeight: '600' },
  bdVers: { fontSize: 12, flexShrink: 1, textAlign: 'right' },
});
