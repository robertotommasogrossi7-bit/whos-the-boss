import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  classificaPokerCrossContesto,
  classificaUnificata,
  euroSigned,
  GIOCHI_PREIMPOSTATI,
  resolveGiocoGlobale,
  statsPersonaCrossContesto,
  type ClassificaU,
} from '@whos-the-boss/core';

import ClassificaTable from '@/components/classifica/ClassificaTable';
import FiltroNome from '@/components/classifica/FiltroNome';
import GameBar from '@/components/GameBar';
import { GameIcon, IconChevronDown, IconChevronUp, IconTrophy } from '@/components/icons';
import { Card, EmptyState } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* CLASSIFICA globale / Personale (#4.7a) — port nativo di ClassificaShell.
   Parametrica sul gioco della GameBar (poker incluso). */
export default function ClassificaScreen() {
  const t = useTheme();
  const giocoFiltro = useStore((s) => s.giocoFiltro);
  const utente = useStore((s) => s.utente);
  const leghe = useStore((s) => s.db.leghe);

  const [persona, setPersona] = useState(utente?.username ?? '');
  const [breakdownAperto, setBreakdownAperto] = useState(false);
  const [query, setQuery] = useState('');

  const isPoker = giocoFiltro === 'poker';
  const gioco = isPoker ? null : resolveGiocoGlobale(giocoFiltro);
  const legaPersonale = leghe.find((l) => l.personale);
  const icona = (id: string) => GIOCHI_PREIMPOSTATI.find((g) => g.id === id)?.icona ?? 'mazzo';

  if (!isPoker && !gioco) {
    return (
      <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: t.bg }]}>
        <GameBar />
        <View style={styles.pad}>
          <EmptyState icon={<IconTrophy size={48} color={t.textMuted} />} title="Seleziona un gioco" hint="Usa la barra in alto per scegliere un gioco." />
        </View>
      </SafeAreaView>
    );
  }

  const nomeGioco = isPoker ? 'Poker' : gioco!.nome;
  const iconaGioco = isPoker ? 'picche' : icona(gioco!.id);

  const personaTrim = persona.trim();
  const pokerCross = isPoker && personaTrim ? classificaPokerCrossContesto(personaTrim, leghe) : null;
  const giocoCross = !isPoker && personaTrim ? statsPersonaCrossContesto(personaTrim, gioco!, leghe) : null;
  const haSituazione = (pokerCross?.perContesto.length ?? 0) > 0 || (giocoCross?.perContesto.length ?? 0) > 0;

  const classificaPers: ClassificaU = legaPersonale
    ? classificaUnificata(legaPersonale, isPoker ? 'poker' : gioco!.id)
    : { tipo: isPoker ? 'soldi' : 'punti', righe: [] };
  const haPersonale = classificaPers.righe.some((r) =>
    r.kpi.tipo === 'soldi' ? r.kpi.partiteGiocate > 0 : r.kpi.stats.partiteGiocate > 0,
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: t.bg }]}>
      <GameBar />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.secHdr, { color: t.text }]}>La tua situazione</Text>

        <View style={[styles.personaBar, { backgroundColor: t.surface2, borderColor: t.border }]}>
          <Text style={[styles.personaLabel, { color: t.textMuted }]}>Persona</Text>
          <TextInput
            style={[styles.personaInput, { color: t.text }]}
            value={persona}
            onChangeText={setPersona}
            placeholder="Nome giocatore…"
            placeholderTextColor={t.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {haSituazione ? (
          <>
            <Card>
              <View style={styles.totaleTitle}>
                <GameIcon icona={iconaGioco} size={18} color={t.accent} />
                <Text style={[styles.totaleTitleText, { color: t.text }]}>{nomeGioco} — tutti i contesti</Text>
              </View>
              <View style={styles.totaleStats}>
                {isPoker ? (
                  <>
                    <StatBig value={euroSigned(pokerCross!.totale.netto)} label="netto €" color={pokerCross!.totale.netto >= 0 ? t.ok : t.danger} />
                    <StatBig value={`${pokerCross!.totale.percVittorie}%`} label="% vinte" color={t.text} />
                    <StatBig value={String(pokerCross!.totale.partite)} label="partite" color={t.text} />
                  </>
                ) : (
                  <>
                    <StatBig value={`${giocoCross!.totale.percVittorie}%`} label="% vinte" color={t.text} />
                    <StatBig value={String(giocoCross!.totale.partiteGiocate)} label="partite" color={t.text} />
                    <StatBig value={String(giocoCross!.totale.sessioniVinte)} label="sess. vinte" color={t.text} />
                  </>
                )}
              </View>
            </Card>

            <Pressable onPress={() => setBreakdownAperto((o) => !o)} style={styles.breakToggle}>
              <Text style={[styles.breakToggleText, { color: t.accent }]}>Dettaglio per contesto</Text>
              {breakdownAperto ? <IconChevronUp size={16} color={t.accent} /> : <IconChevronDown size={16} color={t.accent} />}
            </Pressable>

            {breakdownAperto && (
              <View style={styles.breakdown}>
                {isPoker
                  ? pokerCross!.perContesto.map((ctx) => (
                      <View key={ctx.legaId} style={[styles.ctx, { borderColor: t.border }]}>
                        <Text style={[styles.ctxNome, { color: t.text }]}>{ctx.personale ? 'Personale' : ctx.legaNome}</Text>
                        <View style={styles.ctxStats}>
                          <Text style={{ color: ctx.netto >= 0 ? t.ok : t.danger, fontWeight: '700' }}>{euroSigned(ctx.netto)}</Text>
                          <Text style={[styles.ctxSub, { color: t.textMuted }]}>{ctx.partite} partite · {ctx.vittorie} vinte</Text>
                        </View>
                      </View>
                    ))
                  : giocoCross!.perContesto.map((ctx) => (
                      <View key={ctx.legaId} style={[styles.ctx, { borderColor: t.border }]}>
                        <Text style={[styles.ctxNome, { color: t.text }]}>{ctx.personale ? 'Personale' : ctx.legaNome}</Text>
                        <View style={styles.ctxStats}>
                          <Text style={{ color: t.text, fontWeight: '700' }}>{ctx.stats.percVittorie}%</Text>
                          <Text style={[styles.ctxSub, { color: t.textMuted }]}>{ctx.stats.partiteGiocate} partite · {ctx.stats.sessioniVinte} sess. vinte</Text>
                        </View>
                      </View>
                    ))}
              </View>
            )}
          </>
        ) : personaTrim ? (
          <EmptyState icon={<IconTrophy size={44} color={t.textMuted} />} title={`"${persona}" non trovato`} hint={`Nessuna partita a ${nomeGioco} trovata per questo nome.`} />
        ) : (
          <EmptyState icon={<IconTrophy size={44} color={t.textMuted} />} title="Inserisci un nome" hint="Scrivi il tuo nome (o quello di un altro giocatore) per vedere le statistiche aggregate." />
        )}

        <View style={styles.sec2Hdr}>
          <Text style={[styles.secHdr, { color: t.text }]}>Classifica Personale</Text>
          <Text style={[styles.sec2Sub, { color: t.textMuted }]}>{nomeGioco}</Text>
        </View>

        {!haPersonale ? (
          <EmptyState icon={<IconTrophy size={40} color={t.textMuted} />} title="Nessuna partita Personale" hint={`Gioca ${isPoker ? 'serate di poker' : `sessioni di ${nomeGioco}`} dalla Home per vedere la classifica.`} />
        ) : (
          <>
            <FiltroNome value={query} onChange={setQuery} />
            <ClassificaTable classifica={classificaPers} query={query} />
          </>
        )}

        <Text style={[styles.nota, { color: t.textMuted }]}>
          L'identità tra leghe è per nome (pre-backend): stesso nome = stessa persona. Sarà esatta con l'autenticazione.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBig({ value, label, color }: { value: string; label: string; color: string }) {
  const t = useTheme();
  return (
    <View style={styles.statBig}>
      <Text style={[styles.statBigVal, { color }]}>{value}</Text>
      <Text style={[styles.statBigLbl, { color: t.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { padding: 16 },
  content: { padding: 16, gap: 12 },
  secHdr: { fontSize: 18, fontWeight: '800' },
  personaBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
  personaLabel: { fontSize: 13, fontWeight: '600' },
  personaInput: { flex: 1, fontSize: 15, paddingVertical: 8 },
  totaleTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  totaleTitleText: { fontSize: 14, fontWeight: '700' },
  totaleStats: { flexDirection: 'row' },
  statBig: { flex: 1, alignItems: 'center', gap: 2 },
  statBigVal: { fontSize: 20, fontWeight: '800' },
  statBigLbl: { fontSize: 11 },
  breakToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  breakToggleText: { fontSize: 14, fontWeight: '600' },
  breakdown: { gap: 8 },
  ctx: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, padding: 12 },
  ctxNome: { fontSize: 14, fontWeight: '700' },
  ctxStats: { alignItems: 'flex-end' },
  ctxSub: { fontSize: 12, marginTop: 2 },
  sec2Hdr: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 },
  sec2Sub: { fontSize: 13 },
  nota: { fontSize: 12, lineHeight: 17, marginTop: 8 },
});
