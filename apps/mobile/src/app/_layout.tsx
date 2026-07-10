import { STORE_KEY, chiaveStorage, migraBlobUnicoSeNecessario } from '@whos-the-boss/state';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from '@/components/auth/LoginScreen';
import GlobalToast from '@/components/GlobalToast';
import { useDeepLinkAuth } from '@/lib/useDeepLinkAuth';
import { mobileStorageAdapter, useStore } from '@/store/useStore';
import { ThemeProvider as AppThemeProvider } from '@/theme/ThemeContext';
import { themeForGame } from '@/theme/theme';

/* Radice: legge il gioco selezionato (giocoFiltro) dallo store e ne calcola
   il TEMA (feltro per il poker, accento del gioco altrimenti). Lo passa alle
   schermate e alla navigazione, cosi' l'app si ri-tema al cambio gioco.

   Boot (R7.2b, storage per-account — R7_SCHEMA.md sez. M): lo store NON si
   auto-idrata piu' (skipHydration) perche' non sappiamo ancora QUALE account
   leggere. Due effetti indipendenti:
   1) initAuth() al mount: ripristina la sessione Supabase, aggiorna solo
      `authUser` (grezzo) + `authLoading`, non tocca lo storage.
   2) orchestratore sotto: ad ogni CAMBIO di authUser?.id (boot, login,
      logout, cambio account — non i token-refresh dello stesso account,
      filtrati con un ref di dedup) punta persist sulla chiave giusta,
      migra il blob legacy se serve, ri-idrata, poi (solo ora che il db e'
      quello giusto) applica `utente` + le migration locali.
   Gate auth (R2.3, esteso): finche' authLoading O !dbReady mostra un
   loader; se non c'e' utente mostra la LoginScreen; altrimenti l'app. */
export default function RootLayout() {
  const giocoFiltro = useStore((s) => s.giocoFiltro);
  const runMigrations = useStore((s) => s.runMigrations);
  const initAuth = useStore((s) => s.initAuth);
  const applyUtente = useStore((s) => s.applyUtente);
  const clearDbLocale = useStore((s) => s.clearDbLocale);
  const setDbReady = useStore((s) => s.setDbReady);
  const utente = useStore((s) => s.utente);
  const authUser = useStore((s) => s.authUser);
  const authLoading = useStore((s) => s.authLoading);
  const dbReady = useStore((s) => s.dbReady);
  const theme = themeForGame(giocoFiltro);

  // Ritorno in app dal link di conferma email (R6.4 / R2.4)
  useDeepLinkAuth();

  // 1) Avvia la risoluzione auth una volta sola: non dipende dallo storage.
  useEffect(() => { initAuth(); }, [initAuth]);

  // 2) Orchestratore storage per-account: reagisce ad ogni cambio di identità.
  const ultimoAccountRef = useRef<string | null | undefined>(undefined); // undefined = mai processato
  useEffect(() => {
    if (authLoading) return; // aspetta il primo giro di Supabase
    const accountId = authUser?.id ?? null;
    if (ultimoAccountRef.current === accountId) return; // stesso account (es. token refresh) → no-op
    ultimoAccountRef.current = accountId;

    let cancellato = false;
    (async () => {
      setDbReady(false);
      if (!accountId) {
        // Logout (o mai loggato): niente storage da leggere per questo account.
        clearDbLocale();
        if (!cancellato) setDbReady(true);
        return;
      }
      useStore.persist.setOptions({ name: chiaveStorage(STORE_KEY, accountId) });
      await migraBlobUnicoSeNecessario(mobileStorageAdapter, STORE_KEY, accountId);
      await useStore.persist.rehydrate();
      if (cancellato) return;
      runMigrations();
      applyUtente(authUser);
      setDbReady(true);
    })();
    return () => { cancellato = true; };
  }, [authUser, authLoading, runMigrations, applyUtente, clearDbLocale, setDbReady]);

  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: theme.bg,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      primary: theme.accent,
      notification: theme.danger,
    },
  };

  return (
    <AppThemeProvider value={theme}>
      <ThemeProvider value={navTheme}>
        {authLoading || !dbReady ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : !utente ? (
          <LoginScreen />
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="lega/[id]" options={{ headerShown: true, title: 'Lega' }} />
            <Stack.Screen
              name="nuova-lega"
              options={{ headerShown: true, title: 'Nuova lega', presentation: 'modal' }}
            />
            <Stack.Screen
              name="profilo"
              options={{ headerShown: true, title: 'Profilo', presentation: 'modal' }}
            />
            <Stack.Screen
              name="giocatori/[legaId]"
              options={{ headerShown: true, title: 'Giocatori' }}
            />
            <Stack.Screen name="serata/[legaId]/[serataId]" options={{ headerShown: false }} />
          </Stack>
        )}
        <GlobalToast />
      </ThemeProvider>
    </AppThemeProvider>
  );
}
