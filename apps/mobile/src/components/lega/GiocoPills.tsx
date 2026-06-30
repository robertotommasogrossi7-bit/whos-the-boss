import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { GameIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeContext';

/* Selettore-gioco a pillole (riusato da Classifica/Storico di lega). */
export interface OpzioneGioco {
  id: string;
  nome: string;
  icona?: string | null;
}

interface Props {
  opzioni: OpzioneGioco[];
  attivo: string;
  onSel: (id: string) => void;
}

export default function GiocoPills({ opzioni, attivo, onSel }: Props) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {opzioni.map((o) => {
        const sel = o.id === attivo;
        return (
          <Pressable
            key={o.id || 'tutti'}
            onPress={() => onSel(o.id)}
            style={[styles.pill, { borderColor: sel ? t.accent : t.border, backgroundColor: sel ? t.accentSoft : 'transparent' }]}
          >
            {o.icona ? <GameIcon icona={o.icona} size={16} color={sel ? t.accent : t.text} /> : null}
            <Text style={[styles.text, { color: sel ? t.accent : t.text }]}>{o.nome}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  text: { fontSize: 13, fontWeight: '600' },
});
