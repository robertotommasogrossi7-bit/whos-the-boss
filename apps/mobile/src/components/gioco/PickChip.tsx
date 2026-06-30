import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

/* Chip selezionabile per i picker (partecipanti / vincitori). */
interface Props {
  label: string;
  selected: boolean;
  locked?: boolean;
  win?: boolean;
  onPress: () => void;
}

export default function PickChip({ label, selected, locked, win, onPress }: Props) {
  const t = useTheme();
  const bg = selected ? (win ? t.okSoft : t.accentSoft) : 'transparent';
  const border = selected ? (win ? t.ok : t.accent) : t.border;
  const color = selected ? (win ? t.ok : t.accent) : t.text;
  return (
    <Pressable disabled={locked} onPress={onPress} style={[styles.chip, { backgroundColor: bg, borderColor: border }, locked && styles.locked]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  locked: { opacity: 0.5 },
  text: { fontSize: 14, fontWeight: '600' },
});
