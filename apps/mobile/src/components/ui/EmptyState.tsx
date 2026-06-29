import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

/* EmptyState — icona + testo quando una lista e' vuota (mai schermo bianco). */
interface Props {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, hint, action }: Props) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      {icon != null && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
      {hint != null && <Text style={[styles.hint, { color: t.textMuted }]}>{hint}</Text>}
      {action != null && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12, paddingVertical: 44, paddingHorizontal: 22 },
  icon: { opacity: 0.85 },
  title: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 280 },
  action: { marginTop: 4 },
});
