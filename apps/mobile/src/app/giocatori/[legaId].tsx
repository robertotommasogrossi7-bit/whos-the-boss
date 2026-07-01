import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import LegaGiocatori from '@/components/lega/LegaGiocatori';
import Placeholder from '@/components/Placeholder';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* ROSA GIOCATORI (R3) — gestione condivisa dei giocatori di una lega/Personale
   (aggiungi/rinomina/elimina, "sei tu"), FUORI dalla sessione poker: prima era
   annidata nella scheda "Giocatori" del poker, unico accesso per il Personale.
   Ora è un accesso a sé, come il "player database" delle app poker note
   (PokerBoss, Blinds Are Up!) e la sezione Players di BG Stats. */
export default function GiocatoriScreen() {
  const t = useTheme();
  const { legaId } = useLocalSearchParams<{ legaId: string }>();
  const idNum = Number(legaId);
  const lega = useStore((s) => s.db.leghe.find((l) => l.id === idNum));

  if (!lega) return <Placeholder title="Lega non trovata" hint="Torna indietro e riprova." />;

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <Stack.Screen options={{ title: lega.personale ? 'I tuoi giocatori' : 'Giocatori' }} />
      <LegaGiocatori lega={lega} />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
