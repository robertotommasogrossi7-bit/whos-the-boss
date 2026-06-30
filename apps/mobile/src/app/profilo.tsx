import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconLogout } from '@/components/icons';
import { Avatar, Button, Card } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* PROFILO (R2.5) — info account + Logout. Cambio email/password in arrivo (R2.6).
   Al logout lo store azzera `utente` (auth listener Supabase) e il gate del root
   _layout torna alla LoginScreen: questa schermata si smonta da sola, niente
   navigazione manuale. */
export default function ProfiloScreen() {
  const t = useTheme();
  const utente = useStore((s) => s.utente);
  const logout = useStore((s) => s.logout);

  function doLogout() {
    Alert.alert('Esci dall’account', 'La sessione verra’ chiusa su questo dispositivo.', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: () => { logout(); } },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.wrap}>
      <View style={styles.head}>
        <Avatar nome={utente?.username} size="lg" />
        <Text style={[styles.name, { color: t.text }]}>{utente?.username ?? 'Utente'}</Text>
        {utente?.email ? <Text style={[styles.email, { color: t.textMuted }]}>{utente.email}</Text> : null}
      </View>

      <Card style={styles.card}>
        <Text style={[styles.section, { color: t.textMuted }]}>SICUREZZA</Text>
        <Text style={[styles.soon, { color: t.textMuted }]}>
          Cambio email e password in arrivo.
        </Text>
      </Card>

      <Button block variant="danger" onPress={doLogout}>
        <IconLogout size={18} color="#FFFFFF" />
        <Text style={styles.logoutLabel}>Esci</Text>
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 16 },
  head: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  name: { fontSize: 20, fontWeight: '800' },
  email: { fontSize: 14 },
  card: { gap: 8 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  soon: { fontSize: 14 },
  logoutLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
