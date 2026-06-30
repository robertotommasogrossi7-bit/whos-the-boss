import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { computeLive, euro, euroSigned, getNome, type Lega, type Sessione } from '@whos-the-boss/core';

import { GameIcon, IconCrown, IconEdit, IconWarning } from '@/components/icons';
import ImportoSheet from '@/components/poker/ImportoSheet';
import MoneyInput from '@/components/poker/MoneyInput';
import { Button, Card, EmptyState } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Live cash — sub-tab ATTIVI: il conto live per ogni giocatore entrato
   (dovuto, ricariche, versato, mancante, fiches, netto) via computeLive. */
export default function SubAttivi({ lega, sess }: { lega: Lega; sess: Sessione }) {
  const t = useTheme();
  const aggiungiRicarica = useStore((s) => s.aggiungiRicarica);
  const modificaRicarica = useStore((s) => s.modificaRicarica);
  const setVersato = useStore((s) => s.setVersato);
  const aggiornaFiches = useStore((s) => s.aggiornaFiches);

  const { arr, leaderId } = computeLive(sess);
  const attivi = arr.filter((c) => c.entrato);

  const [ric, setRic] = useState<{ idNome: number; idx?: number; initial?: number } | null>(null);

  if (!attivi.length) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState icon={<GameIcon icona="picche" size={46} color={t.accent} />} title="Nessuno è entrato" hint="Vai sulla scheda Giocatori per segnare gli ingressi." />
      </ScrollView>
    );
  }

  function confermaRic(v: number) {
    if (!ric) return;
    if (ric.idx != null) modificaRicarica(lega.id, ric.idNome, ric.idx, v);
    else aggiungiRicarica(lega.id, ric.idNome, v, false);
    setRic(null);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {attivi.map((c) => {
        const isWinner = c.id_nome === leaderId;
        const nettoColor = c.netto > 0 ? t.ok : c.netto < 0 ? t.danger : t.textMuted;
        const nettoLbl = c.netto > 0 ? 'Vince' : c.netto < 0 ? 'Perde' : '—';
        const nome = getNome(lega, c.id_nome);
        return (
          <Card key={c.id_nome} style={isWinner ? { borderColor: t.accent } : undefined}>
            <View style={styles.head}>
              <Text style={[styles.name, { color: t.text }]}>{nome}</Text>
              {isWinner ? <IconCrown size={18} color={t.warn} /> : null}
            </View>

            <View style={styles.dovutoRow}>
              <Text style={[styles.dim, { color: t.textMuted }]}>
                Dovuto ({euro(sess.buy_in)} buy-in{c.ricaricheTot > 0 ? ` + ${euro(c.ricaricheTot)} ricariche` : ''})
              </Text>
              <Text style={[styles.dovutoAmt, { color: t.text }]}>{euro(c.dovuto)}</Text>
            </View>

            {c.ricariche.length > 0 && (
              <View style={styles.ricariche}>
                {c.ricariche.map((r, i) => (
                  <Pressable key={i} onPress={() => setRic({ idNome: c.id_nome, idx: i, initial: r.importo })} style={styles.ricRow}>
                    <Text style={[styles.dim, { color: t.textMuted }]}>Ricarica {i + 1}: {euro(r.importo)}</Text>
                    <IconEdit size={14} color={t.textMuted} />
                  </Pressable>
                ))}
              </View>
            )}
            <Button variant="ghost" size="sm" onPress={() => setRic({ idNome: c.id_nome })}>+€ Aggiungi ricarica</Button>

            <Text style={[styles.label, { color: t.textMuted }]}>Versato nel piatto (€)</Text>
            <MoneyInput value={c.versato ?? 0} onChange={(v) => setVersato(lega.id, c.id_nome, v)} />

            {c.mancante > 0.005 && (
              <View style={[styles.mancante, { backgroundColor: t.warnSoft }]}>
                <IconWarning size={13} color={t.warn} />
                <Text style={[styles.mancanteText, { color: t.warn }]}>Mancano {euro(c.mancante)} da versare</Text>
              </View>
            )}

            <Text style={[styles.label, { color: t.textMuted }]}>Fiches finali (€)</Text>
            <MoneyInput value={c.fiches ?? 0} onChange={(v) => aggiornaFiches(lega.id, c.id_nome, v)} />

            <View style={styles.nettoBlock}>
              <Text style={[styles.nettoBig, { color: nettoColor }]}>{euroSigned(c.netto)}</Text>
              <Text style={[styles.nettoLbl, { color: t.textMuted }]}>{nettoLbl}</Text>
            </View>
          </Card>
        );
      })}

      <ImportoSheet
        open={ric != null}
        title={ric?.idx != null ? 'Modifica ricarica (€)' : 'Aggiungi ricarica (€)'}
        initial={ric?.initial}
        allowZeroDelete={ric?.idx != null}
        onClose={() => setRic(null)}
        onConfirm={confermaRic}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', flex: 1 },
  dovutoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  dim: { fontSize: 12, flexShrink: 1 },
  dovutoAmt: { fontSize: 15, fontWeight: '700' },
  ricariche: { gap: 4, marginTop: 6 },
  ricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  label: { fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  mancante: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginTop: 8 },
  mancanteText: { fontSize: 12, fontWeight: '600' },
  nettoBlock: { alignItems: 'center', marginTop: 14 },
  nettoBig: { fontSize: 26, fontWeight: '800' },
  nettoLbl: { fontSize: 12, marginTop: 2 },
});
