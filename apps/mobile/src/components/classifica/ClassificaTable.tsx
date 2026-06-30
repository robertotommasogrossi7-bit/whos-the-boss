import { StyleSheet, Text, View } from 'react-native';

import { euro, ordinaMatchInCima, rigaMatchaNome, type ClassificaU, type RigaClassificaU } from '@whos-the-boss/core';

import { IconCrown } from '@/components/icons';
import { Avatar } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

/* TABELLA CLASSIFICA CONDIVISA (#4.7a) — un solo componente per tutti i
   contesti, colonne parametriche sul tipo (#4.6):
   - 'soldi' (poker): # | Giocatore | Part. | Vitt. | % | Netto
   - 'punti' (giochi): # | Giocatore | % vinte | Sess.
   Match-in-cima (ordinaMatchInCima): porta i match in alto senza nasconderli
   ne' falsare il rank reale (il # resta il rank per KPI). */
interface Props {
  classifica: ClassificaU;
  query?: string;
}

function rigaHaDati(r: RigaClassificaU): boolean {
  return r.kpi.tipo === 'soldi' ? r.kpi.partiteGiocate > 0 : r.kpi.stats.partiteGiocate > 0;
}

export default function ClassificaTable({ classifica, query = '' }: Props) {
  const t = useTheme();
  const { tipo, righe } = classifica;
  const soldi = tipo === 'soldi';

  const rankById = new Map<number, number>();
  righe.forEach((r, i) => rankById.set(r.idNome, i + 1));

  const ordinate = ordinaMatchInCima(righe, query);
  const haQuery = query.trim().length > 0;

  return (
    <View style={[styles.table, { borderColor: t.border }]}>
      <View style={[styles.thead, { borderBottomColor: t.border }]}>
        <Text style={[styles.thPos, { color: t.textMuted }]}>#</Text>
        <Text style={[styles.thNome, { color: t.textMuted }]}>Giocatore</Text>
        {soldi ? (
          <>
            <Text style={[styles.thNum, { color: t.textMuted }]}>Part.</Text>
            <Text style={[styles.thNum, { color: t.textMuted }]}>Vitt.</Text>
            <Text style={[styles.thNum, { color: t.textMuted }]}>%</Text>
            <Text style={[styles.thNetto, { color: t.textMuted }]}>Netto</Text>
          </>
        ) : (
          <>
            <Text style={[styles.thNum, { color: t.textMuted }]}>% vinte</Text>
            <Text style={[styles.thNum, { color: t.textMuted }]}>Sess.</Text>
          </>
        )}
      </View>

      {ordinate.map((r) => {
        const zero = !rigaHaDati(r);
        const match = haQuery && rigaMatchaNome(r, query);
        return (
          <View
            key={r.idNome}
            style={[
              styles.row,
              { borderBottomColor: t.border },
              r.isLeader ? { backgroundColor: t.accentSoft } : null,
              match ? { backgroundColor: t.warnSoft } : null,
              zero ? styles.zero : null,
            ]}
          >
            <Text style={[styles.pos, { color: t.textMuted }]}>{rankById.get(r.idNome)}</Text>
            <View style={styles.player}>
              {r.isLeader ? <IconCrown size={14} color={t.warn} /> : <View style={styles.crownPh} />}
              <Avatar nome={r.nome} size="sm" />
              <Text style={[styles.nome, { color: t.text }]} numberOfLines={1}>{r.nome}</Text>
            </View>

            {r.kpi.tipo === 'soldi' ? (
              <>
                <Text style={[styles.num, { color: t.text }]}>{r.kpi.partiteGiocate}</Text>
                <Text style={[styles.num, { color: t.text }]}>{r.kpi.partiteVinte}</Text>
                <Text style={[styles.num, { color: t.text }]}>{r.kpi.partiteGiocate > 0 ? `${r.kpi.percVittorie}%` : '—'}</Text>
                <Text style={[styles.netto, { color: r.kpi.netto >= 0 ? t.ok : t.danger }]}>{euro(r.kpi.netto)}</Text>
              </>
            ) : (
              <>
                <Text style={[styles.num, { color: t.text }]}>{r.kpi.stats.partiteGiocate > 0 ? `${r.kpi.stats.percVittorie}%` : '—'}</Text>
                <Text style={[styles.num, { color: t.text }]}>{r.kpi.stats.partiteGiocate > 0 ? r.kpi.stats.sessioniVinte : '—'}</Text>
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  table: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  thead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  zero: { opacity: 0.45 },
  thPos: { width: 22, fontSize: 11, fontWeight: '700' },
  pos: { width: 22, fontSize: 13, fontWeight: '700' },
  thNome: { flex: 1, fontSize: 11, fontWeight: '700' },
  player: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  crownPh: { width: 14 },
  nome: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  thNum: { width: 40, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  num: { width: 40, fontSize: 13, textAlign: 'right' },
  thNetto: { width: 58, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  netto: { width: 58, fontSize: 13, fontWeight: '700', textAlign: 'right' },
});
