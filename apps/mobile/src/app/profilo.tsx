import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChangeEmailSheet, ChangePasswordSheet } from '@/components/auth/CredentialSheets';
import { IconChevronRight, IconLogout } from '@/components/icons';
import { Avatar, Button, Card, ListRow } from '@/components/ui';
import { proponiAdozione } from '@/lib/sync';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

const SVILUPPATORE = 'Roberto Tommaso Grossi';
const EMAIL_ASSISTENZA = 'robertotommasogrossi7@gmail.com';
const buildInfo = (Constants.expoConfig?.extra as { buildInfo?: { commit: string; data: string } } | undefined)?.buildInfo;

/* PROFILO (R2.5/R2.6) — info account, cambio password/email (Sheet) e Logout.
   Al logout lo store azzera `utente` (auth listener Supabase) e il gate del root
   _layout torna alla LoginScreen: questa schermata si smonta da sola, niente
   navigazione manuale. */
export default function ProfiloScreen() {
  const t = useTheme();
  const utente = useStore((s) => s.utente);
  const logout = useStore((s) => s.logout);
  const statoSync = useStore((s) => s.statoSync);

  const [sheet, setSheet] = useState<null | 'pwd' | 'email'>(null);
  const [ok, setOk] = useState<string | null>(null);

  /* R7.4f — riga PASSIVA, non un pulsante: il sync è automatico (boot +
     ritorno in primo piano) e la prima semina pure. Qui si legge soltanto
     com'è andata; si tocca solo quando c'è davvero qualcosa da decidere o
     da leggere (pattern "Tutte le modifiche salvate" di Google Docs). */
  const avviso = statoSync.avviso;
  const testoSync = statoSync.inCorso ? 'Aggiornamento in corso…'
    : avviso?.tipo === 'adozione' ? 'Questo account ha già dei dati — tocca per scegliere'
    : avviso ? 'Non riesco a salvare sul tuo account — tocca per i dettagli'
    : statoSync.ultimoAlle ? `Dati salvati sul tuo account · aggiornato alle ${statoSync.ultimoAlle}`
    : 'In attesa del primo aggiornamento…';

  function toccaStato() {
    if (!avviso) return;                       // niente da dire: non è cliccabile
    if (avviso.tipo === 'adozione') { proponiAdozione(); return; }
    Alert.alert('Dati e sincronizzazione', avviso.messaggio, [{ text: 'Ok' }]);
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
        <Text
          style={[styles.statoSync, { color: avviso ? t.danger : t.textMuted }]}
          onPress={avviso ? toccaStato : undefined}
          suppressHighlighting={!avviso}
        >
          {testoSync}
        </Text>
        <Text style={[styles.statoNota, { color: t.textMuted }]}>
          I dati si salvano da soli sul tuo account: li ritrovi su ogni dispositivo dove accedi.
        </Text>
      </Card>

      {/* Pattern standard (WhatsApp/Telegram: versione in fondo ad Aiuto/Impostazioni;
          le app indie mettono lì il contatto sviluppatore). buildInfo arriva da
          app.config.js valutato al bundling: dice QUALE codice sta girando davvero. */}
      <Card style={styles.card}>
        <Text style={[styles.section, { color: t.textMuted }]}>ASSISTENZA</Text>
        <ListRow
          title="Scrivi allo sviluppatore"
          subtitle={`${SVILUPPATORE} · ${EMAIL_ASSISTENZA}`}
          right={<IconChevronRight size={18} color={t.textMuted} />}
          onPress={() => {
            Linking.openURL(`mailto:${EMAIL_ASSISTENZA}?subject=${encodeURIComponent("Who's the Boss — assistenza")}`)
              .catch(() => { /* nessun client email: l'indirizzo resta leggibile qui sopra */ });
          }}
        />
        <Text style={[styles.versione, { color: t.textMuted }]}>
          Versione {Constants.expoConfig?.version ?? '?'} · build {buildInfo?.data ?? '?'} · {buildInfo?.commit ?? '?'}
        </Text>
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
  versione: { fontSize: 12, textAlign: 'center', paddingTop: 2 },
  statoSync: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  statoNota: { fontSize: 13, lineHeight: 18 },
});
