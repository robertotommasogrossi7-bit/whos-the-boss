import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

/* Chip / Tag — pill piccola, sfondo tenue + testo colorato (DESIGN_SPEC §3). */
type Tone = 'accent' | 'ok' | 'warn' | 'danger' | 'muted';

interface Props {
  children: ReactNode;
  tone?: Tone;
}

export default function Chip({ children, tone = 'accent' }: Props) {
  const t = useTheme();
  const palette: Record<Tone, { bg: string; fg: string }> = {
    accent: { bg: t.accentSoft, fg: t.accent },
    ok: { bg: t.okSoft, fg: t.ok },
    warn: { bg: t.warnSoft, fg: t.warn },
    danger: { bg: t.dangerSoft, fg: t.danger },
    muted: { bg: t.surface2, fg: t.textMuted },
  };
  const c = palette[tone];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      {typeof children === 'string'
        ? <Text style={[styles.text, { color: c.fg }]}>{children}</Text>
        : children}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 4, paddingHorizontal: 11, borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '700' },
});
