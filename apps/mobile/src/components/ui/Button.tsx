import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

/* Button — varianti primary/ghost/danger (DESIGN_SPEC §3). Port nativo del
   .ui-btn web: stessi colori (token), touch >=44px, feedback su press. */
type Variant = 'primary' | 'ghost' | 'danger';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  block?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function Button({
  children, onPress, variant = 'primary', size = 'md', block = false, disabled = false, style,
}: Props) {
  const t = useTheme();

  const bg = variant === 'primary' ? t.accent : variant === 'danger' ? t.danger : 'transparent';
  const fg = variant === 'primary' ? t.accentInk : variant === 'danger' ? '#FFFFFF' : t.accent;
  const borderColor = variant === 'ghost' ? t.accent : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        block ? styles.block : styles.inline,
        { backgroundColor: bg, borderColor, borderRadius: t.radiusSm },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {typeof children === 'string'
        ? <Text style={[size === 'sm' ? styles.labelSm : styles.label, { color: fg }]}>{children}</Text>
        : children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  md: { minHeight: 44, paddingVertical: 11, paddingHorizontal: 18, gap: 8 },
  sm: { minHeight: 36, paddingVertical: 7, paddingHorizontal: 13, gap: 6 },
  inline: { alignSelf: 'flex-start' },
  block: { alignSelf: 'stretch' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.5 },
  label: { fontSize: 15, fontWeight: '700' },
  labelSm: { fontSize: 13, fontWeight: '700' },
});
