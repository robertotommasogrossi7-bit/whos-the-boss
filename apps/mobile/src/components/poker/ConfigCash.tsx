import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

/* Config cash — solo buy-in. */
export default function ConfigCash({ buyIn, onChange }: { buyIn: number; onChange: (v: number) => void }) {
  const t = useTheme();
  return (
    <View>
      <Text style={[styles.label, { color: t.textMuted }]}>Buy-in (€)</Text>
      <TextInput
        style={[styles.input, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }]}
        keyboardType="decimal-pad"
        value={buyIn ? String(buyIn) : ''}
        onChangeText={(v) => onChange(parseFloat(v.replace(',', '.')) || 0)}
      />
      <Text style={[styles.hint, { color: t.textMuted }]}>
        Considerato come "soldi versati" all'ingresso di ogni giocatore in partita.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
  hint: { fontSize: 12, marginTop: 8, lineHeight: 17 },
});
