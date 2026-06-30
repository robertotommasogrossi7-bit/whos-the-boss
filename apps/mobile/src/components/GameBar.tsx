import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GIOCHI_PREIMPOSTATI } from '@whos-the-boss/core';

import { GameIcon, IconChevronDown } from '@/components/icons';
import { Sheet } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* GAMEBAR (DESIGN_SPEC §5) — filtro gioco persistente in cima a
   Home/Classifica/Storico. Mostra il gioco selezionato (icona+nome in
   accento); tap → elenco dal catalogo. Al cambio gioco lo store aggiorna
   `giocoFiltro` e la radice (_layout) ri-tema l'app (feltro per il poker). */
export default function GameBar() {
  const t = useTheme();
  const giocoFiltro = useStore((s) => s.giocoFiltro);
  const setGiocoFiltro = useStore((s) => s.setGiocoFiltro);
  const gameBarVisible = useStore((s) => s.gameBarVisible);
  const setGameBarVisible = useStore((s) => s.setGameBarVisible);
  const gameBarPinned = useStore((s) => s.gameBarPinned);
  const setGameBarPinned = useStore((s) => s.setGameBarPinned);
  const [open, setOpen] = useState(false);

  const gioco = GIOCHI_PREIMPOSTATI.find((g) => g.id === giocoFiltro);
  const icona = gioco?.icona ?? 'mazzo';
  const nome = gioco?.nome ?? 'Gioco';

  if (!gameBarVisible) {
    return (
      <Pressable onPress={() => setGameBarVisible(true)} style={styles.showBar}>
        <Text style={[styles.showText, { color: t.textMuted }]}>Mostra barra giochi</Text>
      </Pressable>
    );
  }

  function scegli(id: string) {
    setGiocoFiltro(id);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={() => { if (!gameBarPinned) setOpen(true); }}
        disabled={gameBarPinned}
        style={[styles.bar, { backgroundColor: t.surface, borderBottomColor: t.border }]}
      >
        <GameIcon icona={icona} size={22} color={t.accent} />
        <Text style={[styles.nome, { color: t.accent }]} numberOfLines={1}>{nome}</Text>
        {gameBarPinned
          ? <Text style={[styles.pin, { color: t.textMuted }]}>fisso</Text>
          : <IconChevronDown size={18} color={t.textMuted} />}
      </Pressable>

      <Sheet open={open} onClose={() => setOpen(false)} title="Scegli gioco">
        <View style={styles.list}>
          {GIOCHI_PREIMPOSTATI.map((g) => {
            const sel = g.id === giocoFiltro;
            return (
              <Pressable
                key={g.id}
                onPress={() => scegli(g.id)}
                style={[styles.item, {
                  borderColor: sel ? t.accent : t.border,
                  backgroundColor: sel ? t.accentSoft : 'transparent',
                }]}
              >
                <GameIcon icona={g.icona} size={24} color={sel ? t.accent : t.text} />
                <Text style={[styles.itemNome, { color: t.text }]}>{g.nome}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.settings, { borderTopColor: t.border }]}>
          <Pressable onPress={() => setGameBarPinned(!gameBarPinned)} style={styles.setting}>
            <Text style={[styles.settingText, { color: t.accent }]}>
              {gameBarPinned ? 'Sblocca gioco' : 'Fissa questo gioco'}
            </Text>
          </Pressable>
          <Pressable onPress={() => { setGameBarVisible(false); setOpen(false); }} style={styles.setting}>
            <Text style={[styles.settingText, { color: t.textMuted }]}>Nascondi barra</Text>
          </Pressable>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  nome: { fontSize: 16, fontWeight: '700', flex: 1 },
  pin: { fontSize: 12, fontWeight: '700' },
  showBar: { paddingVertical: 10, alignItems: 'center' },
  showText: { fontSize: 13, fontWeight: '600' },
  list: { gap: 8, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  itemNome: { fontSize: 15, fontWeight: '600' },
  settings: { flexDirection: 'row', gap: 12, marginTop: 8, borderTopWidth: 1, paddingTop: 12 },
  setting: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  settingText: { fontSize: 14, fontWeight: '600' },
});
