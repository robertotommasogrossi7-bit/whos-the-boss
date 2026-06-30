import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { IconClose } from '@/components/icons';
import { useTheme } from '@/theme/ThemeContext';

/* Box ricerca per nome (#4.7a) — input controllato riusabile in classifica/storico.
   Lo stato `value` vive nel contenitore (effimero, non nello store). */
interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function FiltroNome({ value, onChange, placeholder = 'Cerca giocatore…' }: Props) {
  const t = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: t.surface2, borderColor: t.border }]}>
      <TextInput
        style={[styles.input, { color: t.text }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.textMuted}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChange('')} hitSlop={8} style={styles.clear}>
          <IconClose size={16} color={t.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
  input: { flex: 1, fontSize: 15, paddingVertical: 8 },
  clear: { padding: 4 },
});
