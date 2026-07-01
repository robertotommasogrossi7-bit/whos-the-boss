import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { idBloccatiInclusi, normalizzaNome, nowHHMM, oggi, type Lega } from '@whos-the-boss/core';

import PickChip from '@/components/gioco/PickChip';
import { IconPlus } from '@/components/icons';
import { Button, DateField, Sheet } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Sheet "Nuova sessione" (M3) — scelta partecipanti (dai nomi della lega,
   aggiungibili al volo) e avvio. Data = oggi (la programmazione futura, col
   date picker, arriva dopo). */
interface Props {
  lega: Lega;
  giocoId: string;
  onClose: () => void;
  onCreated: (sessId: number) => void;
}

export default function SheetNuovaSessione({ lega, giocoId, onClose, onCreated }: Props) {
  const t = useTheme();
  const creaSessioneGioco = useStore((s) => s.creaSessioneGioco);
  const avviaSessioneGioco = useStore((s) => s.avviaSessioneGioco);
  const aggiungiGiocatore = useStore((s) => s.aggiungiGiocatore);
  const utente = useStore((s) => s.utente);

  const [selected, setSelected] = useState<number[]>(lega.nomi.map((n) => n.id));
  const [newName, setNewName] = useState('');
  const [data, setData] = useState(oggi());

  const bloccati = idBloccatiInclusi(lega, utente?.username);

  function toggle(id: number) {
    if (bloccati.includes(id)) return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function aggiungiGuest() {
    const n = newName.trim();
    if (!n) return;
    const err = aggiungiGiocatore(lega.id, n);
    if (err) { Alert.alert('Attenzione', err); return; }
    const fresh = useStore.getState().db.leghe.find((l) => l.id === lega.id);
    const nuovo = fresh?.nomi.find((x) => normalizzaNome(x.nome) === normalizzaNome(n));
    if (nuovo) setSelected((prev) => (prev.includes(nuovo.id) ? prev : [...prev, nuovo.id]));
    setNewName('');
  }

  function submit() {
    if (selected.length === 0) { Alert.alert('Attenzione', 'Scegli almeno un partecipante'); return; }
    const id = creaSessioneGioco(lega.id, giocoId, selected, data, nowHHMM());
    if (id == null) return;
    avviaSessioneGioco(lega.id, id);
    onCreated(id);
  }

  return (
    <Sheet open onClose={onClose} title="Nuova sessione">
      <Text style={[styles.label, { color: t.textMuted }]}>Partecipanti</Text>
      {lega.nomi.length === 0 ? (
        <Text style={[styles.hint, { color: t.textMuted }]}>Aggiungi i giocatori qui sotto.</Text>
      ) : (
        <View style={styles.grid}>
          {lega.nomi.map((n) => (
            <PickChip key={n.id} label={n.nome} selected={selected.includes(n.id)} locked={bloccati.includes(n.id)} onPress={() => toggle(n.id)} />
          ))}
        </View>
      )}

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }]}
          placeholder={lega.personale ? 'Aggiungi un amico' : 'Aggiungi giocatore'}
          placeholderTextColor={t.textMuted}
          maxLength={25}
          autoCapitalize="words"
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={aggiungiGuest}
        />
        <Button size="sm" onPress={aggiungiGuest}><IconPlus size={18} color={t.accentInk} /></Button>
      </View>

      <View style={{ marginTop: 14 }}>
        <DateField label="Data" value={data} onChange={setData} />
      </View>

      <View style={styles.actions}>
        <Button variant="ghost" onPress={onClose}>Annulla</Button>
        <Button onPress={submit} disabled={selected.length === 0}>Avvia sessione</Button>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  hint: { fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
});
