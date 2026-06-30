import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { classificaUnificata, GIOCHI_PREIMPOSTATI, resolveGiocoLega, type Lega } from '@whos-the-boss/core';

import ClassificaTable from '@/components/classifica/ClassificaTable';
import FiltroNome from '@/components/classifica/FiltroNome';
import { IconTrophy } from '@/components/icons';
import GiocoPills, { type OpzioneGioco } from '@/components/lega/GiocoPills';
import { EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

/* CLASSIFICA di LEGA (#4.7a) — selettore gioco (poker + giochi con sessioni
   chiuse) + ClassificaTable condivisa. */
export default function LegaClassifica({ lega }: { lega: Lega }) {
  const t = useTheme();
  const [selId, setSelId] = useState('');
  const [query, setQuery] = useState('');

  const icona = (id: string) => GIOCHI_PREIMPOSTATI.find((g) => g.id === id)?.icona ?? 'mazzo';
  const sessChiuse = (lega.sessioniGioco ?? []).filter((s) => s.stato === 'chiusa');
  const giochiIds = [...new Set(sessChiuse.map((s) => s.giocoId))].filter((id) => id !== 'poker');
  const opzioni: OpzioneGioco[] = [
    ...(lega.partite.length > 0 ? [{ id: 'poker', nome: 'Poker', icona: icona('poker') }] : []),
    ...giochiIds.flatMap((id) => {
      const g = resolveGiocoLega(id, lega);
      return g ? [{ id, nome: g.nome, icona: icona(id) }] : [];
    }),
  ];

  if (opzioni.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState icon={<IconTrophy size={48} color={t.textMuted} />} title="Nessuna partita giocata" hint="Gioca e chiudi qualche partita: qui comparirà la classifica." />
      </ScrollView>
    );
  }

  const giocoAttivoId = selId && opzioni.some((o) => o.id === selId) ? selId : opzioni[0]!.id;
  const nomeAttivo = opzioni.find((o) => o.id === giocoAttivoId)?.nome ?? 'questo gioco';
  const classifica = classificaUnificata(lega, giocoAttivoId);
  const haDati = classifica.righe.some((r) => (r.kpi.tipo === 'soldi' ? r.kpi.partiteGiocate > 0 : r.kpi.stats.partiteGiocate > 0));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <GiocoPills opzioni={opzioni} attivo={giocoAttivoId} onSel={(id) => { setSelId(id); setQuery(''); }} />
      {!haDati ? (
        <EmptyState icon={<IconTrophy size={44} color={t.textMuted} />} title={`Nessuna partita a ${nomeAttivo}`} hint="Gioca e chiudi qualche partita per vedere la classifica." />
      ) : (
        <>
          <FiltroNome value={query} onChange={setQuery} />
          <ClassificaTable classifica={classifica} query={query} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: 16, gap: 12 } });
