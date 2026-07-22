/* ══════════════════════════════════════════════════════
   DELTA-SYNC — gli agganci veri (R7.4d, semplificato in R7.4f)
   ─────────────────────────────────────────────────────
   La logica (mutex, prima semina, adozione, ciclo pull→merge→push→stamp) vive
   in `creaSync` nel core, testata senza device. Qui i fili: store, rete
   (PostgREST + RPC push_lega), storage per il backup pre-adozione.

   R7.4f — **il sync non si chiede, si fa** (ricerca: local-first = sync
   automatico su più trigger + indicatore passivo, mai un pulsante come
   meccanismo). Quindi:
     · NIENTE bottone "Sincronizza ora" e NIENTE schermata "Carica i dati":
       il ciclo parte da solo (boot + ritorno in primo piano) e, se il cloud
       dell'account è vergine, fa da sé anche la PRIMA SEMINA (l'import);
     · l'unica cosa che resta una domanda è l'**adozione** (DS9): due mondi
       nati separati non si fondono, lì decide l'utente. Rara, una volta per
       dispositivo;
     · lo stato del giro finisce in `statoSync` dello store → riga PASSIVA nel
       Profilo, toccabile solo quando c'è davvero qualcosa da fare.
══════════════════════════════════════════════════════ */

import { Alert } from 'react-native';

import {
  creaSync, nowHHMM,
  type DepsSync, type EsitoSync, type PayloadPush, type SnapshotCloud,
} from '@whos-the-boss/core';
import { chiaveStorage, STORE_KEY } from '@whos-the-boss/state';

import { importaSulCloud } from '@/lib/import';
import { supabase } from '@/lib/supabase';
import { mobileStorageAdapter, useStore } from '@/store/useStore';

/* Il pull è COMPLETO (P.1: a questa scala niente cursore): una select per
   tabella, filtrata dalla RLS sull'account. Nota: PostgREST tronca a ~1000
   righe per select — a scala amici non ci si arriva; il cursore delta è R10. */
const TABELLE = [
  'leghe', 'giocatori', 'giochi_lega',
  'partite_poker', 'partita_poker_giocatori', 'poker_movimenti', 'settlements',
  'serate', 'serata_partecipanti',
  'sessioni_gioco', 'sessione_gioco_partecipanti',
  'partite_gioco', 'partita_gioco_vincitori', 'partita_gioco_partecipanti',
] as const;

async function scaricaSnapshot(): Promise<{ snapshot: SnapshotCloud } | { errore: string }> {
  const esiti = await Promise.all(TABELLE.map((t) => supabase.from(t).select('*')));
  const rotto = esiti.find((e) => e.error);
  if (rotto?.error) return { errore: rotto.error.message };
  const snapshot = Object.fromEntries(
    TABELLE.map((t, i) => [t, esiti[i].data ?? []]),
  ) as unknown as SnapshotCloud;
  return { snapshot };
}

/* DS9: prima di sostituire il locale col cloud, una copia di sicurezza in una
   chiave accanto a quella dell'account. Dallo stato LIVE, non dal blob su
   disco (audit S5-R5): zustand persist scrive async e senza conferma — il
   blob potrebbe non avere ancora l'ultimo edit, e il backup deve fotografare
   esattamente ciò che l'adozione sta per sostituire. Stesso formato JSON di
   zustand persist ({state:{…partialize},version:0}) → ripristinabile
   copiandolo sulla chiave dell'account. I sync normali non la toccano mai. */
async function salvaBackupPreAdozione(): Promise<void> {
  const s = useStore.getState();
  const account = s.utente?.id;
  if (!account) return;
  const blob = JSON.stringify({
    state: { db: s.db, giocoFiltro: s.giocoFiltro, gameBarVisible: s.gameBarVisible, gameBarPinned: s.gameBarPinned },
    version: 0,
  });
  await mobileStorageAdapter.setItem(`${chiaveStorage(STORE_KEY, account)}:backup-pre-adozione`, blob);
}

const deps: DepsSync = {
  leggiDb: () => useStore.getState().db,
  scriviDb: (db) => useStore.getState().sostituisciDb(db),
  accountAttuale: () => useStore.getState().utente?.id ?? null,
  scaricaSnapshot,
  chiamaRpcPush: async (payload: PayloadPush) => {
    const { data, error } = await supabase.rpc('push_lega', { payload });
    if (error) return { errore: error.message };
    return data as { conteggi: Record<string, number>; applicate: Record<string, string> };
  },
  salvaBackupPreAdozione,
  eseguiImport: importaSulCloud,
};

