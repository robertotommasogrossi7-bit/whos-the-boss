import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from '@/components/auth/LoginScreen';
import GlobalToast from '@/components/GlobalToast';
import { useStore } from '@/store/useStore';
import { ThemeProvider as AppThemeProvider } from '@/theme/ThemeContext';
import { themeForGame } from '@/theme/theme';

/* Radice: legge il gioco selezionato (giocoFiltro) dallo store e ne calcola
   il TEMA (feltro per il poker, accento del gioco altrimenti). Lo passa alle
   schermate e alla navigazione, cosi' l'app si ri-tema al cambio gioco.
   Init al boot: runMigrations() (crea il "Personale", idempotente) + initAuth()
   (ripristina la sessione Supabase) DOPO l'idratazione async di AsyncStorage.
   Gate auth (R2.3): finche' la sessione non e' ripristinata mostra un loader;
   se non c'e' utente mostra la LoginScreen; altrimenti l'app (Stack). */
export default function RootLayout() {
  const giocoFiltro = useStore((s) => s.giocoFiltro);
  const runMigrations = useStore((s) => s.runMigrations);
  const initAuth = useStore((s) => s.initAuth);
  const utente = useStore((s) => s.utente);
  const authLoading = useStore((s) => s.authLoading);
  const theme = themeForGame(giocoFiltro);

  useEffect(() => {
    const run = () => { runMigrations(); initAuth(); };
    if (useStore.persist.hasHydrated()) run();
    return useStore.persist.onFinishHydration(run);
  }, [runMigrations, initAuth]);

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
        {authLoading ? (
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
          </Stack>
        )}
        <GlobalToast />
      </ThemeProvider>
    </AppThemeProvider>
  );
}
