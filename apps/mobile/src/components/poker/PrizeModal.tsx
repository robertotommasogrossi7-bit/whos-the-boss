import { Modal, StyleSheet, Text, View } from 'react-native';

import { euro, getNome, type Lega } from '@whos-the-boss/core';

import { IconCoins, IconTrophy } from '@/components/icons';
import { Button } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Modale premio — mostrata all'eliminazione in zona premi (pendingPrizeNome). */
export default function PrizeModal({ lega }: { lega: Lega }) {
  const t = useTheme();
  const pendingPrizeNome = useStore((s) => s.pendingPrizeNome);
  const confirmaPremio = useStore((s) => s.confirmaPremio);

  const sess = lega.sessioneAttiva;
  if (!sess || pendingPrizeNome == null) return null;

  const nome = getNome(lega, pendingPrizeNome);
  const g = sess.giocatori.find((x) => x.id_nome === pendingPrizeNome);
  const pos = g?.posizione_finale ?? 0;
  const premio = sess.premi[pos - 1];
  if (!premio) return null;

  const title = pos === 1 ? 'Vincitore!' : 'In the money!';

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.inner, { backgroundColor: t.surface, borderColor: t.accent }]}>
          {pos === 1 ? <IconTrophy size={50} color={t.warn} /> : <IconCoins size={50} color={t.accent} />}
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          <Text style={[styles.pos, { color: t.textMuted }]}>{pos}° posto</Text>
          <Text style={[styles.name, { color: t.text }]}>{nome}</Text>
          <Text style={[styles.amt, { color: t.accent }]}>{euro(premio.importo)}</Text>
          <View style={styles.btns}>
            <Button variant="ghost" onPress={() => confirmaPremio(lega.id, false)}>Da pagare</Button>
            <Button onPress={() => confirmaPremio(lega.id, true)}>Pagato subito</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 },
  inner: { width: '100%', maxWidth: 360, borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center', gap: 6 },
  title: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  pos: { fontSize: 14, fontWeight: '600' },
  name: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  amt: { fontSize: 30, fontWeight: '800', marginVertical: 6 },
  btns: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
