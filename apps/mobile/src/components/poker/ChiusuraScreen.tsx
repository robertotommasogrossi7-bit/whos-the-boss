import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { IconChevronLeft } from '@/components/icons';
import CassaView from '@/components/poker/CassaView';
import ChiusuraCash from '@/components/poker/ChiusuraCash';
import ChiusuraTorneo from '@/components/poker/ChiusuraTorneo';
import { Button } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

function nowHHMM() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

/* Chiusura (dispatcher) — ora fine + cassa + "chi paga chi" + conferma.
   Torneo: placeholder (R1.5d). Conferma => salva la serata (genera i debiti). */
export default function ChiusuraScreen() {
  const t = useTheme();
  const settlement = useStore((s) => s.settlement);
  const setSettlement = useStore((s) => s.setSettlement);
  const setSerataView = useStore((s) => s.setSerataView);
  const confermaChiusura = useStore((s) => s.confermaChiusura);
  const [oraFine, setOraFine] = useState(nowHHMM);

  if (!settlement) return null;
  const legaId = settlement.legaId;
  const trasferimenti = settlement.trasferimentiOverride ?? settlement.cashResult?.trasferimenti ?? [];

  function back() {
    setSettlement(null);
    setSerataView('live');
  }
  function conferma() {
    confermaChiusura(legaId, oraFine);
    setSerataView('hub');
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={back} style={styles.back}>
        <IconChevronLeft size={18} color={t.textMuted} />
        <Text style={[styles.backText, { color: t.textMuted }]}>Torna alla partita</Text>
      </Pressable>

      <Text style={[styles.h, { color: t.text }]}>{settlement.isTorneo ? 'Chiusura torneo' : 'Chiusura cash game'}</Text>

      <View>
        <Text style={[styles.label, { color: t.textMuted }]}>Ora fine</Text>
        <TextInput
          style={[styles.input, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }]}
          value={oraFine}
          onChangeText={setOraFine}
          placeholder="--:--"
          placeholderTextColor={t.textMuted}
        />
      </View>

      {settlement.isTorneo ? (
        <ChiusuraTorneo legaId={legaId} />
      ) : settlement.cashResult ? (
        <>
          <CassaView legaId={legaId} cashResult={settlement.cashResult} />
          <ChiusuraCash legaId={legaId} cashResult={settlement.cashResult} trasferimenti={trasferimenti} />
        </>
      ) : null}

      <Button block onPress={conferma}>Conferma e salva serata</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { fontSize: 14, fontWeight: '600' },
  h: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
});
