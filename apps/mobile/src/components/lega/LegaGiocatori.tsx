import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { èSeiTuRecord, type Lega } from '@whos-the-boss/core';

import { IconCheck, IconClose, IconEdit, IconTrash, IconUser } from '@/components/icons';
import { Button, Card, EmptyState } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* GIOCATORI della lega (port di TabPartecipanti) — aggiungi/rinomina(soprannome)/
   elimina. Errori via Alert nativo (sul mobile non c'e' ancora il toast globale). */
export default function LegaGiocatori({ lega }: { lega: Lega }) {
  const t = useTheme();
  const utente = useStore((s) => s.utente);
  const aggiungiGiocatore = useStore((s) => s.aggiungiGiocatore);
  const eliminaGiocatore = useStore((s) => s.eliminaGiocatore);
  const rinominaGiocatore = useStore((s) => s.rinominaGiocatore);

  const [nuovoNome, setNuovoNome] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');

  const nPartite = (idNome: number) =>
    lega.partite.filter((p) => p.giocatori.some((g) => g.id_nome === idNome)).length;

  function aggiungi() {
    const err = aggiungiGiocatore(lega.id, nuovoNome);
    if (err) { Alert.alert('Attenzione', err); return; }
    setNuovoNome('');
  }

  function elimina(idNome: number, nome: string) {
    Alert.alert(`Eliminare ${nome}?`, undefined, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: () => { const err = eliminaGiocatore(lega.id, idNome); if (err) Alert.alert('Attenzione', err); },
      },
    ]);
  }

  function confermaEdit(idNome: number) {
    const err = rinominaGiocatore(lega.id, idNome, editVal);
    if (err) { Alert.alert('Attenzione', err); return; }
    setEditId(null);
    setEditVal('');
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={[styles.cardTitle, { color: t.text }]}>Aggiungi partecipante</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }]}
            placeholder="Nome partecipante"
            placeholderTextColor={t.textMuted}
            maxLength={25}
            autoCapitalize="words"
            value={nuovoNome}
            onChangeText={setNuovoNome}
            onSubmitEditing={aggiungi}
          />
          <Button size="sm" onPress={aggiungi}>+</Button>
        </View>
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: t.text }]}>{lega.nomi.length} partecipanti</Text>
        {lega.nomi.length === 0 ? (
          <EmptyState icon={<IconUser size={46} color={t.textMuted} />} title="Nessun partecipante" hint="Aggiungine uno!" />
        ) : (
          lega.nomi.map((nm) => {
            const np = nPartite(nm.id);
            const seiTu = èSeiTuRecord(nm, utente?.id);
            const bloccato = lega.personale && seiTu;
            const inEdit = editId === nm.id;

            if (inEdit) {
              return (
                <View key={nm.id} style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.grow, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }]}
                    maxLength={25}
                    autoCapitalize="words"
                    autoFocus
                    placeholder="Soprannome"
                    placeholderTextColor={t.textMuted}
                    value={editVal}
                    onChangeText={setEditVal}
                    onSubmitEditing={() => confermaEdit(nm.id)}
                  />
                  <Pressable onPress={() => confermaEdit(nm.id)} hitSlop={6} style={styles.act}><IconCheck size={18} color={t.ok} /></Pressable>
                  <Pressable onPress={() => { setEditId(null); setEditVal(''); }} hitSlop={6} style={styles.act}><IconClose size={18} color={t.textMuted} /></Pressable>
                </View>
              );
            }

            return (
              <View key={nm.id} style={[styles.row, { borderBottomColor: t.border }]}>
                <View style={styles.left}>
                  <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>{nm.nome}</Text>
                  {seiTu ? (
                    <View style={[styles.badge, { backgroundColor: t.dangerSoft }]}>
                      <Text style={[styles.badgeText, { color: t.danger }]}>sei tu</Text>
                    </View>
                  ) : null}
                  {np > 0 ? <Text style={[styles.games, { color: t.textMuted }]}>{np} {np === 1 ? 'partita' : 'partite'}</Text> : null}
                </View>
                <View style={styles.actions}>
                  {!seiTu && (
                    <Pressable onPress={() => { setEditId(nm.id); setEditVal(nm.nome); }} hitSlop={6} style={styles.act}>
                      <IconEdit size={17} color={t.textMuted} />
                    </Pressable>
                  )}
                  {!bloccato && (
                    <Pressable onPress={() => elimina(nm.id, nm.nome)} hitSlop={6} style={styles.act}>
                      <IconTrash size={17} color={t.danger} />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
  grow: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  games: { fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  act: { padding: 2 },
});
