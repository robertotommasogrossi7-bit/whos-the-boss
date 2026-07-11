import { router } from 'expo-router';
import { Component, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

/* Rete di sicurezza globale: cattura gli errori di RENDER di qualsiasi schermata
   e mostra il messaggio invece di far crashare tutta l'app. Colori hardcoded
   (tema scuro) apposta: deve funzionare anche se il crash è vicino al tema.
   Gli errori async (dentro handler/effect) NON passano di qui — per quelli
   servono i try/catch nei punti giusti. */
interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary] crash di render:', error);
  }

  private recupera = () => {
    // Torna alla home e ripulisce l'errore: così esci dalla schermata rotta
    // invece di ri-crashare subito ri-renderizzandola.
    try { router.replace('/(tabs)'); } catch { /* no-op */ }
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Qualcosa è andato storto</Text>
          <Text style={styles.hint}>
            Una schermata ha avuto un problema. L'app è ancora viva: torna alla home e riprova.
          </Text>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Dettaglio (mandamelo se si ripete):</Text>
            <Text style={styles.err} selectable>{error.message || String(error)}</Text>
          </View>
          <Pressable onPress={this.recupera} style={styles.btn}>
            <Text style={styles.btnText}>Torna alla home</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#0e0f12' },
  content: { padding: 24, paddingTop: 80, gap: 16 },
  title: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  hint: { color: '#b9b9c0', fontSize: 15, lineHeight: 21 },
  box: { backgroundColor: '#1a1b1f', borderRadius: 12, padding: 14, gap: 6 },
  boxLabel: { color: '#8a8a92', fontSize: 12, fontWeight: '600' },
  err: { color: '#ff6b6b', fontSize: 13, fontFamily: 'monospace' },
  btn: { backgroundColor: '#2f6bd8', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
