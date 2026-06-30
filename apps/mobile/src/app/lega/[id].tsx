import { useLocalSearchParams } from 'expo-router';

import Placeholder from '@/components/Placeholder';

/* Dettaglio lega (4 schede: Home/Classifica/Storico/Giocatori) — in arrivo.
   Per ora placeholder, raggiunto dalla lista Leghe (nav gia' funzionante). */
export default function LegaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Placeholder title={`Lega ${id}`} hint="Sezione lega a 4 schede · in arrivo (R1.4)" />;
}
