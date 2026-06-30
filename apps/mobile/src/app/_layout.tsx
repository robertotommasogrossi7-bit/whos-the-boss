import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';

import { useStore } from '@/store/useStore';
import { ThemeProvider as AppThemeProvider } from '@/theme/ThemeContext';
import { themeForGame } from '@/theme/theme';

/* Radice: legge il gioco selezionato (giocoFiltro) dallo store e ne calcola
   il TEMA (feltro per il poker, accento del gioco altrimenti). Lo passa alle
   schermate e alla navigazione, cosi' l'app si ri-tema al cambio gioco.
   Init al boot: runMigrations() (crea il "Personale", idempotente) DOPO
   l'idratazione async di AsyncStorage. */
export default function RootLayout() {
  const giocoFiltro = useStore((s) => s.giocoFiltro);
  const runMigrations = useStore((s) => s.runMigrations);
  const theme = themeForGame(giocoFiltro);

  useEffect(() => {
    const run = () => runMigrations();
    if (useStore.persist.hasHydrated()) run();
    return useStore.persist.onFinishHydration(run);
  }, [runMigrations]);

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
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="lega/[id]" options={{ headerShown: true, title: 'Lega' }} />
          <Stack.Screen
            name="nuova-lega"
            options={{ headerShown: true, title: 'Nuova lega', presentation: 'modal' }}
          />
        </Stack>
      </ThemeProvider>
    </AppThemeProvider>
  );
}
