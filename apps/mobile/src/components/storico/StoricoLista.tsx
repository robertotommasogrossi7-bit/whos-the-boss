import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  esitoSessione, euro, filtraStoricoPerNome, fmtData, getNome, GIOCHI_PREIMPOSTATI,
  partitaInCorso,
  type Lega, type Partita, type PartitaGioco, type SessioneGioco, type VoceStorico,
} from '@whos-the-boss/core';

import {
  GameIcon, IconChevronDown, IconChevronUp, IconCrown, IconHistory, IconTrash, IconTrophy,
} from '@/components/icons';
import { Chip, EmptyState } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* STORICO CONDIVISO (#4.7b) — un componente per tutti i contesti, card
   parametrica su `voce.kind`: 'poker' (ranking netto + settlement) / 'gioco'
   (sessione + partite/esiti). Filtro nome SECCO (le voci senza il nome
   spariscono). Espandi/collassa locale con chiave `${kind}:${id}`. */
interface Props {
  lega: Lega;
  voci: VoceStorico[];
  query?: string;
}

export default function StoricoLista({ lega, voci, query = '' }: Props) {
  const t = useTheme();
  const eliminaPartita = useStore((s) => s.eliminaPartita);
  const eliminaSessioneGioco = useStore((s) => s.eliminaSessioneGioco);
  const toggleSettlementPaid = useStore((s) => s.toggleSettlementPaid);
  const toast = useStore((s) => s.toast);
  const [aperte, setAperte] = useState<Set<string>>(new Set());

  const nome = (id: number) => getNome(lega, id);
  const nomeGioco = (id: string) =>
    GIOCHI_PREIMPOSTATI.find((g) => g.id === id)?.nome ??
    lega.giochi?.find((g) => g.id === id)?.nome ?? 'Gioco';
  const iconaGioco = (id: string) => GIOCHI_PREIMPOSTATI.find((g) => g.id === id)?.icona ?? 'mazzo';

  const filtrate = filtraStoricoPerNome(voci, query, nome);

  function toggle(key: string) {
    setAperte((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  /* ── Card POKER ── */
  function renderPoker(partita: Partita) {
    const key = `poker:${partita.id}`;
    const isOpen = aperte.has(key);
    const ranking = partita.giocatori.slice().sort((a, b) => b.netto_finale - a.netto_finale);
    const tipo = partita.modalita === 'torneo' ? 'Torneo' : 'Cash';
    const vincitore = partita.giocatori.find((g) => g.vincitore);
    const vincitoreNome = vincitore ? nome(vincitore.id_nome) : null;

    function doElimina() {
      Alert.alert('Eliminare la partita?', "L'operazione è irreversibile.", [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: () => { eliminaPartita(lega.id, partita.id); toast('Partita eliminata'); } },
      ]);
    }

    return (
      <View key={key} style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Pressable style={styles.head} onPress={() => toggle(key)}>
          <View style={styles.grow}>
            <Text style={[styles.headTitle, { color: t.text }]}>{tipo} · {fmtData(partita.data)}</Text>
            <Text style={[styles.headSub, { color: t.textMuted }]}>{partita.giocatori.length} giocatori · {partita.ora_inizio}–{partita.ora_fine}</Text>
          </View>
          <Pressable hitSlop={8} onPress={doElimina} style={styles.icBtn}><IconTrash size={15} color={t.textMuted} /></Pressable>
          {isOpen ? <IconChevronUp size={16} color={t.textMuted} /> : <IconChevronDown size={16} color={t.textMuted} />}
        </Pressable>

        {vincitoreNome && (
          <View style={[styles.winnerBar, { backgroundColor: t.warnSoft }]}>
            <IconTrophy size={14} color={t.warn} />
            <Text style={[styles.winnerText, { color: t.warn }]}>Vincitore: {vincitoreNome}</Text>
          </View>
        )}

        {isOpen && (
          <View style={styles.body}>
            <View style={[styles.trHead, { borderBottomColor: t.border }]}>
              <Text style={[styles.tPos, { color: t.textMuted }]}>#</Text>
              <Text style={[styles.tNome, { color: t.textMuted }]}>Giocatore</Text>
              <Text style={[styles.tNum, { color: t.textMuted }]}>Buy-in</Text>
              <Text style={[styles.tNum, { color: t.textMuted }]}>Netto</Text>
            </View>
            {ranking.map((g, i) => (
              <View key={g.id_nome} style={styles.tr}>
                <Text style={[styles.tPos, { color: t.textMuted }]}>{i + 1}</Text>
                <View style={styles.tNomeCell}>
                  <Text style={[styles.tNomeText, { color: t.text }]} numberOfLines={1}>{nome(g.id_nome)}</Text>
                  {vincitore?.id_nome === g.id_nome ? <IconCrown size={14} color={t.warn} /> : null}
                </View>
                <Text style={[styles.tNum, { color: t.text }]}>{euro(g.entrate)}</Text>
                <Text style={[styles.tNum, { color: g.netto_finale >= 0 ? t.ok : t.danger }]}>{euro(g.netto_finale)}</Text>
              </View>
            ))}

            {partita.settlements.length > 0 && (
              <View style={styles.pills}>
                {partita.settlements.map((s, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => toggleSettlementPaid(lega.id, partita.id, idx)}
                    style={[styles.pill, { borderColor: t.border, backgroundColor: s.pagato ? t.okSoft : t.dangerSoft }]}
                  >
                    <Text style={[styles.pillText, { color: s.pagato ? t.ok : t.danger }]}>
                      {nome(s.from)} → {nome(s.to)} {euro(s.amount)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  /* ── Card GIOCO ── */
  function esitoLabel(sess: SessioneGioco) {
    const e = esitoSessione(sess);
    if (e.pareggio) return <Chip tone="warn">Pareggio</Chip>;
    return <Chip tone="ok">Vince {e.vincitori.map(nome).join(', ')}</Chip>;
  }

  function esitoPartita(p: PartitaGioco) {
    if (partitaInCorso(p)) return <Chip tone="muted">non conclusa</Chip>;
    if (p.pareggio) return <Chip tone="warn">Pareggio</Chip>;
    if (p.vincitori.length === 0) return <Chip tone="muted">Nessun vincitore</Chip>;
    return <Chip tone="ok">{p.vincitori.map(nome).join(', ')}</Chip>;
  }

  function renderGioco(sess: SessioneGioco) {
    const key = `gioco:${sess.id}`;
    const aperta = aperte.has(key);

    function doElimina() {
      Alert.alert('Eliminare la sessione?', 'Verrà rimossa dallo storico.', [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: () => eliminaSessioneGioco(lega.id, sess.id) },
      ]);
    }

    return (
      <View key={key} style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Pressable style={styles.head} onPress={() => toggle(key)}>
          <GameIcon icona={iconaGioco(sess.giocoId)} size={22} color={t.accent} />
          <View style={styles.grow}>
            <Text style={[styles.headTitle, { color: t.text }]}>{nomeGioco(sess.giocoId)}</Text>
            <Text style={[styles.headSub, { color: t.textMuted }]}>
              {fmtData(sess.data)} · {sess.ora_inizio}–{sess.ora_fine} · {sess.partite.length} {sess.partite.length === 1 ? 'partita' : 'partite'}
            </Text>
          </View>
          {esitoLabel(sess)}
          {aperta ? <IconChevronUp size={18} color={t.textMuted} /> : <IconChevronDown size={18} color={t.textMuted} />}
        </Pressable>

        {aperta && (
          <View style={styles.body}>
            {sess.partite.length === 0 ? (
              <Text style={[styles.hint, { color: t.textMuted }]}>Nessuna partita giocata.</Text>
            ) : (
              sess.partite.map((p) => (
                <View key={p.id} style={[styles.partita, { borderBottomColor: t.border }]}>
                  <Text style={[styles.partN, { color: t.text }]}>Partita {p.id}</Text>
                  <Text style={[styles.partOre, { color: t.textMuted }]}>{p.ora_inizio}–{p.ora_fine}</Text>
                  <View style={styles.partEsito}>
                    {esitoPartita(p)}
                    {p.nomeLibero ? <Chip tone="muted">{p.nomeLibero}</Chip> : null}
                  </View>
                </View>
              ))
            )}
            <Pressable onPress={doElimina} style={styles.delBtn}>
              <IconTrash size={15} color={t.danger} />
              <Text style={[styles.delText, { color: t.danger }]}>Elimina sessione</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  if (filtrate.length === 0) {
    const q = query.trim();
    return (
      <EmptyState
        icon={<IconHistory size={48} color={t.textMuted} />}
        title={q ? `Nessun risultato per "${q}"` : 'Storico vuoto'}
        hint={q ? 'Nessuna partita o sessione coinvolge questo nome.' : 'Le partite e le sessioni concluse compaiono qui.'}
      />
    );
  }

  return (
    <View style={styles.list}>
      {filtrate.map((voce) => (voce.kind === 'poker' ? renderPoker(voce.partita) : renderGioco(voce.sessione)))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  grow: { flex: 1 },
  headTitle: { fontSize: 15, fontWeight: '700' },
  headSub: { fontSize: 12, marginTop: 2 },
  icBtn: { padding: 4 },
  winnerBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12 },
  winnerText: { fontSize: 13, fontWeight: '600' },
  body: { paddingHorizontal: 12, paddingBottom: 12 },
  trHead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  tPos: { width: 22, fontSize: 12, fontWeight: '700' },
  tNome: { flex: 1, fontSize: 11, fontWeight: '700' },
  tNomeCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  tNomeText: { fontSize: 13, flexShrink: 1 },
  tNum: { width: 58, fontSize: 12, textAlign: 'right' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  pill: { borderWidth: 1, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  pillText: { fontSize: 12, fontWeight: '600' },
  hint: { fontSize: 13, fontStyle: 'italic', paddingVertical: 6 },
  partita: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, flexWrap: 'wrap' },
  partN: { fontSize: 13, fontWeight: '600' },
  partOre: { fontSize: 12 },
  partEsito: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' },
  delBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 10, marginTop: 8 },
  delText: { fontSize: 14, fontWeight: '600' },
});
