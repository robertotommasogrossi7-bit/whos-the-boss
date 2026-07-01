import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { fmtData } from '@whos-the-boss/core';

import { IconCalendar } from '@/components/icons';
import { useTheme } from '@/theme/ThemeContext';

/* DateField — campo data nativo. Mostra la data formattata (gg/mm/aaaa); al tap
   apre il picker nativo (dialog su Android, inline su iOS). Lavora con le stringhe
   'YYYY-MM-DD' usate dallo store (stesso formato di `oggi()`/`fmtData`). */
interface Props {
  value: string;                    // 'YYYY-MM-DD'
  onChange: (ymd: string) => void;
  label?: string;
}

function toYMD(d: Date): string {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}
function fromYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
}

export default function DateField({ value, onChange, label }: Props) {
  const t = useTheme();
  const [show, setShow] = useState(false);

  function handle(event: DateTimePickerEvent, selected?: Date) {
    setShow(false);
    if (event.type === 'set' && selected) onChange(toYMD(selected));
  }

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: t.textMuted }]}>{label}</Text> : null}
      <Pressable
        onPress={() => setShow(true)}
        style={[styles.field, { backgroundColor: t.surface2, borderColor: t.border }]}
      >
        <IconCalendar size={18} color={t.textMuted} />
        <Text style={[styles.value, { color: value ? t.text : t.textMuted }]}>
          {value ? fmtData(value) : 'Scegli data'}
        </Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={value ? fromYMD(value) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handle}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, minHeight: 44 },
  value: { fontSize: 15, fontWeight: '600' },
});
