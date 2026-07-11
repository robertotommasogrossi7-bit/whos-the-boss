import AsyncStorage from '@react-native-async-storage/async-storage';

/* React Native espone un ErrorUtils globale (nessun tipo ufficiale): qui il
   minimo indispensabile per agganciarcisi. */
declare const ErrorUtils: {
  getGlobalHandler(): (error: Error, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: Error, isFatal?: boolean) => void): void;
};

const CRASH_KEY = 'whostheboss:ultimoCrash';

/* Rete di sicurezza PIÙ LARGA dell'ErrorBoundary (che vede solo gli errori
   durante il render): ErrorUtils cattura QUALSIASI eccezione JS non presa,
   anche dentro un tap/effect/callback — il tipo di crash che chiude di
   scatto l'app senza passare dalla schermata rossa. Salva il messaggio
   PRIMA di richiamare il gestore originale (che di solito fa terminare il
   processo): AsyncStorage è async, quindi è un "best effort", non una
   garanzia — ma è l'unica finestra che abbiamo prima che il JS muoia. */
export function installaCrashLogger(): void {
  const originale = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    const testo = `${isFatal ? 'FATALE' : 'non fatale'} — ${new Date().toISOString()}\n${error?.name}: ${error?.message}\n${error?.stack ?? ''}`;
    AsyncStorage.setItem(CRASH_KEY, testo).catch(() => {});
    originale(error, isFatal);
  });
}

export async function leggiUltimoCrash(): Promise<string | null> {
  return AsyncStorage.getItem(CRASH_KEY);
}

export async function pulisciUltimoCrash(): Promise<void> {
  await AsyncStorage.removeItem(CRASH_KEY);
}
