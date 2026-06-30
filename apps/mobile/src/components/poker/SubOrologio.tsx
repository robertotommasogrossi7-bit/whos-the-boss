import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { calcolaMontepremi, euro, type Lega, type Sessione } from '@whos-the-boss/core';

import { IconCheck, IconLock, IconPause, IconPlay, IconSkip, IconStop } from '@/components/icons';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Sub-tab OROLOGIO (torneo) — timer card + controlli + reg banner + stats.
   Il clock arriva da LiveTorneo (gestisce il timer su tutti i sub-tab). */
export default function SubOrologio({ lega, sess, clockStr }: { lega: Lega; sess: Sessione; clockStr: string }) {
  const t = useTheme();
  const avviaTorneo = useStore((s) => s.avviaTorneo);
  const pausaTorneo = useStore((s) => s.pausaTorneo);
  const riprendiTorneo = useStore((s) => s.riprendiTorneo);
  const avanzaLivelloManuale = useStore((s) => s.avanzaLivelloManuale);
  const stopTorneo = useStore((s) => s.stopTorneo);

  const livello = sess.livelli[sess.livello_corrente];
  const isPausa = livello?.tipo === 'pausa';
  const gameLvlNum = sess.livelli.slice(0, sess.livello_corrente + 1).filter((l) => l.tipo === 'gioco').length;
  const totGameLevels = sess.livelli.filter((l) => l.tipo === 'gioco').length;

  let nextGioco: typeof livello | null = null;
  for (let i = sess.livello_corrente + 1; i < sess.livelli.length; i++) {
    if (sess.livelli[i]?.tipo === 'gioco') { nextGioco = sess.livelli[i] ?? null; break; }
  }

  let statusLbl = '';
  if (sess.stato === 'pre') statusLbl = 'PRE-TORNEO — premi Avvia';
  else if (sess.stato === 'attivo') statusLbl = isPausa ? 'PAUSA DI TORNEO' : `LIVELLO ${gameLvlNum} di ${totGameLevels}`;
  else if (sess.stato === 'pausa') statusLbl = 'PAUSA MANUALE';
  else if (sess.stato === 'concluso') statusLbl = 'TORNEO CONCLUSO';

  const entrati = sess.giocatori.filter((g) => g.entrato).length;
  const vivi = sess.giocatori.filter((g) => g.entrato && !g.eliminato).length;
  const monte = calcolaMontepremi(sess);
  const lateRegOpen = gameLvlNum <= sess.late_reg.fino_a_livello;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.timerCard, { backgroundColor: t.surface, borderColor: isPausa ? t.warn : t.accent }]}>
        <Text style={[styles.level, { color: t.textMuted }]}>{statusLbl}</Text>
        <Text style={[styles.clock, { color: t.text }]}>{clockStr}</Text>

        {isPausa ? (
          <Text style={[styles.blinds, { color: t.accent }]}>Break</Text>
        ) : livello ? (
          <Text style={[styles.blinds, { color: t.accent }]}>
            {livello.sb.toLocaleString('it-IT')} / {livello.bb.toLocaleString('it-IT')}{livello.ante > 0 ? `  ·  ante ${livello.ante.toLocaleString('it-IT')}` : ''}
          </Text>
        ) : null}

        {nextGioco ? (
          <Text style={[styles.next, { color: t.textMuted }]}>
            Prossimo: {nextGioco.sb.toLocaleString('it-IT')} / {nextGioco.bb.toLocaleString('it-IT')}{nextGioco.ante > 0 ? ` · ante ${nextGioco.ante.toLocaleString('it-IT')}` : ''}
          </Text>
        ) : sess.livello_corrente >= sess.livelli.length - 1 ? (
          <Text style={[styles.next, { color: t.textMuted }]}>Ultimo livello</Text>
        ) : null}

        <View style={styles.controls}>
          {sess.stato === 'pre' && (
            <TcBtn primary label="Avvia torneo" icon={<IconPlay size={14} color={t.accentInk} />} onPress={() => avviaTorneo(lega.id)} />
          )}
          {sess.stato === 'attivo' && (
            <>
              <TcBtn label="Pausa" icon={<IconPause size={14} color={t.text} />} onPress={() => pausaTorneo(lega.id)} />
              <TcBtn label="Prossimo" icon={<IconSkip size={14} color={t.text} />} onPress={() => avanzaLivelloManuale(lega.id)} />
              <TcBtn label="Stop" icon={<IconStop size={14} color={t.text} />} onPress={() => stopTorneo(lega.id)} />
            </>
          )}
          {sess.stato === 'pausa' && (
            <>
              <TcBtn primary label="Riprendi" icon={<IconPlay size={14} color={t.accentInk} />} onPress={() => riprendiTorneo(lega.id)} />
              <TcBtn label="Stop" icon={<IconStop size={14} color={t.text} />} onPress={() => stopTorneo(lega.id)} />
            </>
          )}
          {sess.stato === 'concluso' && <Text style={[styles.note, { color: t.textMuted }]}>Procedi alla chiusura</Text>}
        </View>
      </View>

      <View style={[styles.regBanner, { backgroundColor: lateRegOpen ? t.okSoft : t.surface2 }]}>
        {lateRegOpen ? <IconCheck size={16} color={t.ok} /> : <IconLock size={16} color={t.textMuted} />}
        <Text style={[styles.regText, { color: lateRegOpen ? t.ok : t.textMuted }]}>
          {lateRegOpen ? `Late reg aperta (fino a fine L${sess.late_reg.fino_a_livello})` : 'Late reg chiusa — montepremi consolidato'}
        </Text>
      </View>

      <View style={styles.statsBar}>
        <Stat label="Iscritti" value={String(entrati)} />
        <Stat label="In gioco" value={String(vivi)} />
        <Stat label="Montepremi" value={euro(monte)} />
      </View>
    </ScrollView>
  );
}

function TcBtn({ label, icon, onPress, primary }: { label: string; icon: ReactNode; onPress: () => void; primary?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.tcBtn, { backgroundColor: primary ? t.accent : t.surface2, borderColor: primary ? t.accent : t.border }]}>
      {icon}
      <Text style={[styles.tcText, { color: primary ? t.accentInk : t.text }]}>{label}</Text>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: t.textMuted }]}>{label}</Text>
      <Text style={[styles.statVal, { color: t.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  timerCard: { borderWidth: 1, borderRadius: 16, padding: 20, alignItems: 'center', gap: 6 },
  level: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  clock: { fontSize: 56, fontWeight: '800', fontVariant: ['tabular-nums'] },
  blinds: { fontSize: 18, fontWeight: '700' },
  next: { fontSize: 12 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 },
  tcBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  tcText: { fontSize: 13, fontWeight: '700' },
  note: { fontSize: 13, fontStyle: 'italic' },
  regBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  regText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  statsBar: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 11 },
  statVal: { fontSize: 18, fontWeight: '700' },
});
