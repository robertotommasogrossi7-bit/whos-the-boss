import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { EsitoPartitaInput } from '@whos-the-boss/core';

import PickChip from '@/components/gioco/PickChip';
import { IconCheck } from '@/components/icons';
import { Button, Sheet } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

/* Sheet "Esito partita" (M3) — partecipanti (override), vincitori (multi),
   pareggio, nome libero. */
interface Props {
  partecipantiSessione: number[];
  nome: (id: number) => string;
  bloccati?: number[];
  onClose: () => void;
  onConfirm: (esito: EsitoPartitaInput) => void;
}

export default function SheetEsitoPartita({ partecipantiSessione, nome, bloccati = [], onClose, onConfirm }: Props) {
  const t = useTheme();
  const [parts, setParts] = useState<number[]>(partecipantiSessione);
  const [winners, setWinners] = useState<number[]>([]);
  const [pareggio, setPareggio] = useState(false);
  const [nomeLibero, setNomeLibero] = useState('');

  function togglePart(id: number) {
    if (bloccati.includes(id)) return;
    setParts((prev) => {
      const has = prev.includes(id);
      if (has) setWinners((w) => w.filter((x) => x !== id));
      return has ? prev.filter((x) => x !== id) : [...prev, id];
    });
  }

  function toggleWinner(id: number) {
    if (pareggio) return;
    setWinners((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function togglePareggio() {
    setPareggio((p) => {
      if (!p) setWinners([]);
      return !p;
    });
  }

  const puoSalvare = parts.length > 0 && (pareggio || winners.length > 0);

  function salva() {
    if (!puoSalvare) return;
    onConfirm({
      vincitori: pareggio ? [] : winners,
      pareggio,
      partecipanti: parts,
      nomeLibero: nomeLibero.trim() || undefined,
    });
  }

  return (
    <Sheet open onClose={onClose} title="Esito partita">
      <Text style={[styles.label, { color: t.textMuted }]}>Chi ha giocato</Text>
      <View style={styles.grid}>
        {partecipantiSessione.map((id) => (
          <PickChip key={id} label={nome(id)} selected={parts.includes(id)} locked={bloccati.includes(id)} onPress={() => togglePart(id)} />
        ))}
      </View>

      <Text style={[styles.label, { color: t.textMuted, marginTop: 16 }]}>Vincitori</Text>
      {pareggio ? (
        <Text style={[styles.hint, { color: t.textMuted }]}>Pareggio: nessun vincitore.</Text>
      ) : parts.length === 0 ? (
        <Text style={[styles.hint, { color: t.textMuted }]}>Seleziona prima chi ha giocato.</Text>
      ) : (
        <View style={styles.grid}>
          {parts.map((id) => (
            <PickChip key={id} label={nome(id)} selected={winners.includes(id)} win onPress={() => toggleWinner(id)} />
          ))}
        </View>
      )}

      <Pressable onPress={togglePareggio} style={styles.toggle}>
        <View style={[styles.box, { borderColor: pareggio ? t.accent : t.border, backgroundColor: pareggio ? t.accent : 'transparent' }]}>
          {pareggio ? <IconCheck size={14} color={t.accentInk} /> : null}
        </View>
        <Text style={[styles.toggleText, { color: t.text }]}>Pareggio</Text>
      </Pressable>

      <Text style={[styles.label, { color: t.textMuted, marginTop: 16 }]}>Nome libero (opzionale)</Text>
      <TextInput
        style={[styles.input, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }]}
        placeholder="es. una partita di un altro gioco"
        placeholderTextColor={t.textMuted}
        maxLength={40}
        value={nomeLibero}
        onChangeText={setNomeLibero}
      />

      <View style={styles.actions}>
        <Button variant="ghost" onPress={onClose}>Annulla</Button>
        <Button onPress={salva} disabled={!puoSalvare}>Salva esito</Button>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  hint: { fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 15, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
});
