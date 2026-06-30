import type { ReactNode } from 'react';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  esitoSessione, fmtRelativeData, GIOCHI_PREIMPOSTATI, idBloccatiInclusi, partitaInCorso,
  type PartitaGioco,
} from '@whos-the-boss/core';

import SheetEsitoPartita from '@/components/gioco/SheetEsitoPartita';
import SheetNuovaSessione from '@/components/gioco/SheetNuovaSessione';
import { GameIcon, IconCheck, IconClock } from '@/components/icons';
import { Button, Card, Chip, EmptyState, Sheet } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* SCHERMATA COMUNE DEL GIOCO (M3) — "segna partita". Crea/avvia sessione,
   segna partite (vincitori/pareggio/partecipanti/nomeLibero), chiudi sessione.
   Usata nella Home (Personale) e nella rotta gioco di una lega. */
interface Props {
  legaId: number;
  giocoId: string;
}

export default function SchermataGioco({ legaId, giocoId }: Props) {
  const t = useTheme();
  const lega = useStore((s) => s.db.leghe.find((l) => l.id === legaId));
  const utente = useStore((s) => s.utente);
  const aggiungiPartita = useStore((s) => s.aggiungiPartita);
  const chiudiPartita = useStore((s) => s.chiudiPartita);
  const annullaPartita = useStore((s) => s.annullaPartita);
  const avviaSessioneGioco = useStore((s) => s.avviaSessioneGioco);
  const chiudiSessioneGioco = useStore((s) => s.chiudiSessioneGioco);
  const eliminaSessioneGioco = useStore((s) => s.eliminaSessioneGioco);

  const [openNuova, setOpenNuova] = useState(false);
  const [esitoPartitaId, setEsitoPartitaId] = useState<number | null>(null);
  const [openChiudi, setOpenChiudi] = useState(false);
  const [forzaPareggio, setForzaPareggio] = useState(false);

  if (!lega) return null;

  const gioco = GIOCHI_PREIMPOSTATI.find((g) => g.id === giocoId);
  const nomeGioco = gioco?.nome ?? 'Gioco';
  const icona = gioco?.icona ?? 'mazzo';
  const nome = (id: number) => lega.nomi.find((n) => n.id === id)?.nome ?? '?';
  const bloccati = idBloccatiInclusi(lega, utente?.username);

  const corrente = (lega.sessioniGioco ?? [])
    .filter((s) => s.giocoId === giocoId && s.stato !== 'chiusa')
    .sort((a, b) => b.id - a.id)[0] ?? null;

  if (!corrente) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState
          icon={<GameIcon icona={icona} size={48} color={t.accent} />}
          title={`Nessuna sessione di ${nomeGioco}`}
          hint="Crea una sessione, poi segna le partite con i tuoi amici."
          action={<Button onPress={() => setOpenNuova(true)}>+ Crea sessione</Button>}
        />
        {openNuova && (
          <SheetNuovaSessione lega={lega} giocoId={giocoId} onClose={() => setOpenNuova(false)} onCreated={() => setOpenNuova(false)} />
        )}
      </ScrollView>
    );
  }

  const renderHead = (sub: string, chip: ReactNode) => (
    <Card>
      <View style={styles.head}>
        <GameIcon icona={icona} size={30} color={t.accent} />
        <View style={styles.grow}>
          <Text style={[styles.headNome, { color: t.text }]}>{nomeGioco}</Text>
          <Text style={[styles.headSub, { color: t.textMuted }]}>{sub}</Text>
        </View>
        {chip}
      </View>
    </Card>
  );

  const renderPlayers = () => (
    <View style={styles.players}>
      {corrente.partecipanti.map((id) => (
        <View key={id} style={[styles.player, { backgroundColor: t.surface2 }]}>
          <Text style={[styles.playerText, { color: t.text }]}>{nome(id)}</Text>
        </View>
      ))}
    </View>
  );

  if (corrente.stato === 'pre') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        {renderHead(`Programmata · ${fmtRelativeData(corrente.data)}`, <Chip tone="muted">in attesa</Chip>)}
        {renderPlayers()}
        <Button block onPress={() => avviaSessioneGioco(legaId, corrente.id)}>Avvia sessione</Button>
        <Pressable
          onPress={() => Alert.alert('Eliminare la sessione programmata?', undefined, [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Elimina', style: 'destructive', onPress: () => eliminaSessioneGioco(legaId, corrente.id) },
          ])}
          style={styles.delBtn}
        >
          <Text style={[styles.delText, { color: t.danger }]}>Elimina sessione</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const inCorso = corrente.partite.find(partitaInCorso) ?? null;
  const chiuse = corrente.partite.filter((p) => !partitaInCorso(p));
  const esito = esitoSessione(corrente);

  const nuovaPartita = () => {
    const pid = aggiungiPartita(legaId, corrente.id);
    if (pid != null) setEsitoPartitaId(pid);
  };

  const esitoChip = (p: PartitaGioco) => {
    if (p.pareggio) return <Chip tone="warn">Pareggio</Chip>;
    if (p.vincitori.length === 0) return <Chip tone="muted">Nessun vincitore</Chip>;
    return <Chip tone="ok">{p.vincitori.map(nome).join(', ')}</Chip>;
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {renderHead(
        `${fmtRelativeData(corrente.data)} · ${corrente.partite.length} ${corrente.partite.length === 1 ? 'partita' : 'partite'}`,
        <Chip tone="accent">in corso</Chip>,
      )}
      {renderPlayers()}

      {inCorso ? (
        <Card style={{ borderColor: t.accent }}>
          <View style={styles.incorsoTop}>
            <IconClock size={18} color={t.accent} />
            <View style={styles.grow}>
              <Text style={[styles.headNome, { color: t.text }]}>Partita {inCorso.id} in corso</Text>
              <Text style={[styles.headSub, { color: t.textMuted }]}>dalle {inCorso.ora_inizio}</Text>
            </View>
          </View>
          <View style={styles.incorsoActions}>
            <Button variant="ghost" size="sm" onPress={() => annullaPartita(legaId, corrente.id, inCorso.id)}>Annulla</Button>
            <Button size="sm" onPress={() => setEsitoPartitaId(inCorso.id)}>Registra esito</Button>
          </View>
        </Card>
      ) : (
        <Button block onPress={nuovaPartita}>+ Nuova partita</Button>
      )}

      {chiuse.length > 0 && (
        <View style={styles.partite}>
          {chiuse.slice().reverse().map((p) => (
            <View key={p.id} style={[styles.partita, { backgroundColor: t.surface, borderColor: t.border }]}>
              <View style={styles.partitaHead}>
                <Text style={[styles.partitaN, { color: t.text }]}>Partita {p.id}</Text>
                <Text style={[styles.partitaOre, { color: t.textMuted }]}>{p.ora_inizio}–{p.ora_fine}</Text>
              </View>
              <View style={styles.partitaEsito}>
                {esitoChip(p)}
                {p.nomeLibero ? <Chip tone="muted">{p.nomeLibero}</Chip> : null}
              </View>
            </View>
          ))}
        </View>
      )}

      <Button variant="ghost" block disabled={!!inCorso} onPress={() => { setForzaPareggio(false); setOpenChiudi(true); }}>
        Chiudi sessione
      </Button>
      {inCorso ? <Text style={[styles.hint, { color: t.textMuted }]}>Chiudi la partita in corso prima di chiudere la sessione.</Text> : null}

      {esitoPartitaId != null && (
        <SheetEsitoPartita
          partecipantiSessione={corrente.partecipanti}
          nome={nome}
          bloccati={bloccati}
          onClose={() => setEsitoPartitaId(null)}
          onConfirm={(e) => { chiudiPartita(legaId, corrente.id, esitoPartitaId, e); setEsitoPartitaId(null); }}
        />
      )}

      {openChiudi && (
        <Sheet open onClose={() => setOpenChiudi(false)} title="Chiudi sessione">
          <Text style={[styles.hint, { color: t.textMuted, textAlign: 'left' }]}>
            {forzaPareggio || esito.pareggio ? 'La sessione si chiude in pareggio.' : `Vince ${esito.vincitori.map(nome).join(', ')} con più partite vinte.`}
          </Text>
          {!esito.pareggio && (
            <Pressable onPress={() => setForzaPareggio((v) => !v)} style={styles.toggle}>
              <View style={[styles.box, { borderColor: forzaPareggio ? t.accent : t.border, backgroundColor: forzaPareggio ? t.accent : 'transparent' }]}>
                {forzaPareggio ? <IconCheck size={14} color={t.accentInk} /> : null}
              </View>
              <Text style={[styles.toggleText, { color: t.text }]}>Forza pareggio</Text>
            </Pressable>
          )}
          <View style={styles.actions}>
            <Button variant="ghost" onPress={() => setOpenChiudi(false)}>Annulla</Button>
            <Button onPress={() => { chiudiSessioneGioco(legaId, corrente.id, forzaPareggio || esito.pareggio); setOpenChiudi(false); }}>Chiudi sessione</Button>
          </View>
        </Sheet>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  headNome: { fontSize: 16, fontWeight: '700' },
  headSub: { fontSize: 13, marginTop: 2 },
  players: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  player: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  playerText: { fontSize: 13, fontWeight: '600' },
  incorsoTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  incorsoActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  partite: { gap: 8 },
  partita: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  partitaHead: { flexDirection: 'row', justifyContent: 'space-between' },
  partitaN: { fontSize: 14, fontWeight: '700' },
  partitaOre: { fontSize: 12 },
  partitaEsito: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  delBtn: { alignItems: 'center', paddingVertical: 10 },
  delText: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 13, textAlign: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 15, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
});
