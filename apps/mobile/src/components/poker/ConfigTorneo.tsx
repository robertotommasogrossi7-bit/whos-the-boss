import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { suggerisciTorneo, type TorneoSetupConfig } from '@whos-the-boss/core';

import { useTheme } from '@/theme/ThemeContext';

/* Config torneo (semplificata, R1.5b) — parametri + struttura AUTOMATICA
   (suggerisciTorneo) + add-on. L'editor manuale dei livelli (SB/BB) arriva dopo. */
interface Props {
  config: TorneoSetupConfig;
  buyIn: number;
  onBuyInChange: (v: number) => void;
  onChange: (cfg: TorneoSetupConfig) => void;
}

function NumField({ label, value, onNum, decimal }: { label: string; value: number; onNum: (v: number) => void; decimal?: boolean }) {
  const t = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: t.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }]}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        value={value ? String(value) : ''}
        onChangeText={(s) => onNum(decimal ? parseFloat(s.replace(',', '.')) || 0 : parseInt(s, 10) || 0)}
      />
    </View>
  );
}

export default function ConfigTorneo({ config, buyIn, onBuyInChange, onChange }: Props) {
  const t = useTheme();
  const totalMin = config.livelli.reduce((acc, l) => acc + l.durata, 0);
  const numTavoli = Math.ceil(config.num_giocatori / 9);
  const numLivelli = config.livelli.filter((l) => l.tipo === 'gioco').length;

  // Cambiare giocatori/durata rigenera la struttura automatica (mantiene l'add-on).
  const regen = (num: number, durata: number) => onChange({ ...suggerisciTorneo(num, durata), add_on: config.add_on });

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        <NumField label="Buy-in (€)" value={buyIn} onNum={onBuyInChange} decimal />
        <NumField label="Giocatori previsti" value={config.num_giocatori} onNum={(v) => regen(Math.max(2, Math.min(200, v || 2)), config.durata_ore)} />
      </View>
      <View style={styles.grid}>
        <NumField label="Durata (ore)" value={config.durata_ore} onNum={(v) => regen(config.num_giocatori, Math.max(1, Math.min(12, v || 3)))} decimal />
        <NumField label="Fiche iniziali" value={config.fiche_iniziali} onNum={(v) => onChange({ ...config, fiche_iniziali: Math.max(500, v || 10000) })} />
      </View>

      <View style={styles.pills}>
        {[`${numTavoli} ${numTavoli === 1 ? 'tavolo' : 'tavoli'}`, `~${Math.floor(totalMin / 60)}h${totalMin % 60 ? ` ${totalMin % 60}m` : ''}`, `${numLivelli} livelli`].map((p) => (
          <View key={p} style={[styles.pill, { backgroundColor: t.accentSoft }]}>
            <Text style={[styles.pillText, { color: t.accent }]}>{p}</Text>
          </View>
        ))}
      </View>

      <View style={styles.addonRow}>
        <Text style={[styles.addonLabel, { color: t.text }]}>Add-on disponibile?</Text>
        <Pressable
          onPress={() => onChange({ ...config, add_on: { ...config.add_on, abilitato: !config.add_on.abilitato } })}
          style={[styles.toggle, { backgroundColor: config.add_on.abilitato ? t.okSoft : t.surface2, borderColor: config.add_on.abilitato ? t.ok : t.border }]}
        >
          <Text style={{ color: config.add_on.abilitato ? t.ok : t.textMuted, fontWeight: '700' }}>{config.add_on.abilitato ? 'Sì' : 'No'}</Text>
        </Pressable>
      </View>

      {config.add_on.abilitato && (
        <View style={styles.grid}>
          <NumField label="Fiche add-on" value={config.add_on.fiche} onNum={(v) => onChange({ ...config, add_on: { ...config.add_on, fiche: Math.max(0, v || 0) } })} />
          <NumField label="Prezzo (€)" value={config.add_on.prezzo} onNum={(v) => onChange({ ...config, add_on: { ...config.add_on, prezzo: Math.max(0, v || 0) } })} decimal />
        </View>
      )}

      <Text style={[styles.hint, { color: t.textMuted }]}>Struttura livelli automatica (modifica manuale in arrivo).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  grid: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  pillText: { fontSize: 12, fontWeight: '700' },
  addonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addonLabel: { fontSize: 14, fontWeight: '600' },
  toggle: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 16 },
  hint: { fontSize: 12, lineHeight: 17 },
});
