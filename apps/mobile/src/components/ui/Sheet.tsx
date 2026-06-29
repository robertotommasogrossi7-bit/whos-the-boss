import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

/* Sheet / Modal dal basso (DESIGN_SPEC §3). Port nativo: Modal trasparente
   con slide-up; tap fuori dal pannello -> onClose. */
interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}

export default function Sheet({ open, onClose, title, children }: Props) {
  const t = useTheme();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
          {title != null && (typeof title === 'string'
            ? <Text style={[styles.title, { color: t.text }]}>{title}</Text>
            : title)}
          <ScrollView>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    maxHeight: '85%', borderWidth: 1,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24,
  },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
});
