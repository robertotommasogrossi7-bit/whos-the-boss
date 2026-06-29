import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

/* Schermata segnaposto per lo scheletro di navigazione (R1.1).
   Verra' sostituita dalle schermate reali in R1.4+. */
export default function Placeholder({ title, hint }: { title: string; hint?: string }) {
  const t = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <View style={styles.center}>
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        <Text style={[styles.hint, { color: t.textMuted }]}>
          {hint ?? 'schermata in arrivo (R1)'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 24 },
  title: { fontSize: 22, fontWeight: '700' },
  hint: { fontSize: 14 },
});
