import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChangeEmailSheet, ChangePasswordSheet } from '@/components/auth/CredentialSheets';
import { IconChevronRight, IconLogout } from '@/components/icons';
import { Avatar, Button, Card, ListRow } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* PROFILO (R2.5/R2.6) — info account, cambio password/email (Sheet) e Logout.
   Al logout lo store azzera `utente` (auth listener Supabase) e il gate del root
   _layout torna alla LoginScreen: questa schermata si smonta da sola, niente
   navigazione manuale. */
export default function ProfiloScreen() {
  const t = useTheme();
  const utente = useStore((s) => s.utente);
  const logout = useStore((s) => s.logout);

  const [sheet, setSheet] = useState<null | 'pwd' | 'email'>(null);
  const [ok, setOk] = useState<string | null>(null);

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
        {ok ? (
          <View style={[styles.okBanner, { backgroundColor: t.okSoft, borderColor: t.ok, borderRadius: t.radiusSm }]}>
            <Text style={{ color: t.ok, fontSize: 13 }}>{ok}</Text>
          </View>
        ) : null}
        <ListRow
          title="Cambia password"
          right={<IconChevronRight size={18} color={t.textMuted} />}
          onPress={() => { setOk(null); setSheet('pwd'); }}
        />
        <ListRow
          title="Cambia email"
          right={<IconChevronRight size={18} color={t.textMuted} />}
          onPress={() => { setOk(null); setSheet('email'); }}
        />
      </Card>

      <Button block variant="danger" onPress={doLogout}>
        <IconLogout size={18} color="#FFFFFF" />
        <Text style={styles.logoutLabel}>Esci</Text>
      </Button>

      <ChangePasswordSheet
        open={sheet === 'pwd'}
        onClose={() => setSheet(null)}
        onDone={(m) => { setSheet(null); setOk(m); }}
      />
      <ChangeEmailSheet
        open={sheet === 'email'}
        onClose={() => setSheet(null)}
        onDone={(m) => { setSheet(null); setOk(m); }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 16 },
  head: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  name: { fontSize: 20, fontWeight: '800' },
  email: { fontSize: 14 },
  card: { gap: 10 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  okBanner: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  logoutLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
