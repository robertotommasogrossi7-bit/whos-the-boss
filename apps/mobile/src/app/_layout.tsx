import { STORE_KEY, chiaveStorage, migraBlobUnicoSeNecessario } from '@whos-the-boss/state';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, Text, View } from 'react-native';

import LoginScreen from '@/components/auth/LoginScreen';
import ErrorBoundary from '@/components/ErrorBoundary';
import GlobalToast from '@/components/GlobalToast';
import { installaCrashLogger, leggiUltimoCrash, pulisciUltimoCrash } from '@/lib/crashLog';
import { sincronizzaProponendoAdozione } from '@/lib/sync';
import { useDeepLinkAuth } from '@/lib/useDeepLinkAuth';
import { mobileStorageAdapter, useStore } from '@/store/useStore';
import { ThemeProvider as AppThemeProvider } from '@/theme/ThemeContext';
import { themeForGame } from '@/theme/theme';

/* Installato al primo import di questo modulo (prima ancora che il
   componente monti): ErrorUtils vede QUALSIASI eccezione JS non presa,
   anche fuori dal render (tap/effect/callback) — dove l'ErrorBoundary
   sotto non arriva. Cattura i crash che chiudono l'app di scatto. */
installaCrashLogger();

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

  // Se l'ultimo avvio è morto per un'eccezione non presa, mostralo ora (una
  // volta) invece di lasciarlo invisibile nell'AsyncStorage.
  const [crashDaMostrare, setCrashDaMostrare] = useState<string | null>(null);
  useEffect(() => {
    leggiUltimoCrash().then((testo) => { if (testo) setCrashDaMostrare(testo); });
  }, []);
  const chiudiCrash = () => {
    setCrashDaMostrare(null);
    pulisciUltimoCrash();
  };

  // 1) Avvia la risoluzione auth una volta sola: non dipende dallo storage.
  useEffect(() => { initAuth(); }, [initAuth]);

  // 2) Orchestratore storage per-account. Dipende dall'ID dell'account (stringa),
  //    NON dall'oggetto authUser: onAuthStateChange ri-notifica lo STESSO utente con
  //    un oggetto nuovo poco dopo getSession — se dipendessimo dall'oggetto, l'effect
  //    si ri-eseguirebbe, annullerebbe la procedura in volo e (stesso id) non ne
  //    avvierebbe un'altra → dbReady mai true → loader infinito. Dipendendo dall'id
  //    l'effect gira solo al cambio di account VERO. (Bug reale trovato su device, R7.2b.)
  const accountId = authUser?.id ?? null;
  const ultimoAccountRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (authLoading) return; // aspetta il primo giro di Supabase
    if (ultimoAccountRef.current === accountId) return;
    ultimoAccountRef.current = accountId;

    let cancellato = false;
    (async () => {
      // Rete di sicurezza: qualunque cosa vada storta, il finally apre comunque
      // l'app (dbReady=true) — mai più mattone col loader infinito.
      try {
        setDbReady(false);
        if (!accountId) {
          // Logout / mai loggato. ⚠️ ORDINE (audit S5-R4): persist scrive su
          // storage ad OGNI set → prima si SGANCIA la chiave dell'account
          // (altrimenti clearDbLocale sovrascriverebbe il blob salvato
          // dell'account con un db vuoto: perdita vera dei dati locali non
          // ancora sincronizzati). La chiave-parcheggio ':sloggato' assorbe
          // le scritture a vuoto. `applyUtente(null)` riporta il gate UI alla
          // LoginScreen e fa vedere "nessun account" alla guardia S20 del
          // sync (accountAttuale legge `utente`) — regressione di R7.2b.
          useStore.persist.setOptions({ name: `${STORE_KEY}:sloggato` });
          applyUtente(null);
          clearDbLocale();
          return;
        }
        useStore.persist.setOptions({ name: chiaveStorage(STORE_KEY, accountId) });
        await migraBlobUnicoSeNecessario(mobileStorageAdapter, STORE_KEY, accountId);
        await useStore.persist.rehydrate();
        if (cancellato) return;
        runMigrations();
        applyUtente(useStore.getState().authUser);
      } catch (e) {
        console.error('[boot] init storage per-account fallito:', e);
      } finally {
        if (!cancellato) setDbReady(true);
      }
    })();
    return () => { cancellato = true; };
  }, [accountId, authLoading, runMigrations, applyUtente, clearDbLocale, setDbReady]);

  // 3) Delta-sync (R7.4d, trigger P.5): al boot — quando db e utente sono
  //    pronti — e a ogni ritorno in foreground. NIENTE timer di background
  //    (scala amici). I trigger possono sovrapporsi senza danni: il mutex
  //    S11 vive nell'istanza unica di lib/sync; il logout-guard S20 scarta
  //    i risultati se l'account cambia a metà ciclo.
  const utenteId = utente?.id ?? null;
  useEffect(() => {
    if (authLoading || !dbReady || !utenteId) return;
    void sincronizzaProponendoAdozione();
    const sub = AppState.addEventListener('change', (stato) => {
      if (stato === 'active') void sincronizzaProponendoAdozione();
    });
    return () => sub.remove();
  }, [authLoading, dbReady, utenteId]);

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
        <ErrorBoundary>
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
              <Stack.Screen
                name="carica-dati"
                options={{ headerShown: true, title: 'Carica sul cloud' }}
              />
              <Stack.Screen name="serata/[legaId]/[serataId]" options={{ headerShown: false }} />
            </Stack>
          )}
          <GlobalToast />
          {crashDaMostrare ? (
            <View style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: '#0e0f12', paddingTop: 60,
            }}>
              <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
                <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '800' }}>
                  L'app si era chiusa di scatto
                </Text>
                <Text style={{ color: '#b9b9c0', fontSize: 15, lineHeight: 21 }}>
                  Ecco l'errore dell'ultimo avvio — copialo e mandalo così lo sistemiamo.
                </Text>
                <Text selectable style={{ color: '#ff6b6b', fontSize: 13, fontFamily: 'monospace', backgroundColor: '#1a1b1f', borderRadius: 12, padding: 14 }}>
                  {crashDaMostrare}
                </Text>
                <Pressable
                  onPress={chiudiCrash}
                  style={{ backgroundColor: '#2f6bd8', borderRadius: 10, paddingVertical: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>Ho copiato, chiudi</Text>
                </Pressable>
              </ScrollView>
            </View>
          ) : null}
        </ErrorBoundary>
      </ThemeProvider>
    </AppThemeProvider>
  );
}
