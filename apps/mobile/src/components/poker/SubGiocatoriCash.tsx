import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { euro, getNome, type Lega, type Sessione } from '@whos-the-boss/core';

import { IconPlus, IconUsers } from '@/components/icons';
import MoneyInput from '@/components/poker/MoneyInput';
import { Button, Card, EmptyState, Sheet } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Live cash — sub-tab GIOCATORI: roster della serata (Entra/Esci, entrata,
   aggiungi/rimuovi). Il tavolo virtuale (seating) e' rimandato. */
export default function SubGiocatoriCash({ lega, sess }: { lega: Lega; sess: Sessione }) {
  const t = useTheme();
  const toggleEntrato = useStore((s) => s.toggleEntrato);
  const setEntrata = useStore((s) => s.setEntrata);
  const addGiocatoreSessione = useStore((s) => s.addGiocatoreSessione);
  const rimuoviGiocatoreSessione = useStore((s) => s.rimuoviGiocatoreSessione);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const inSess = new Set(sess.giocatori.map((g) => g.id_nome));
  const disponibili = lega.nomi.filter((n) => !inSess.has(n.id));

  function aggiungi(nome: string) {
    const n = nome.trim();
    if (!n) return;
    const err = addGiocatoreSessione(lega.id, n);
    if (err) { Alert.alert('Attenzione', err); return; }
    setAddOpen(false);
    setNewName('');
  }

  function rimuovi(idNome: number, nome: string) {
    Alert.alert(`Rimuovere ${nome}?`, undefined, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Rimuovi', style: 'destructive', onPress: () => rimuoviGiocatoreSessione(lega.id, idNome) },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Button variant="ghost" block onPress={() => setAddOpen(true)}>+ Aggiungi giocatore alla serata</Button>

      {sess.giocatori.length === 0 ? (
        <EmptyState icon={<IconUsers size={46} color={t.textMuted} />} title="Nessun giocatore" hint="Aggiungi i giocatori alla serata." />
      ) : (
        sess.giocatori.map((g) => {
          const nome = getNome(lega, g.id_nome);
          const entrata = g.entrata ?? sess.buy_in;
          const ricaricheTot = g.ricariche.reduce((a, r) => a + r.importo, 0);
          const dovuto = entrata + ricaricheTot;
          return (
            <Card key={g.id_nome}>
              <View style={styles.head}>
                <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>{nome}</Text>
                <Button size="sm" variant={g.entrato ? 'ghost' : 'primary'} onPress={() => toggleEntrato(lega.id, g.id_nome)}>
                  {g.entrato ? 'Esci' : 'Entra'}
                </Button>
              </View>

              {g.entrato ? (
                <View style={styles.body}>
                  <Text style={[styles.label, { color: t.textMuted }]}>Entrata (€)</Text>
                  <MoneyInput value={g.entrata ?? 0} onChange={(v) => setEntrata(lega.id, g.id_nome, v)} placeholder={String(sess.buy_in)} />
                  <Text style={[styles.dovuto, { color: t.textMuted }]}>
                    Dovuto {euro(dovuto)}{ricaricheTot > 0 ? ` (entrata ${euro(entrata)} + ricariche ${euro(ricaricheTot)})` : ''}
                  </Text>
                </View>
              ) : (
                <Pressable onPress={() => rimuovi(g.id_nome, nome)} style={styles.removeRow}>
                  <Text style={[styles.remove, { color: t.danger }]}>Rimuovi dalla serata</Text>
                </Pressable>
              )}
            </Card>
          );
        })
      )}

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Aggiungi giocatore">
        {disponibili.length > 0 && (
          <>
            <Text style={[styles.label, { color: t.textMuted }]}>Dalla lega</Text>
            <View style={styles.chips}>
              {disponibili.map((n) => (
                <Pressable key={n.id} onPress={() => aggiungi(n.nome)} style={[styles.chip, { borderColor: t.border }]}>
                  <Text style={{ color: t.text, fontWeight: '600' }}>{n.nome}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        <Text style={[styles.label, { color: t.textMuted, marginTop: 12 }]}>Oppure nuovo</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, styles.grow, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }]}
            value={newName}
            onChangeText={setNewName}
            placeholder="Nome giocatore"
            placeholderTextColor={t.textMuted}
            autoCapitalize="words"
            onSubmitEditing={() => aggiungi(newName)}
          />
          <Button size="sm" onPress={() => aggiungi(newName)}><IconPlus size={18} color={t.accentInk} /></Button>
        </View>
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { fontSize: 16, fontWeight: '700', flex: 1 },
  body: { marginTop: 12 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
  dovuto: { fontSize: 12, marginTop: 8 },
  removeRow: { marginTop: 10 },
  remove: { fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  grow: { flex: 1 },
});
