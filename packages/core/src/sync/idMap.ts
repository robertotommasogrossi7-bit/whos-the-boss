/* ══════════════════════════════════════════════════════
   MAPPA id locale ↔ uid cloud (R7.2d-4, finding S4/S15)
   ─────────────────────────────────────────────────────
   I mapping (mapping*.ts) traducono le RELAZIONI passando per gli uid: una
   riga figlia porta l'uid del genitore/controparte, non il suo id locale. Per
   risolvere serve una tabella di traduzione nei due versi, costruita UNA volta
   a inizio sync (evita N lookup lineari per record, S15).

   Comportamento "creazione offline a catena" (S4): un'entità ancora SENZA uid
   (non battezzata) resta FUORI dalla mappa — non è sincronizzabile finché non
   ha un uid. La mappa è solo lookup: ordinare i push perché i genitori (con
   uid) precedano i figli è responsabilità dell'orchestratore (R7.4).
══════════════════════════════════════════════════════ */

import type { NomeGiocatore } from '../types';

export interface IdUidMap<ID> {
  toUid: Map<ID, string>; // id locale → uid cloud (per il push)
  toLocal: Map<string, ID>; // uid cloud → id locale (per il pull)
}

/** Costruisce le due direzioni da una collezione di entità con `{ uid? }`.
    Le entità senza uid sono saltate (non ancora sincronizzabili, vedi modulo).
    In caso di id o uid duplicati vince l'ultima (una lega ben formata non ne ha). */
export function costruisciIdUidMap<ID, T extends { uid?: string }>(
  items: T[],
  getId: (item: T) => ID,
): IdUidMap<ID> {
  const toUid = new Map<ID, string>();
  const toLocal = new Map<string, ID>();
  for (const item of items) {
    if (!item.uid) continue;
    const id = getId(item);
    toUid.set(id, item.uid);
    toLocal.set(item.uid, id);
  }
  return { toUid, toLocal };
}

/** Mappa `id_nome ↔ uid` dei giocatori di una lega: la risoluzione più usata
    dai mapping (controparti di pagamenti e settlement, `from`/`to`). */
export function mappaGiocatori(nomi: NomeGiocatore[]): IdUidMap<number> {
  return costruisciIdUidMap(nomi, (n) => n.id);
}

/** Elenca gli id delle entità NON ancora sincronizzabili (senza uid), così
    l'orchestratore (R7.4) sa cosa non può ancora risolvere/pushare. */
export function idSenzaUid<ID, T extends { uid?: string }>(
  items: T[],
  getId: (item: T) => ID,
): ID[] {
  return items.filter((i) => !i.uid).map(getId);
}
