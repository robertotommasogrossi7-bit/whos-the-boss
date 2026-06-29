import { DarkTheme, Stack, ThemeProvider } from 'expo-router';

import { ThemeProvider as AppThemeProvider } from '@/theme/ThemeContext';
import { defaultTheme } from '@/theme/theme';

/* Tema di navigazione (chrome RN: sfondi, header, bordi) allineato ai
   nostri token scuri. Il tema "applicativo" (per le schermate) viaggia
   separato in AppThemeProvider cosi' da poter diventare dinamico per
   gioco (feltro) in R1.3 senza toccare la navigazione. */
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: defaultTheme.bg,
    card: defaultTheme.surface,
    text: defaultTheme.text,
    border: defaultTheme.border,
    primary: defaultTheme.accent,
    notification: defaultTheme.danger,
  },
};

export default function RootLayout() {
  return (
    <AppThemeProvider value={defaultTheme}>
      <ThemeProvider value={navTheme}>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </AppThemeProvider>
  );
}
