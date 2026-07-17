/* ══════════════════════════════════════════════════════
   MATERIALIZZAZIONE — righe cloud NUOVE → entità locali (R7.4b, pull)
   ─────────────────────────────────────────────────────
   I `*FromCloudRow` (mapping*.ts) aggiornano un'entità locale ESISTENTE. Ma una
   riga creata su un ALTRO device non ha corrispondente locale: qui la si
   costruisce ex-novo (P.3). Tre differenze rispetto a FromCloudRow, tutte
   importanti:

     1. **id locale NUOVO**, allocato dai contatori di QUESTO device (_nid/_pid/
        …) — passato da chi orchestra (materializza.ts è puro, non tiene stato).
        Il `local_id` del cloud (l'id che la riga aveva sull'altro device) è
        solo diagnostica: due device hanno spazi id interi indipendenti, l'unica
        chiave che attraversa il confine è l'`uid` (I1).
     2. **campi sync PULITI**: la riga viene dal server, non ha edit locali →
        `syncRev === syncedRev` (non-dirty, il push non la ri-spedisce) e
        `lastSyncedAt = updated_at` del server (il pegno del CAS, R7.4c).
     3. **relazioni risolte via idMap**: le FK cloud (uid) diventano id locali
        di QUESTO device. I risolutori sono iniettati (P.8.5: la mappa è viva,
        i genitori entrano prima dei figli).

   Le liste figlie (nomi/partite/…) NON si riempiono qui: ogni materializzatore
   produce l'entità col suo id e i suoi campi, e chi orchestra (R7.4b-2) attacca
   i figli materializzati a parte, parent-first.
══════════════════════════════════════════════════════ */

import type {
  GiocatorePartita, GiocoLega, Lega, NomeGiocatore, Partita, PartitaGioco,
  SerataMulti, SessioneGioco, Settlement,
} from '../types';
import { GIOCHI_PREIMPOSTATI } from '../utils/giochi';
import type { GiocatoreCloudRow, GiocoLegaCloudRow, LegaCloudRow } from './mapping';
import type { PartitaGiocoCloudRow, SerataCloudRow, SessioneGiocoCloudRow } from './mappingMultigioco';
import type {
  GiocatorePartitaCloudRow, MovimentiRicostruiti, PartitaPokerCloudRow, SettlementCloudRow,
} from './mappingPoker';

/* Campi sync di una riga materializzata: viene dal cloud → PULITA e col pegno
   del CAS = updated_at del server. syncRev===syncedRev (=1): il valore assoluto
   non conta per il dirty-check (conta solo syncRev > syncedRev), ma partendo
   uguali un successivo touchSync la rende dirty come dev'essere. */
