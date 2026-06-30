import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  creaSessione, idBloccatiInclusi, nuovoGiocatoreSessione, oggi, suggerisciTorneo,
  type Lega, type TorneoSetupConfig,
} from '@whos-the-boss/core';

import PickChip from '@/components/gioco/PickChip';
import { IconChevronLeft, IconCoins, IconTrophy, IconWarning } from '@/components/icons';
import ConfigCash from '@/components/poker/ConfigCash';
import ConfigTorneo from '@/components/poker/ConfigTorneo';
import { Button, Card, EmptyState } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Setup serata (port di SetupForm) — quando (ora), modalità (cash/torneo) +
   config, partecipanti, crea. Data = oggi (date picker rimandato). */
export default function SetupForm({ lega }: { lega: Lega }) {
  const t = useTheme();
  const utente = useStore((s) => s.utente);
  const setupModalita = useStore((s) => s.setupModalita);
  const setupPartIds = useStore((s) => s.setupPartIds);
  const setSetupModalita = useStore((s) => s.setSetupModalita);
  const toggleSetupPartId = useStore((s) => s.toggleSetupPartId);
  const avviaSessione = useStore((s) => s.avviaSessione);
  const aggiornaSetupSerata = useStore((s) => s.aggiornaSetupSerata);
  const setupEditing = useStore((s) => s.setupEditing);
  const setSerataView = useStore((s) => s.setSerataView);

  const sessE = setupEditing ? lega.sessioneAttiva : undefined;

  const [oraInizio, setOraInizio] = useState(() => sessE?.ora_inizio ?? '21:00');
  const [oraFine, setOraFine] = useState(() => sessE?.ora_fine ?? '');
  const [buyIn, setBuyIn] = useState(() => sessE?.buy_in ?? 25);
  const [torneoConfig, setTorneoConfig] = useState<TorneoSetupConfig>(() =>
    sessE && sessE.modalita === 'torneo'
      ? {
          fiche_iniziali: sessE.fiche_iniziali,
          num_giocatori: sessE.num_giocatori_target,
          durata_ore: sessE.durata_ore,
          livelli: sessE.livelli,
          late_reg: sessE.late_reg,
          add_on: sessE.add_on,
        }
      : suggerisciTorneo(9, 3),
  );

  if (!lega.nomi.length) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <EmptyState icon={<IconWarning size={46} color={t.warn} />} title="Nessun partecipante" hint="Aggiungi prima i giocatori dalla scheda Giocatori." />
        </Card>
      </ScrollView>
    );
  }

  const bloccati = idBloccatiInclusi(lega, utente?.username);
  const isSel = (id: number) => setupPartIds.has(id) || bloccati.includes(id);

  function avvia() {
    if (!oraInizio.trim()) { Alert.alert('Attenzione', "Inserisci l'ora di inizio"); return; }
    const giocatori = lega.nomi.filter((n) => isSel(n.id)).map((n) => nuovoGiocatoreSessione(n.id));
    if (giocatori.length < 2) { Alert.alert('Attenzione', 'Seleziona almeno 2 partecipanti'); return; }

    const sess = creaSessione(
      oggi(), oraInizio.trim(), oraFine.trim(), buyIn,
      setupModalita, giocatori,
      setupModalita === 'torneo' ? torneoConfig : undefined,
    );

    if (setupEditing) {
      aggiornaSetupSerata(lega.id, sess);
      setSerataView('hub');
    } else {
      avviaSessione(lega.id, sess);
      setSerataView('live');
    }
  }

  const modBtn = (mod: 'cash' | 'torneo', label: string, icon: React.ReactNode) => {
    const sel = setupModalita === mod;
    return (
      <Pressable onPress={() => setSetupModalita(mod)} style={[styles.modBtn, { borderColor: sel ? t.accent : t.border, backgroundColor: sel ? t.accentSoft : 'transparent' }]}>
        {icon}
        <Text style={[styles.modText, { color: sel ? t.accent : t.textMuted }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => setSerataView('hub')} style={styles.back}>
        <IconChevronLeft size={18} color={t.textMuted} />
        <Text style={[styles.backText, { color: t.textMuted }]}>Indietro</Text>
      </Pressable>

      <Card>
        <Text style={[styles.cardTitle, { color: t.text }]}>Quando</Text>
        <View style={styles.grid}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textMuted }]}>Ora inizio</Text>
            <TextInput style={[styles.input, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }]} value={oraInizio} onChangeText={setOraInizio} placeholder="21:00" placeholderTextColor={t.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textMuted }]}>Ora fine (stima)</Text>
            <TextInput style={[styles.input, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }]} value={oraFine} onChangeText={setOraFine} placeholder="--:--" placeholderTextColor={t.textMuted} />
          </View>
        </View>
        <Text style={[styles.hint, { color: t.textMuted }]}>Data: oggi.</Text>
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: t.text }]}>Modalità</Text>
        <View style={styles.modToggle}>
          {modBtn('cash', 'Cash Game', <IconCoins size={15} color={setupModalita === 'cash' ? t.accent : t.textMuted} />)}
          {modBtn('torneo', 'Torneo', <IconTrophy size={15} color={setupModalita === 'torneo' ? t.accent : t.textMuted} />)}
        </View>
        <View style={styles.config}>
          {setupModalita === 'cash'
            ? <ConfigCash buyIn={buyIn} onChange={setBuyIn} />
            : <ConfigTorneo config={torneoConfig} buyIn={buyIn} onBuyInChange={setBuyIn} onChange={setTorneoConfig} />}
        </View>
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: t.text }]}>Partecipanti alla serata</Text>
        <View style={styles.partGrid}>
          {lega.nomi.map((n) => (
            <PickChip key={n.id} label={n.nome} selected={isSel(n.id)} locked={bloccati.includes(n.id)} onPress={() => toggleSetupPartId(n.id)} />
          ))}
        </View>
        <Text style={[styles.hint, { color: t.textMuted, marginTop: 10 }]}>Chi è presente stasera (puoi aggiungerne durante la serata).</Text>
      </Card>

      <Button block onPress={avvia}>{setupEditing ? 'Salva modifiche' : 'Crea serata'}</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { fontSize: 14, fontWeight: '600' },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  grid: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
  hint: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  modToggle: { flexDirection: 'row', gap: 10 },
  modBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 12 },
  modText: { fontSize: 14, fontWeight: '700' },
  config: { marginTop: 14 },
  partGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
