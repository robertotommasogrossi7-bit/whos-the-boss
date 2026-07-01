import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  classificaSerata, esitoSessione, fmtData, getNome, GIOCHI_PREIMPOSTATI, nowHHMM,
  sessioniDiSerata, trovaSerata, vincitoriSerata,
} from '@whos-the-boss/core';

import { GameIcon, IconChevronLeft, IconChevronRight, IconCrown, IconPlus } from '@/components/icons';
import Placeholder from '@/components/Placeholder';
import { Button, Card, Chip, EmptyState, Sheet } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* HUB SERATA MULTI-GIOCO (R4c) — schermata piena (il "posto dove si torna"):
   classifica della serata (regola R4a) + giochi giocati con esito + "Aggiungi
   gioco" in basso (thumb zone). Ogni gioco è una SessioneGioco a sé, legata
   dal serataId. Il poker resta fuori (serata a parte). */
export default function SerataHub() {
  const t = useTheme();
  const { legaId, serataId } = useLocalSearchParams<{ legaId: string; serataId: string }>();
  const legaIdN = Number(legaId);
  const serataIdN = Number(serataId);
  const lega = useStore((s) => s.db.leghe.find((l) => l.id === legaIdN));
  const creaSessioneGioco = useStore((s) => s.creaSessioneGioco);
  const avviaSessioneGioco = useStore((s) => s.avviaSessioneGioco);
  const [picker, setPicker] = useState(false);

  if (!lega) return <Placeholder title="Lega non trovata" hint="Torna indietro e riprova." />;
  const serata = trovaSerata(lega, serataIdN);
  if (!serata) return <Placeholder title="Serata non trovata" hint="Torna indietro e riprova." />;

  const sessioni = sessioniDiSerata(lega, serataIdN);
  const classifica = classificaSerata(lega, serataIdN);
  const vincitori = vincitoriSerata(lega, serataIdN);
  const nome = (id: number) => getNome(lega, id);
  const giochiDisponibili = GIOCHI_PREIMPOSTATI.filter((g) => g.id !== 'poker');

  const aggiungiGioco = (giocoId: string) => {
    setPicker(false);
    const id = creaSessioneGioco(lega.id, giocoId, serata.partecipanti, serata.data, nowHHMM(), serataIdN);
    if (id == null) return;
    avviaSessioneGioco(lega.id, id);
    router.push({ pathname: '/gioco/[legaId]/[giocoId]', params: { legaId: String(lega.id), giocoId } });
  };

  const apriGioco = (giocoId: string) =>
    router.push({ pathname: '/gioco/[legaId]/[giocoId]', params: { legaId: String(lega.id), giocoId } });

  const senzaRisultati = classifica.every((r) => r.punti === 0);

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <IconChevronLeft size={24} color={t.text} />
        </Pressable>
        <View style={styles.grow}>
          <Text style={[styles.hTitle, { color: t.text }]} numberOfLines={1}>Serata multi-gioco</Text>
          <Text style={[styles.hSub, { color: t.textMuted }]}>
            {fmtData(serata.data)} · {serata.partecipanti.length} giocatori
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={[styles.cardTitle, { color: t.text }]}>Classifica serata</Text>
          {senzaRisultati ? (
            <Text style={[styles.muted, { color: t.textMuted }]}>
              Ancora nessun risultato. Aggiungi un gioco e inizia a giocare.
            </Text>
          ) : (
            classifica.map((r) => {
              const win = vincitori.includes(r.idNome);
              return (
                <View key={r.idNome} style={styles.rankRow}>
                  {win ? <IconCrown size={16} color={t.accent} /> : <View style={styles.crownGap} />}
                  <Text style={[styles.rankName, { color: t.text }]} numberOfLines={1}>{nome(r.idNome)}</Text>
                  <Text style={[styles.rankPts, { color: win ? t.accent : t.textMuted }]}>
                    {r.punti} {r.punti === 1 ? 'punto' : 'punti'}
                  </Text>
                </View>
              );
            })
          )}
        </Card>

        <Text style={[styles.secHdr, { color: t.text }]}>Giochi della serata</Text>
        {sessioni.length === 0 ? (
          <EmptyState title="Nessun gioco ancora" hint="Aggiungi il primo gioco della serata qui sotto." />
        ) : (
          sessioni.map((sess) => {
            const g = GIOCHI_PREIMPOSTATI.find((x) => x.id === sess.giocoId);
            const esito = esitoSessione(sess);
            const attiva = sess.stato !== 'chiusa';
            const esitoTxt = attiva
              ? 'in corso'
              : esito.pareggio
                ? 'Pareggio'
                : esito.vincitori.length ? `Vince ${esito.vincitori.map(nome).join(', ')}` : 'Nessun vincitore';
            return (
              <Pressable
                key={sess.id}
                onPress={() => apriGioco(sess.giocoId)}
                style={[styles.gameRow, { backgroundColor: t.surface, borderColor: t.border }]}
              >
                <GameIcon icona={g?.icona ?? 'mazzo'} size={26} color={t.accent} />
                <View style={styles.grow}>
                  <Text style={[styles.gameName, { color: t.text }]}>{g?.nome ?? sess.giocoId}</Text>
                  <Text style={[styles.gameEsito, { color: t.textMuted }]} numberOfLines={1}>{esitoTxt}</Text>
                </View>
                {attiva ? <Chip tone="accent">continua</Chip> : <IconChevronRight size={18} color={t.textMuted} />}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: t.border, backgroundColor: t.bg }]}>
        <Button block onPress={() => setPicker(true)}>
          <IconPlus size={18} color={t.accentInk} />
          <Text style={[styles.addLabel, { color: t.accentInk }]}>Aggiungi gioco</Text>
        </Button>
      </View>

      {picker && (
        <Sheet open onClose={() => setPicker(false)} title="Aggiungi gioco">
          <View style={styles.pickGrid}>
            {giochiDisponibili.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => aggiungiGioco(g.id)}
                style={[styles.pickTile, { backgroundColor: t.surface, borderColor: t.border }]}
              >
                <GameIcon icona={g.icona} size={30} color={t.accent} />
                <Text style={[styles.pickNome, { color: t.text }]} numberOfLines={1}>{g.nome}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.muted, { color: t.textMuted, marginTop: 10 }]}>
            Il poker si gioca come serata a parte.
          </Text>
        </Sheet>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  grow: { flex: 1 },
  hTitle: { fontSize: 18, fontWeight: '800' },
  hSub: { fontSize: 12, marginTop: 2 },
  content: { padding: 16, gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  muted: { fontSize: 13 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  crownGap: { width: 16 },
  rankName: { flex: 1, fontSize: 15, fontWeight: '600' },
  rankPts: { fontSize: 14, fontWeight: '700' },
  secHdr: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12 },
  gameName: { fontSize: 15, fontWeight: '700' },
  gameEsito: { fontSize: 12, marginTop: 2 },
  footer: { padding: 16, borderTopWidth: 1 },
  addLabel: { fontSize: 15, fontWeight: '700' },
  pickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pickTile: { width: '30%', flexGrow: 1, minWidth: 96, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, padding: 8 },
  pickNome: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
