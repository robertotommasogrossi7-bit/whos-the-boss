import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { migrateLega, normalizzaNome, type Lega } from '@whos-the-boss/core';

import { IconClose } from '@/components/icons';
import { Button, Card } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Creazione nuova lega (port di NuovaLega web). Nome + partecipanti (dedup per
   nome normalizzato), poi migrateLega + addLega. Foto (image picker) rimandata.
   Su mobile utente=null fino a R2 → niente "sei tu" (la logica lo gestisce). */
export default function NuovaLega() {
  const t = useTheme();
  const toast = useStore((s) => s.toast);
  const dbLid = useStore((s) => s.db._lid);
  const addLega = useStore((s) => s.addLega);
  const setCurrentLega = useStore((s) => s.setCurrentLega);
  const utente = useStore((s) => s.utente);

  const tuoNome = utente?.username?.trim() ?? '';

  const [nome, setNome] = useState('');
  const [partecipanti, setPartecipanti] = useState<string[]>(['', '']);

  const aggiungiCampo = () => setPartecipanti((p) => [...p, '']);
  const rimuoviCampo = (idx: number) => setPartecipanti((p) => p.filter((_, i) => i !== idx));
  const aggiornaCampo = (idx: number, val: string) => setPartecipanti((p) => p.map((v, i) => (i === idx ? val : v)));

  function creaLega() {
    const nomeTrimmed = nome.trim();
    if (!nomeTrimmed) { toast('Inserisci il nome della lega'); return; }

    const nomiList: Lega['nomi'] = [];
    let nid = 1;
    let tuoId: number | null = null;
    if (tuoNome) {
      tuoId = nid;
      nomiList.push({ id: nid++, nome: tuoNome });
    }
    partecipanti.forEach((p) => {
      const v = p.trim();
      if (v && !nomiList.some((n) => normalizzaNome(n.nome) === normalizzaNome(v))) {
        nomiList.push({ id: nid++, nome: v });
      }
    });

    const nuovaLega: Lega = {
      id: dbLid,
      nome: nomeTrimmed,
      foto: '',
      nomi: nomiList,
      partite: [],
      sessioneAttiva: undefined,
      serate_bg: [],
      _nid: nid,
      _pid: 1,
      adminIds: tuoId != null ? [tuoId] : undefined,
    };
    // Inizializza subito i campi multigioco (sessioniGioco/_sgid/personale).
    migrateLega(nuovaLega);

    addLega(nuovaLega);
    setCurrentLega(nuovaLega.id);
    toast('Lega creata!');
    router.back();
  }

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
      <Card>
        <Text style={[styles.cardTitle, { color: t.text }]}>Nome della lega</Text>
        <TextInput
          style={[styles.input, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }]}
          placeholder="es. Lega del Mercoledì"
          placeholderTextColor={t.textMuted}
          maxLength={40}
          value={nome}
          onChangeText={setNome}
        />
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: t.text }]}>Partecipanti</Text>
        {tuoNome ? (
          <View style={styles.tuRow}>
            <Text style={[styles.tuNome, { color: t.text }]}>{tuoNome}</Text>
            <View style={[styles.badge, { backgroundColor: t.dangerSoft }]}>
              <Text style={[styles.badgeText, { color: t.danger }]}>sei tu</Text>
            </View>
          </View>
        ) : null}

        {partecipanti.map((val, idx) => (
          <View style={styles.partRow} key={idx}>
            <TextInput
              style={[styles.input, styles.grow, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }]}
              placeholder="Nome partecipante"
              placeholderTextColor={t.textMuted}
              maxLength={25}
              autoCapitalize="words"
              value={val}
              onChangeText={(v) => aggiornaCampo(idx, v)}
            />
            <Pressable onPress={() => rimuoviCampo(idx)} hitSlop={8} style={styles.rem}>
              <IconClose size={18} color={t.textMuted} />
            </Pressable>
          </View>
        ))}

        <Button variant="ghost" block onPress={aggiungiCampo}>+ Aggiungi partecipante</Button>

        {tuoNome ? (
          <Text style={[styles.note, { color: t.textMuted }]}>
            Crei tu la lega: sei incluso come admin. Potrai non partecipare alle singole serate.
          </Text>
        ) : null}
      </Card>

      </ScrollView>

      <View style={[styles.footer, { borderTopColor: t.border, backgroundColor: t.bg }]}>
        <Button block onPress={creaLega}>Crea lega</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: { padding: 16, borderTopWidth: 1 },
  content: { padding: 16, gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
  grow: { flex: 1 },
  tuRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tuNome: { fontSize: 15, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  partRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  rem: { padding: 4 },
  note: { fontSize: 12, lineHeight: 17, marginTop: 10 },
});
