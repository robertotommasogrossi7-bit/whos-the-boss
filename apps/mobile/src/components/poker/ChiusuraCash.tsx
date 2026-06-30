import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { euro, euroSigned, type CashSettlementResult, type Trasferimento } from '@whos-the-boss/core';

import { IconCheck, IconClose, IconWarning } from '@/components/icons';
import MoneyInput from '@/components/poker/MoneyInput';
import { Button } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* "Chi dà contanti a chi" (§7-10) — lista trasferimenti modificabile
   (edit/aggiungi/elimina) + verifica bilanciamento per giocatore. */
interface Props {
  legaId: number;
  cashResult: CashSettlementResult;
  trasferimenti: Trasferimento[];
}

function SelChip({ label, sel, onPress }: { label: string; sel: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.selChip, { borderColor: sel ? t.accent : t.border, backgroundColor: sel ? t.accentSoft : 'transparent' }]}>
      <Text style={{ color: sel ? t.accent : t.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export default function ChiusuraCash({ legaId, cashResult, trasferimenti }: Props) {
  const t = useTheme();
  const lega = useStore((s) => s.db.leghe.find((l) => l.id === legaId));
  const setTrasferimento = useStore((s) => s.setTrasferimento);
  const addTrasferimento = useStore((s) => s.addTrasferimento);
  const removeTrasferimento = useStore((s) => s.removeTrasferimento);

  const [showAdd, setShowAdd] = useState(false);
  const [addFrom, setAddFrom] = useState<number | null>(null);
  const [addTo, setAddTo] = useState<number | null>(null);
  const [addAmt, setAddAmt] = useState(0);

  if (!lega) return null;
  const nomeDi = (id: number) => lega.nomi.find((n) => n.id === id)?.nome ?? '?';
  const { giocatori } = cashResult;
  const entrati = giocatori.map((g) => ({ id: g.id_nome, nome: nomeDi(g.id_nome) }));

  function delta(idNome: number): number {
    const g = giocatori.find((x) => x.id_nome === idNome)!;
    const paga = trasferimenti.filter((tr) => tr.from === idNome).reduce((a, tr) => a + tr.importo, 0);
    const rice = trasferimenti.filter((tr) => tr.to === idNome).reduce((a, tr) => a + tr.importo, 0);
    const expected = g.mancanteP > 0.005 ? -g.mancanteP : g.bisogno;
    const actual = rice - paga;
    return Math.round((actual - expected) * 100) / 100;
  }

  function handleAdd() {
    if (addFrom == null || addTo == null || addFrom === addTo || addAmt <= 0) return;
    addTrasferimento(legaId, { from: addFrom, to: addTo, importo: Math.round(addAmt * 100) / 100 });
    setAddFrom(null); setAddTo(null); setAddAmt(0); setShowAdd(false);
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: t.text }]}>Chi dà contanti a chi</Text>

      {trasferimenti.length === 0 ? (
        <View style={[styles.noTransfer, { backgroundColor: t.okSoft }]}>
          <IconCheck size={24} color={t.ok} />
          <Text style={[styles.noTransferText, { color: t.ok }]}>Nessun contante da scambiare — il piatto si bilancia da solo.</Text>
        </View>
      ) : (
        trasferimenti.map((tr, idx) => (
          <View key={idx} style={[styles.trasf, { borderColor: t.border }]}>
            <Text style={[styles.trName, { color: t.text }]} numberOfLines={1}>{nomeDi(tr.from)}</Text>
            <Text style={[styles.trArrow, { color: t.textMuted }]}>→</Text>
            <Text style={[styles.trName, { color: t.text }]} numberOfLines={1}>{nomeDi(tr.to)}</Text>
            <MoneyInput value={tr.importo} onChange={(v) => setTrasferimento(legaId, idx, v)} style={styles.trInput} />
            <Pressable onPress={() => removeTrasferimento(legaId, idx)} hitSlop={6}><IconClose size={16} color={t.textMuted} /></Pressable>
          </View>
        ))
      )}

      {!showAdd ? (
        <Button variant="ghost" size="sm" onPress={() => setShowAdd(true)}>+ Aggiungi trasferimento</Button>
      ) : (
        <View style={[styles.addForm, { borderColor: t.border }]}>
          <Text style={[styles.addLabel, { color: t.textMuted }]}>Da</Text>
          <View style={styles.chips}>{entrati.map((g) => <SelChip key={g.id} label={g.nome} sel={addFrom === g.id} onPress={() => setAddFrom(g.id)} />)}</View>
          <Text style={[styles.addLabel, { color: t.textMuted }]}>A</Text>
          <View style={styles.chips}>{entrati.map((g) => <SelChip key={g.id} label={g.nome} sel={addTo === g.id} onPress={() => setAddTo(g.id)} />)}</View>
          <Text style={[styles.addLabel, { color: t.textMuted }]}>Importo (€)</Text>
          <MoneyInput value={addAmt} onChange={setAddAmt} />
          <View style={styles.addActions}>
            <Button variant="ghost" size="sm" onPress={() => setShowAdd(false)}>Annulla</Button>
            <Button size="sm" onPress={handleAdd}>OK</Button>
          </View>
        </View>
      )}

      <Text style={[styles.title, { color: t.text, marginTop: 16 }]}>Verifica bilanciamento</Text>
      {giocatori.map((g) => {
        const d = delta(g.id_nome);
        const ok = Math.abs(d) <= 0.01;
        return (
          <View key={g.id_nome} style={styles.balRow}>
            <Text style={[styles.balName, { color: t.text }]}>{nomeDi(g.id_nome)}</Text>
            <Text style={[styles.balNetto, { color: t.textMuted }]}>netto {euroSigned(g.netto)}</Text>
            {ok ? (
              <IconCheck size={14} color={t.ok} />
            ) : (
              <View style={styles.balWarn}>
                <IconWarning size={13} color={t.warn} />
                <Text style={[styles.balWarnText, { color: t.warn }]}>{d > 0 ? '+' : ''}{euro(Math.abs(d))}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  title: { fontSize: 14, fontWeight: '800' },
  noTransfer: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 12 },
  noTransferText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  trasf: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  trName: { fontSize: 14, fontWeight: '600', maxWidth: 90 },
  trArrow: { fontSize: 14 },
  trInput: { flex: 1, minHeight: 38, paddingVertical: 6 },
  addForm: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
  addLabel: { fontSize: 12, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  selChip: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  balRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  balName: { fontSize: 14, fontWeight: '600', flex: 1 },
  balNetto: { fontSize: 12 },
  balWarn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balWarnText: { fontSize: 12, fontWeight: '600' },
});
