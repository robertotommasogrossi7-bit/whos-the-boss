import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Sheet } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme/theme';

/* Form sensibili (R2.6) — cambio password / email. Entrambi chiedono prima la
   password attuale (riverificata lato store) e la nuova credenziale digitata due
   volte. Errori in banner; al successo chiamano onDone con il messaggio giusto
   (per la password "aggiornata", per l'email "controlla la mail per confermare"). */
interface SheetProps {
  open: boolean;
  onClose: () => void;
  onDone: (successMsg: string) => void;
}

export function ChangePasswordSheet({ open, onClose, onDone }: SheetProps) {
  const t = useTheme();
  const updatePassword = useStore((s) => s.updatePassword);
  const input = inputStyleFor(t);

  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [nw2, setNw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() { setCur(''); setNw(''); setNw2(''); setErr(null); setBusy(false); }
  function close() { reset(); onClose(); }

  async function submit() {
    if (busy) return;
    setErr(null);
    if (nw !== nw2) { setErr('Le due password non coincidono'); return; }
    setBusy(true);
    const e = await updatePassword(cur, nw);
    setBusy(false);
    if (e) { setErr(e); return; }
    reset();
    onDone('Password aggiornata.');
  }

  return (
    <Sheet open={open} onClose={close} title="Cambia password">
      <View style={styles.form}>
        <Field label="Password attuale" t={t}>
          <TextInput style={input} secureTextEntry autoCapitalize="none" placeholder="••••••••"
            placeholderTextColor={t.textMuted} value={cur} onChangeText={setCur} />
        </Field>
        <Field label="Nuova password" t={t}>
          <TextInput style={input} secureTextEntry autoCapitalize="none" placeholder="Almeno 6 caratteri"
            placeholderTextColor={t.textMuted} value={nw} onChangeText={setNw} />
        </Field>
        <Field label="Conferma nuova password" t={t}>
          <TextInput style={input} secureTextEntry autoCapitalize="none" placeholder="Ripeti la nuova password"
            placeholderTextColor={t.textMuted} value={nw2} onChangeText={setNw2}
            onSubmitEditing={submit} returnKeyType="go" />
        </Field>
        {err && <ErrBanner t={t} text={err} />}
        <Button block onPress={submit} disabled={busy}>{busy ? 'Salvataggio…' : 'Aggiorna password'}</Button>
      </View>
    </Sheet>
  );
}

export function ChangeEmailSheet({ open, onClose, onDone }: SheetProps) {
  const t = useTheme();
  const updateEmail = useStore((s) => s.updateEmail);
  const input = inputStyleFor(t);

  const [cur, setCur] = useState('');
  const [em, setEm] = useState('');
  const [em2, setEm2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() { setCur(''); setEm(''); setEm2(''); setErr(null); setBusy(false); }
  function close() { reset(); onClose(); }

  async function submit() {
    if (busy) return;
    setErr(null);
    if (em.trim().toLowerCase() !== em2.trim().toLowerCase()) { setErr('Le due email non coincidono'); return; }
    setBusy(true);
    const e = await updateEmail(cur, em);
    setBusy(false);
    if (e) { setErr(e); return; }
    reset();
    onDone('Controlla la nuova email per confermare il cambio.');
  }

  return (
    <Sheet open={open} onClose={close} title="Cambia email">
      <View style={styles.form}>
        <Field label="Password attuale" t={t}>
          <TextInput style={input} secureTextEntry autoCapitalize="none" placeholder="••••••••"
            placeholderTextColor={t.textMuted} value={cur} onChangeText={setCur} />
        </Field>
        <Field label="Nuova email" t={t}>
          <TextInput style={input} autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
            placeholder="nuova@esempio.it" placeholderTextColor={t.textMuted} value={em} onChangeText={setEm} />
        </Field>
        <Field label="Conferma nuova email" t={t}>
          <TextInput style={input} autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
            placeholder="Ripeti la nuova email" placeholderTextColor={t.textMuted} value={em2} onChangeText={setEm2}
            onSubmitEditing={submit} returnKeyType="go" />
        </Field>
        {err && <ErrBanner t={t} text={err} />}
        <Button block onPress={submit} disabled={busy}>{busy ? 'Invio…' : 'Aggiorna email'}</Button>
      </View>
    </Sheet>
  );
}

function Field({ label, t, children }: { label: string; t: Theme; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: t.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

function ErrBanner({ t, text }: { t: Theme; text: string }) {
  return (
    <View style={[styles.banner, { backgroundColor: t.dangerSoft, borderColor: t.danger, borderRadius: t.radiusSm }]}>
      <Text style={{ color: t.danger, fontSize: 13 }}>{text}</Text>
    </View>
  );
}

function inputStyleFor(t: Theme) {
  return [styles.input, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }];
}

const styles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 8 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, minHeight: 44 },
  banner: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
});
