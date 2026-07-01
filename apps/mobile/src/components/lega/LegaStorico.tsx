import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { GIOCHI_PREIMPOSTATI, vociStorico, type Lega } from '@whos-the-boss/core';

import FiltroNome from '@/components/classifica/FiltroNome';
import GiocoPills, { type OpzioneGioco } from '@/components/lega/GiocoPills';
import SerateLista from '@/components/serata/SerateLista';
import StoricoLista from '@/components/storico/StoricoLista';

/* STORICO di LEGA (#4.7b) — selettore gioco (Tutti / Poker / giochi con
   sessioni chiuse) + StoricoLista condivisa. */
export default function LegaStorico({ lega }: { lega: Lega }) {
  const [selId, setSelId] = useState('');
  const [query, setQuery] = useState('');

  const icona = (id: string) => GIOCHI_PREIMPOSTATI.find((g) => g.id === id)?.icona ?? 'mazzo';
  const nomeGioco = (id: string) =>
    GIOCHI_PREIMPOSTATI.find((g) => g.id === id)?.nome ?? lega.giochi?.find((g) => g.id === id)?.nome ?? 'Gioco';
  const sessChiuse = (lega.sessioniGioco ?? []).filter((s) => s.stato === 'chiusa');
  const giochiIds = [...new Set(sessChiuse.map((s) => s.giocoId))].filter((id) => id !== 'poker');
  const opzioni: OpzioneGioco[] = [
    { id: '', nome: 'Tutti', icona: null },
    ...(lega.partite.length > 0 ? [{ id: 'poker', nome: 'Poker', icona: icona('poker') }] : []),
    ...giochiIds.map((id) => ({ id, nome: nomeGioco(id), icona: icona(id) })),
  ];

  const voci = vociStorico(lega, { giocoId: selId || undefined });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SerateLista lega={lega} />
      {opzioni.length > 1 ? <GiocoPills opzioni={opzioni} attivo={selId} onSel={(id) => { setSelId(id); setQuery(''); }} /> : null}
      {voci.length > 0 ? <FiltroNome value={query} onChange={setQuery} /> : null}
      <StoricoLista lega={lega} voci={voci} query={query} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: 16, gap: 12 } });