/* UNA istanza per tutta l'app: il mutex S11 vive nella sua closure. */
const eseguiSync = creaSync(deps);

/** Un ciclo di sync + aggiornamento della riga di stato nel Profilo. */
async function sincronizza(opz?: { adozioneConfermata?: boolean }): Promise<EsitoSync> {
  const { setStatoSync } = useStore.getState();
  setStatoSync({ inCorso: true });
  const esito = await eseguiSync(opz);
  const patch: Parameters<typeof setStatoSync>[0] = { inCorso: false };

  switch (esito.stato) {
    case 'ok':
      patch.ultimoAlle = nowHHMM();
      patch.avviso = null;
      break;
    case 'adozione_richiesta':
      patch.avviso = { tipo: 'adozione', messaggio: 'Questo account ha già dei dati salvati da un altro dispositivo.' };
      break;
    case 'bloccato':
      patch.avviso = {
        tipo: 'bloccato',
        messaggio: `Non posso salvare i dati sul tuo account:\n\n${esito.problemi.map((p) => `• ${p.messaggio}`).join('\n')}`,
      };
      break;
    case 'errore':
      patch.avviso = { tipo: 'errore', messaggio: esito.messaggio };
      break;
    // 'conflitto' e 'saltato' non cambiano la riga: si risolvono da soli al giro dopo
  }
  setStatoSync(patch);
  return esito;
}

/* La prima semina va annunciata UNA volta: è il momento in cui i dati
   iniziano a vivere anche fuori dal telefono, e l'utente deve saperlo. */
let seminaAnnunciata = false;
/* Dai trigger automatici l'Alert di adozione si mostra al massimo una volta
   per avvio (un promemoria, non un tormentone); toccando la riga di stato nel
   Profilo si ripropone sempre — è lì che l'utente va a cercarlo. */
let adozioneGiaProposta = false;

/** Il ciclo come lo chiamano i trigger dell'app (boot, ritorno in primo piano)
    e il tap sulla riga di stato. Gestisce da sé i due messaggi all'utente. */
export async function sincronizzaConAvvisi(opz?: { forzaProposta?: boolean }): Promise<EsitoSync> {
  const esito = await sincronizza();

  if (esito.stato === 'ok' && esito.importato && !seminaAnnunciata) {
    seminaAnnunciata = true;
    useStore.getState().toast('I tuoi dati sono ora salvati sul tuo account ✓');
    return esito;
  }
  if (esito.stato !== 'adozione_richiesta') return esito;
  if (adozioneGiaProposta && !opz?.forzaProposta) return esito;
  adozioneGiaProposta = true;
  proponiAdozione();
  return esito;
}

/** L'unica domanda vera del sync (DS9): due mondi nati separati non si
    fondono per uid — si duplicherebbero, e la 2ª lega Personale bloccherebbe
    tutto. Quindi si sceglie, una volta per dispositivo. */
export function proponiAdozione(): void {
  // Una serata in corso non è sincronizzata ma è il dato più fresco che c'è:
  // l'adozione la farebbe sparire dalla UI (audit S5-R2). Prima si chiude.
  const serataInCorso = useStore.getState().db.leghe.some(
    (l) => l.sessioneAttiva !== undefined || (l.serate_bg?.length ?? 0) > 0,
  );
  if (serataInCorso) {
    Alert.alert(
      'C\'è una serata in corso',
      'Questo account ha già dei dati salvati da un altro dispositivo, ma qui c\'è una serata aperta: '
      + 'finiscila (o annullala) e i dati del tuo account arriveranno da soli.',
      [{ text: 'Ok' }],
    );
    return;
  }
  Alert.alert(
    'Questo account ha già dei dati',
    'Sul tuo account ci sono già i dati caricati da un altro dispositivo, e quelli di questo telefono '
    + 'non possono esserci uniti. Vuoi usare qui i dati del tuo account? Quelli del telefono vengono '
    + 'messi da parte in una copia di sicurezza.',
    [
      { text: 'Non ora', style: 'cancel' },
      {
        text: 'Usa i dati dell\'account',
        style: 'destructive',
        onPress: () => {
          void sincronizza({ adozioneConfermata: true }).then((e) => {
            useStore.getState().toast(
              e.stato === 'ok' ? 'Dati dell\'account caricati ✓' : 'Non ha funzionato, riprova.',
            );
          });
        },
      },
    ],
  );
}
