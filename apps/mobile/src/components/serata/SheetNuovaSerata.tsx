import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { idBloccatiInclusi, normalizzaNome, oggi, type Lega } from '@whos-the-boss/core';

import PickChip from '@/components/gioco/PickChip';
import { IconPlus } from '@/components/icons';
import { Button, DateField, Sheet } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Nuova serata multi-gioco (R4). Bottom sheet = fork breve (NN/g: le sheet per
   interruzioni, non per il flusso principale). Crea la serata e apre l'hub, che
   è una schermata a sé (il "posto dove si torna"). Azione primaria in basso. */
interface Props {
  lega: Lega;
  onClose: () => void;
}

export default function SheetNuovaSerata({ lega, onClose }: Props) {
  const t = useTheme();
  const creaSerata = useStore((s) => s.creaSerata);
  const aggiungiGiocatore = useStore((s) => s.aggiungiGiocatore);
  const utente = useStore((s) => s.utente);

  const [selected, setSelected] = useState<number[]>(lega.nomi.map((n) => n.id));
  const [newName, setNewName] = useState('');
  const [data, setData] = useState(oggi());

  const bloccati = idBloccatiInclusi(lega, utente?.username);

  function toggle(id: number) {
    if (bloccati.includes(id)) return;
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function aggiungiGuest() {
    const n = newName.trim();
    if (!n) return;
    const err = aggiungiGiocatore(lega.id, n);
    if (err) { Alert.alert('Attenzione', err); return; }
    const fresh = useStore.getState().db.leghe.find((l) => l.id === lega.id);
    const nuovo = fresh?.nomi.find((x) => normalizzaNome(x.nome) === normalizzaNome(n));
    if (nuovo) setSelected((p) => (p.includes(nuovo.id) ? p : [...p, nuovo.id]));
    setNewName('');
  }

  function crea() {
    if (selected.length === 0) { Alert.alert('Attenzione', 'Scegli almeno un partecipante'); return; }
    const id = creaSerata(lega.id, selected, data);
    if (id == null) return;
    onClose();
    router.push({ pathname: '/serata/[legaId]/[serataId]', params: { legaId: String(lega.id), serataId: String(id) } });
  }

  return (
    <Sheet open onClose={onClose} title="Nuova serata">
      <Text style={[styles.label, { color: t.textMuted }]}>Chi c&apos;è stasera</Text>
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

      <Button block onPress={crea} disabled={selected.length === 0} style={{ marginTop: 16 }}>Crea serata</Button>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  hint: { fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
});
