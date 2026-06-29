import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

/* ListRow — riga elenco (left + titolo/sottotitolo + valore a destra).
   Con onPress diventa premibile (touch >=44px). DESIGN_SPEC §3. */
interface Props {
  left?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
}

export default function ListRow({ left, title, subtitle, right, onPress }: Props) {
  const t = useTheme();

  const inner = (
    <>
      {left}
      <View style={styles.body}>
        {typeof title === 'string'
          ? <Text numberOfLines={1} style={[styles.title, { color: t.text }]}>{title}</Text>
          : title}
        {subtitle != null && (typeof subtitle === 'string'
          ? <Text numberOfLines={1} style={[styles.sub, { color: t.textMuted }]}>{subtitle}</Text>
          : subtitle)}
      </View>
      {right != null && (typeof right === 'string' || typeof right === 'number'
        ? <Text style={[styles.right, { color: t.text }]}>{right}</Text>
        : right)}
    </>
  );

  const base = [styles.row, { backgroundColor: t.surface, borderColor: t.border, borderRadius: t.radiusSm }];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && styles.pressed]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={base}>{inner}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    minHeight: 44, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1,
  },
  pressed: { transform: [{ scale: 0.99 }] },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  right: { fontWeight: '700' },
});