interface CampiSyncPuliti {
  uid: string;
  syncUpdatedAt: string;
  syncRev: number;
  syncedRev: number;
  lastSyncedAt: string;
  deletedAt?: string;
}
function campiSyncPuliti(row: { id: string; updated_at: string; deleted_at: string | null }): CampiSyncPuliti {
  return {
    uid: row.id,
    syncUpdatedAt: row.updated_at,
    syncRev: 1,
    syncedRev: 1,
    lastSyncedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

/** Lega ex-novo, SENZA figli (nomi/partite/… li attacca chi orchestra) e coi
    contatori a 1 — l'orchestratore li fa avanzare man mano che alloca gli id
    dei figli. */
export function materializzaLega(row: LegaCloudRow, idLocale: number): Lega {
  return {
    id: idLocale,
    nome: row.nome,
    foto: row.foto ?? '',
    nomi: [],
    partite: [],
    sessioneAttiva: undefined,   // lo stato live non è sincronizzato (fuori R7)
    serate_bg: [],
    _nid: 1,
    _pid: 1,
    personale: row.personale,
    giochi: [],
    sessioniGioco: [],
    _sgid: 1,
    serate: [],
    _serataId: 1,
    monoGiocoId: row.mono_gioco_id ?? undefined,
    ...campiSyncPuliti(row),
  };
}

export function materializzaGiocatore(row: GiocatoreCloudRow, idLocale: number): NomeGiocatore {
  return {
    id: idLocale,
    nome: row.nome,
    accountId: row.account_id ?? undefined,
    createdByAccountId: row.created_by_account_id ?? undefined,
    ...campiSyncPuliti(row),
  };
}

/** GiocoLega: l'id locale È la `gioco_key` (stringa dal cloud, non un contatore).
    Per i preset i campi visivi possono arrivare null dal cloud → fallback al
    catalogo globale (F4: default sensati, mai buchi). */
export function materializzaGiocoLega(row: GiocoLegaCloudRow): GiocoLega {
  const preset = GIOCHI_PREIMPOSTATI.find((g) => g.id === row.gioco_key);
  return {
    id: row.gioco_key,
    nome: row.nome ?? preset?.nome ?? 'Gioco',
    preimpostato: row.preimpostato,
    foto: row.foto ?? undefined,
    accent: row.accent ?? preset?.accent ?? undefined,
    attivo: row.attivo,
    pareggioComeVittoria: row.pareggio_come_vittoria,
    ...campiSyncPuliti(row),
  };
}

/** Partita poker ex-novo, SENZA giocatori/settlement (li attacca chi orchestra).
    F4: i soldi null → default sicuri. */
export function materializzaPartita(row: PartitaPokerCloudRow, idLocale: number): Partita {
  return {
    id: idLocale,
    buy_in: row.buy_in ?? 0,
    data: row.data ?? '',
    ora_inizio: row.ora_inizio ?? '',
    ora_fine: row.ora_fine ?? '',
    modalita: row.modalita,
    giocatori: [],
    settlements: [],
    ...campiSyncPuliti(row),
  };
}

/** GiocatorePartita ex-novo. `idNome` = id locale del giocatore (risolto via
    idMap dal `giocatore_id` cloud). `movimenti` = ricariche/pagamenti già
    ricostruiti (movimentiFromCloudRows) da chi orchestra. */
export function materializzaGiocatorePartita(
  row: GiocatorePartitaCloudRow,
  idNome: number,
  movimenti: MovimentiRicostruiti,
): GiocatorePartita {
  return {
    id_nome: idNome,
    entrate: row.entrate ?? 0,
    ricarica_fatta: row.ricarica_fatta ?? 0,
    extra: row.extra ?? 0,
    soldi_ricevuti: row.soldi_ricevuti ?? 0,
    fiches_finali: row.fiches_finali ?? 0,
    netto_finale: row.netto_finale ?? 0,
    premio: row.premio ?? 0,
    vincitore: row.vincitore,
    buy_in_pagato: row.buy_in_pagato,
    extra_pagato: row.extra_pagato,
    ricariche: movimenti.ricariche,
    pagamenti_effettuati: movimenti.pagamenti_effettuati,
    pagamenti_ricevuti: movimenti.pagamenti_ricevuti,
    posizione_finale: row.posizione_finale,
    add_on_fatto: row.add_on_fatto,
    add_on_pagato: row.add_on_pagato,
    ...campiSyncPuliti(row),
  };
}

/** Settlement ex-novo. `from`/`to` = id locali dei giocatori (risolti via idMap
    dai `from_giocatore_id`/`to_giocatore_id` cloud). */
export function materializzaSettlement(row: SettlementCloudRow, from: number, to: number): Settlement {
  return {
    from,
    to,
    amount: row.amount,
    pagato: row.pagato,
    ...campiSyncPuliti(row),
  };
}

/** Serata ex-novo. `partecipanti` = id locali (risolti dal ponte serata_partecipanti). */
export function materializzaSerata(row: SerataCloudRow, idLocale: number, partecipanti: number[]): SerataMulti {
  return {
    id: idLocale,
    data: row.data ?? '',
    partecipanti,
    ...campiSyncPuliti(row),
  };
}

/** SessioneGioco ex-novo, SENZA partite (le attacca chi orchestra). `giocoId`
    dalla `gioco_key` (G1: l'identità del gioco); `partecipanti` dal ponte;
    `serataId` = id locale della serata (risolto), se la sessione è in una serata. */
export function materializzaSessioneGioco(
  row: SessioneGiocoCloudRow,
  idLocale: number,
  partecipanti: number[],
  serataId: number | undefined,
): SessioneGioco {
  return {
    id: idLocale,
    giocoId: row.gioco_key ?? 'generico',   // F4: gioco ignoto → generico, mai crash
    data: row.data ?? '',
    stato: row.stato ?? 'pre',
    ora_inizio: row.ora_inizio ?? '',
    ora_fine: row.ora_fine ?? '',
    partecipanti,
    partite: [],
    esitoPareggio: row.esito_pareggio,
    serataId,
    ...campiSyncPuliti(row),
  };
}

/** PartitaGioco ex-novo. `idLocale` = id interno alla sessione (allocato da chi
    orchestra); `vincitori`/`partecipanti` dai ponti (id locali). */
export function materializzaPartitaGioco(
  row: PartitaGiocoCloudRow,
  idLocale: number,
  vincitori: number[],
  partecipanti: number[] | undefined,
): PartitaGioco {
  return {
    id: idLocale,
    ora_inizio: row.ora_inizio ?? '',
    ora_fine: row.ora_fine ?? '',
    vincitori,
    pareggio: row.pareggio,
    partecipanti,
    nomeLibero: row.nome_libero ?? undefined,
    ...campiSyncPuliti(row),
  };
}
