import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

/* Input numerico/€ controllato ma con stato-stringa locale: cosi' digitare
   "12." o "12,5" non viene "corretto" a ogni tasto (bug dell'input controllato
   parsato). Sincronizza se il valore esterno (store) cambia. */
interface Props {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
}

export default function MoneyInput({ value, onChange, placeholder = '0', style }: Props) {
  const t = useTheme();
  const [text, setText] = useState(value ? String(value) : '');

  useEffect(() => {
    const parsed = parseFloat(text.replace(',', '.')) || 0;
    if (parsed !== value) setText(value ? String(value) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextInput
      style={[styles.input, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }, style]}
      keyboardType="decimal-pad"
      value={text}
      placeholder={placeholder}
      placeholderTextColor={t.textMuted}
      onChangeText={(s) => { setText(s); onChange(parseFloat(s.replace(',', '.')) || 0); }}
    />
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
});
