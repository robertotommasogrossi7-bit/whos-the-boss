import { StyleSheet, Text, View } from 'react-native';

import { euro, type SettlementState } from '@whos-the-boss/core';

import { IconCheck } from '@/components/icons';
import MoneyInput from '@/components/poker/MoneyInput';
import { Card } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Settlement torneo — classifica finale + contributi da versare (matrice
   allocazioni loser→winner editabile) + premi da ricevere + in pari.
   Modello contributo_residuo/premio_residuo (core, testato). */
function TotItem({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={styles.totItem}>
      <Text style={[styles.totLbl, { color: t.textMuted }]}>{label}</Text>
      <Text style={[styles.totVal, { color: t.text }]}>{value}</Text>
    </View>
  );
}

export default function ChiusuraTorneo({ legaId }: { legaId: number }) {
  const t = useTheme();
  const settlement = useStore((s) => s.settlement);
  const lega = useStore((s) => s.db.leghe.find((l) => l.id === legaId));
  const setAllocazione = useStore((s) => s.setAllocazione);

  if (!lega || !settlement) return null;
  const st: SettlementState = settlement;
  const nomeDi = (id: number) => lega.nomi.find((n) => n.id === id)?.nome ?? '?';

  const winnerAllocato = (winnerId: number) =>
    Math.round(
      Object.values(st.allocazioni).flatMap((a) => a).filter((a) => a.to === winnerId).reduce((acc, a) => acc + a.amount, 0) * 100,
    ) / 100;

  const sortedByPos = [...st.entrati].sort((a, b) => (a.posizione_finale ?? 999) - (b.posizione_finale ?? 999));
  const montepremi = st.sessione.premi?.reduce((s, p) => s + p.importo, 0) ?? 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.totalBar}>
        <TotItem label="Giocatori" value={String(st.entrati.length)} />
        <TotItem label="Montepremi" value={euro(montepremi)} />
        <TotItem label="Da saldare" value={String(st.losers.length)} />
      </View>

      <Text style={[styles.secTitle, { color: t.text }]}>Classifica finale</Text>
      <Card>
        {sortedByPos.map((p) => {
          const pos = p.posizione_finale;
          const premio = st.sessione.premi?.find((x) => x.posizione === pos);
          return (
            <View key={p.id_nome} style={styles.rankRow}>
              <Text style={[styles.rankPos, { color: t.textMuted }]}>{pos ?? '—'}</Text>
              <Text style={[styles.rankNome, { color: t.text }]} numberOfLines={1}>{nomeDi(p.id_nome)}</Text>
              {premio ? <Text style={[styles.rankAmt, { color: t.ok }]}>{euro(premio.importo)}</Text> : null}
            </View>
          );
        })}
      </Card>

      {st.losers.length > 0 && (
        <>
          <Text style={[styles.secTitle, { color: t.text }]}>Contributi da versare</Text>
          {st.losers.map((loser) => {
            const allocs = st.allocazioni[loser.id_nome] ?? [];
            const allocato = Math.round(allocs.reduce((a, x) => a + x.amount, 0) * 100) / 100;
            const residuo = Math.round((loser.contributo_residuo - allocato) * 100) / 100;
            const ok = Math.abs(residuo) < 0.01;
            return (
              <Card key={loser.id_nome}>
                <View style={styles.head}>
                  <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>{nomeDi(loser.id_nome)}</Text>
                  <Text style={[styles.amt, { color: t.danger }]}>−{euro(loser.contributo_residuo)}</Text>
                </View>
                <Text style={[styles.info, { color: t.textMuted }]}>Dovuto {euro(loser.contributo_dovuto)} · Pagato {euro(loser.contributo_pagato)}</Text>
                <View style={styles.allocs}>
                  {st.winners.map((w) => {
                    const alloc = allocs.find((a) => a.to === w.id_nome);
                    return (
                      <View key={w.id_nome} style={styles.allocRow}>
                        <Text style={[styles.allocName, { color: t.text }]} numberOfLines={1}>→ {nomeDi(w.id_nome)}</Text>
                        <MoneyInput value={alloc?.amount ?? 0} onChange={(v) => setAllocazione(legaId, loser.id_nome, w.id_nome, v)} style={styles.allocInput} />
                      </View>
                    );
                  })}
                  <View style={[styles.remaining, { backgroundColor: ok ? t.okSoft : t.warnSoft }]}>
                    {ok ? <IconCheck size={13} color={t.ok} /> : null}
                    <Text style={{ color: ok ? t.ok : t.warn, fontSize: 12, fontWeight: '600' }}>
                      {ok ? 'Bilanciato' : residuo > 0 ? `Residuo: −${euro(residuo)}` : `Eccesso: +${euro(Math.abs(residuo))}`}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </>
      )}

      {st.winners.length > 0 && (
        <>
          <Text style={[styles.secTitle, { color: t.text }]}>Premi da ricevere</Text>
          {st.winners.map((w) => {
            const allocato = winnerAllocato(w.id_nome);
            return (
              <Card key={w.id_nome} style={{ borderColor: t.accent }}>
                <View style={styles.head}>
                  <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>{nomeDi(w.id_nome)}</Text>
                  <Text style={[styles.amt, { color: t.ok }]}>{euro(w.premio_dovuto)}</Text>
                </View>
                <Text style={[styles.info, { color: t.textMuted }]}>
                  {w.prize_pagato ? 'Già ricevuto' : `Da ricevere ${euro(w.premio_residuo)} · Allocato ${euro(allocato)}`}
                </Text>
              </Card>
            );
          })}
        </>
      )}

      {st.neutri.length > 0 && (
        <>
          <Text style={[styles.secTitle, { color: t.text }]}>In pari</Text>
          {st.neutri.map((n) => (
            <Card key={n.id_nome}>
              <View style={styles.head}>
                <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>{nomeDi(n.id_nome)}</Text>
                <Text style={[styles.info, { color: t.textMuted }]}>—</Text>
              </View>
            </Card>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  totalBar: { flexDirection: 'row' },
  totItem: { flex: 1, alignItems: 'center', gap: 2 },
  totLbl: { fontSize: 11 },
  totVal: { fontSize: 17, fontWeight: '800' },
  secTitle: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rankPos: { width: 26, fontSize: 15, fontWeight: '800' },
  rankNome: { flex: 1, fontSize: 14, fontWeight: '600' },
  rankAmt: { fontSize: 14, fontWeight: '700' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 15, fontWeight: '700', flex: 1 },
  amt: { fontSize: 15, fontWeight: '800' },
  info: { fontSize: 12, marginTop: 4 },
  allocs: { gap: 8, marginTop: 10 },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  allocName: { flex: 1, fontSize: 14 },
  allocInput: { width: 110, minHeight: 38, paddingVertical: 6 },
  remaining: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginTop: 4 },
});
