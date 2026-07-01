import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View,
} from 'react-native';

import { validaUsername } from '@whos-the-boss/core';

import { GameIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme/theme';

/* Schermata di accesso (R2) — port nativo della web LoginScreen: tab
   Accedi/Registrati, login = email+password, registrazione = username+email+
   password. Chiama store.login/register (Supabase). Su mobile non c'e' ancora
   il toast globale: errori e l'info "conferma la mail" vanno in un banner nella
   card. Al successo del login onAuthStateChange setta `utente` e il gate (root
   _layout) passa da solo all'app. */
type Tab = 'login' | 'reg';

export default function LoginScreen() {
  const t = useTheme();
  const login = useStore((s) => s.login);
  const register = useStore((s) => s.register);

  const [tab, setTab] = useState<Tab>('login');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'error' | 'info' } | null>(null);

  // Form (stato controllato — niente ref come sulla web)
  const [liEmail, setLiEmail] = useState('');
  const [liPwd, setLiPwd] = useState('');
  const [rgUser, setRgUser] = useState('');
  const [rgDisplay, setRgDisplay] = useState('');
  const [rgMail, setRgMail] = useState('');
  const [rgPwd, setRgPwd] = useState('');

  // Validazione handle in tempo reale (pura): mostra il perche' sotto al campo.
  const rgUserCheck = rgUser.trim() ? validaUsername(rgUser) : null;
  const rgUserErr = rgUserCheck && !rgUserCheck.ok ? rgUserCheck.error : null;

  async function doLogin() {
    if (busy) return;
    setBusy(true); setMsg(null);
    const err = await login(liEmail, liPwd);
    setBusy(false);
    if (err) setMsg({ text: err, tone: 'error' });
    // successo: il gate passa all'app da solo (utente settato via auth listener)
  }

  async function doRegister() {
    if (busy) return;
    setBusy(true); setMsg(null);
    const err = await register(rgUser, rgMail, rgPwd, rgDisplay);
    setBusy(false);
    if (err) {
      // "Registrazione ok — conferma la mail…" e' un'info, non un errore
      const info = err.startsWith('Registrazione ok');
      setMsg({ text: err, tone: info ? 'info' : 'error' });
    }
  }

  const inputStyle = [styles.input, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={[styles.logo, { backgroundColor: t.accentSoft, borderRadius: t.radius }]}>
          <GameIcon icona="picche" size={44} color={t.accent} />
        </View>
        <Text style={[styles.title, { color: t.text }]}>Who&apos;s the Boss</Text>
        <Text style={[styles.sub, { color: t.textMuted }]}>Organizza le serate con i tuoi amici</Text>

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border, borderRadius: t.radius }]}>
          <View style={[styles.tabs, { backgroundColor: t.surface2, borderRadius: t.radiusSm }]}>
            {(['login', 'reg'] as Tab[]).map((k) => {
              const active = tab === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => { setTab(k); setMsg(null); }}
                  style={[styles.tab, active && { backgroundColor: t.accent, borderRadius: t.radiusSm - 2 }]}
                >
                  <Text style={[styles.tabLabel, { color: active ? t.accentInk : t.textMuted }]}>
                    {k === 'login' ? 'Accedi' : 'Registrati'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tab === 'login' ? (
            <View style={styles.form}>
              <Field label="Email" t={t}>
                <TextInput
                  style={inputStyle} placeholder="tu@esempio.it" placeholderTextColor={t.textMuted}
                  autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
                  textContentType="emailAddress" value={liEmail} onChangeText={setLiEmail}
                />
              </Field>
              <Field label="Password" t={t}>
                <TextInput
                  style={inputStyle} placeholder="••••••••" placeholderTextColor={t.textMuted}
                  secureTextEntry autoCapitalize="none" textContentType="password"
                  value={liPwd} onChangeText={setLiPwd} onSubmitEditing={doLogin} returnKeyType="go"
                />
              </Field>
              <Button block onPress={doLogin} disabled={busy}>{busy ? 'Accesso…' : 'Accedi'}</Button>
            </View>
          ) : (
            <View style={styles.form}>
              <Field label="Username" t={t}>
                <TextInput
                  style={inputStyle} placeholder="es. mario_rossi" placeholderTextColor={t.textMuted}
                  autoCapitalize="none" autoCorrect={false} value={rgUser} onChangeText={setRgUser}
                />
                <Text style={[styles.hint, { color: rgUserErr ? t.danger : t.textMuted }]}>
                  {rgUserErr ?? 'Minuscole, numeri, punto e underscore. È il tuo nome univoco.'}
                </Text>
              </Field>
              <Field label="Nome visualizzato (opzionale)" t={t}>
                <TextInput
                  style={inputStyle} placeholder="es. Mario Rossi" placeholderTextColor={t.textMuted}
                  autoCapitalize="words" autoCorrect={false} value={rgDisplay} onChangeText={setRgDisplay}
                />
              </Field>
              <Field label="Email" t={t}>
                <TextInput
                  style={inputStyle} placeholder="email@esempio.it" placeholderTextColor={t.textMuted}
                  autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
                  textContentType="emailAddress" value={rgMail} onChangeText={setRgMail}
                />
              </Field>
              <Field label="Password" t={t}>
                <TextInput
                  style={inputStyle} placeholder="Almeno 6 caratteri" placeholderTextColor={t.textMuted}
                  secureTextEntry autoCapitalize="none" textContentType="newPassword"
                  value={rgPwd} onChangeText={setRgPwd} onSubmitEditing={doRegister} returnKeyType="go"
                />
              </Field>
              <Button block onPress={doRegister} disabled={busy}>{busy ? 'Creazione…' : 'Crea account'}</Button>
            </View>
          )}

          {msg && (
            <View
              style={[
                styles.banner,
                {
                  backgroundColor: msg.tone === 'error' ? t.dangerSoft : t.okSoft,
                  borderColor: msg.tone === 'error' ? t.danger : t.ok,
                  borderRadius: t.radiusSm,
                },
              ]}
            >
              <Text style={{ color: msg.tone === 'error' ? t.danger : t.ok, fontSize: 13 }}>{msg.text}</Text>
            </View>
          )}

          <Text style={[styles.note, { color: t.textMuted }]}>
            Accesso reale con Supabase. La sessione resta attiva tra gli avvii.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, t, children }: { label: string; t: Theme; children: ReactNode }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.label, { color: t.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 22, gap: 4 },
  logo: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 18 },
  card: { borderWidth: 1, padding: 16, gap: 14 },
  tabs: { flexDirection: 'row', padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 14, fontWeight: '700' },
  form: { gap: 12 },
  fieldRow: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, minHeight: 44 },
  hint: { fontSize: 12, marginTop: 2 },
  banner: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  note: { fontSize: 12, textAlign: 'center', marginTop: 2 },
});
