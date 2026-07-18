import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChangeEmailSheet, ChangePasswordSheet } from '@/components/auth/CredentialSheets';
import { IconChevronRight, IconLogout } from '@/components/icons';
import { Avatar, Button, Card, ListRow } from '@/components/ui';
import { descriviEsitoSync, sincronizzaProponendoAdozione } from '@/lib/sync';
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
  const toast = useStore((s) => s.toast);
  const ultimoSyncAlle = useStore((s) => s.ultimoSyncAlle);

  const [sheet, setSheet] = useState<null | 'pwd' | 'email'>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [syncInCorso, setSyncInCorso] = useState(false);

  // R7.4d: sync manuale (P.5). Il grosso del lavoro lo fanno i trigger
  // automatici (boot/foreground): questo bottone serve per il "adesso!"
  // e per rivedere la proposta di adozione se era stata rimandata.
  async function doSync() {
    if (syncInCorso) return;
    setSyncInCorso(true);
    const esito = await sincronizzaProponendoAdozione({ manuale: true });
    setSyncInCorso(false);
    const msg = descriviEsitoSync(esito);
    if (msg) toast(msg);
  }

  function doLogout() {
    Alert.alert('Esci dall’account', 'La sessione verra’ chiusa su questo dispositivo.', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: () => { logout(); } },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.wrap}>
      <View style={styles.head}>
        <Avatar nome={utente?.displayName ?? utente?.username} size="lg" />
        <Text style={[styles.name, { color: t.text }]}>{utente?.displayName ?? utente?.username ?? 'Utente'}</Text>
        {utente?.displayName && utente?.username
          ? <Text style={[styles.handle, { color: t.textMuted }]}>@{utente.username}</Text>
          : null}
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

      <Card style={styles.card}>
        <Text style={[styles.section, { color: t.textMuted }]}>DATI</Text>
        <ListRow
          title={syncInCorso ? 'Sincronizzo…' : 'Sincronizza ora'}
          subtitle={ultimoSyncAlle ? `Ultimo sync alle ${ultimoSyncAlle}` : 'Allinea questo telefono col tuo account'}
          right={<IconChevronRight size={18} color={t.textMuted} />}
          onPress={doSync}
        />
        <ListRow
          title="Carica i dati sul tuo account"
          subtitle="Una volta sola: li ritrovi sugli altri dispositivi"
          right={<IconChevronRight size={18} color={t.textMuted} />}
          onPress={() => router.push('/carica-dati')}
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
  handle: { fontSize: 14, fontWeight: '600' },
  email: { fontSize: 14 },
  card: { gap: 10 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  okBanner: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  logoutLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
