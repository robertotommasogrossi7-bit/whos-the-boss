import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

/* Avatar — cerchio con foto o iniziale del nome (DESIGN_SPEC §3). */
interface Props {
  nome?: string;
  foto?: string;
  size?: 'sm' | 'md' | 'lg';
}

const DIM = { sm: 32, md: 40, lg: 56 } as const;
const FONT = { sm: 13, md: 16, lg: 22 } as const;

export default function Avatar({ nome = '', foto, size = 'md' }: Props) {
  const t = useTheme();
  const d = DIM[size];
  const iniziale = nome.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.base, { width: d, height: d, borderRadius: d / 2, backgroundColor: t.accentSoft }]}>
      {foto
        ? <Image source={{ uri: foto }} style={{ width: d, height: d }} resizeMode="cover" />
        : <Text style={{ color: t.accent, fontSize: FONT[size], fontWeight: '800' }}>{iniziale}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
