/* ══════════════════════════════════════════════════════
   DELTA-SYNC — gli agganci veri (R7.4d)
   ─────────────────────────────────────────────────────
   La logica (mutex, adozione, ciclo pull→merge→push→stamp) vive in
   `creaSync` nel core, testata senza device. Qui i fili: store, rete
   (PostgREST + RPC push_lega), storage per il backup pre-adozione, e la
   PROPOSTA di adozione (Alert nativo — si propone, non si impone, DS9).
══════════════════════════════════════════════════════ */

import { Alert } from 'react-native';

import {
  creaSync, nowHHMM,
  type DepsSync, type EsitoSync, type PayloadPush, type SnapshotCloud,
} from '@whos-the-boss/core';
import { chiaveStorage, STORE_KEY } from '@whos-the-boss/state';

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

/* DS9: prima di sostituire il locale col cloud, il blob si salva in una
   chiave di backup accanto a quella dell'account. I sync normali non la
   toccano mai: solo un'altra adozione la rimpiazzerebbe. */
async function salvaBackupPreAdozione(): Promise<void> {
  const account = useStore.getState().utente?.id;
  if (!account) return;
  const chiave = chiaveStorage(STORE_KEY, account);
  const blob = await mobileStorageAdapter.getItem(chiave);
  if (blob != null) await mobileStorageAdapter.setItem(`${chiave}:backup-pre-adozione`, blob);
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
};

/* UNA istanza per tutta l'app: il mutex S11 vive nella sua closure. */
const eseguiSync = creaSync(deps);

/** Esegue un ciclo di sync e aggiorna "ultimo sync" nel Profilo. */
export async function sincronizza(opz?: { adozioneConfermata?: boolean }): Promise<EsitoSync> {
  const esito = await eseguiSync(opz);
  if (esito.stato === 'ok') useStore.getState().setUltimoSyncAlle(nowHHMM());
  return esito;
}

/* Dai trigger automatici (boot/foreground) l'Alert si mostra al massimo una
   volta per avvio dell'app — un promemoria, non un tormentone; dal bottone
   manuale si rimostra sempre (l'utente sta guardando). */
let adozioneGiaProposta = false;

/** Sync che, se serve l'adozione (P.8.1), la propone con un Alert nativo. */
export async function sincronizzaProponendoAdozione(opz?: { manuale?: boolean }): Promise<EsitoSync> {
  const esito = await sincronizza();
  if (esito.stato !== 'adozione_richiesta') return esito;
  if (adozioneGiaProposta && !opz?.manuale) return esito;
  adozioneGiaProposta = true;
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
            useStore.getState().toast(descriviEsitoSync(e) ?? 'Non ha funzionato, riprova.');
          });
        },
      },
    ],
  );
  return esito;
}

/** Messaggio da mostrare (toast) per un esito; null = niente da dire. */
export function descriviEsitoSync(esito: EsitoSync): string | null {
  switch (esito.stato) {
    case 'ok':
      if (esito.adottato) return 'Dati dell\'account caricati ✓';
      return esito.pushate > 0 ? `Sincronizzato ✓ (${esito.pushate} righe)` : 'Sincronizzato ✓';
    case 'conflitto':
      return 'Un altro dispositivo ha appena salvato: tocca di nuovo per riallineare.';
    case 'saltato':
      if (esito.motivo === 'da_importare') return 'Prima carica i dati sul cloud (Profilo → Carica i dati).';
      if (esito.motivo === 'in_corso') return 'Sincronizzazione già in corso…';
      return null; // nessun_account: il gate UI non fa arrivare qui senza login
    case 'adozione_richiesta':
      return null; // la gestisce l'Alert di sincronizzaProponendoAdozione
    case 'scartato':
      return null; // account cambiato durante il ciclo: silenzio
    case 'errore':
      return `Sincronizzazione non riuscita: ${esito.messaggio}`;
  }
}
