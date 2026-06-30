import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Sheet } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

/* Sheet per inserire/modificare un importo (€) — usato per le ricariche. */
interface Props {
  open: boolean;
  title: string;
  initial?: number;
  allowZeroDelete?: boolean;
  onClose: () => void;
  onConfirm: (v: number) => void;
}

export default function ImportoSheet({ open, title, initial, allowZeroDelete, onClose, onConfirm }: Props) {
  const t = useTheme();
  const [val, setVal] = useState('');

  useEffect(() => {
    if (open) setVal(initial != null ? String(initial) : '');
  }, [open, initial]);

  function salva() {
    const v = parseFloat(val.replace(',', '.'));
    if (isNaN(v) || v < 0) return;
    onConfirm(v);
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <TextInput
        style={[styles.input, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }]}
        keyboardType="decimal-pad"
        value={val}
        onChangeText={setVal}
        placeholder="0"
        placeholderTextColor={t.textMuted}
        autoFocus
      />
      {allowZeroDelete ? <Text style={[styles.hint, { color: t.textMuted }]}>Scrivi 0 per eliminare.</Text> : null}
      <View style={styles.actions}>
        <Button variant="ghost" onPress={onClose}>Annulla</Button>
        <Button onPress={salva}>Salva</Button>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 18, fontWeight: '700', minHeight: 48 },
  hint: { fontSize: 12, marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
});
