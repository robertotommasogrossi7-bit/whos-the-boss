import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { calcolaSettlement, normalizzaNome } from '@whos-the-boss/core';

/* R0.3 — schermata "fondazione".
   Prova che il "cervello" condiviso (@whos-the-boss/core, TS puro) gira su React
   Native attraverso Metro: stessa logica della web, zero duplicazione.
   La UI vera arriva in R1; qui basta dimostrare che il core e' agganciato. */
const nomeNorm = normalizzaNome('  GiÙLià  Rossi ');
const settle = calcolaSettlement([
  { id_nome: 1, dovuto: 10, versato: 0, fiche: 0 },
  { id_nome: 2, dovuto: 10, versato: 10, fiche: 20 },
]);

export default function Home() {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.card}>
        <Text style={styles.brand}>Card Tracker</Text>
        <Text style={styles.subtitle}>fondazione React Native · R0.3</Text>

        <View style={styles.divider} />

        <Text style={styles.badge}>@whos-the-boss/core attivo via Metro</Text>

        <Text style={styles.label}>normalizzaNome()</Text>
        <Text style={styles.mono}>{nomeNorm}</Text>

        <Text style={styles.label}>calcolaSettlement() · trasferimenti</Text>
        <Text style={styles.mono}>{JSON.stringify(settle.trasferimenti)}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a3d2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f5132',
    borderColor: '#1c6b46',
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    gap: 8,
  },
  brand: {
    color: '#d4af37',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#9ec9b4',
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: '#1c6b46',
    marginVertical: 12,
  },
  badge: {
    color: '#0a3d2e',
    backgroundColor: '#d4af37',
    alignSelf: 'flex-start',
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  label: {
    color: '#9ec9b4',
    fontSize: 12,
    marginTop: 8,
  },
  mono: {
    color: '#ffe9a8',
    fontFamily: 'monospace',
    fontSize: 15,
  },
});
