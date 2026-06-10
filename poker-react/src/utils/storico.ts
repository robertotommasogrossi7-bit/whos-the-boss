import type { Lega, Partita, SessioneGioco } from '../types';
import { normalizzaNome } from './normalizzaNome';

/* ══════════════════════════════════════════════════════
   STORICO UNIFICATO (Card Tracker #4.6) — layer-dati, funzioni pure
   ─────────────────────────────────────────────────────
   Una sola lista di "voci storico" che mescola i due mondi:
   - poker → una Partita (cash/torneo) di lega.partite
   - gioco → una SessioneGioco chiusa di lega.sessioniGioco
   Su questa base il #4.7b monta il componente condiviso StoricoLista
   (TabStorico, LegaStorico, StoricoShell) — StoricoSessioni è stato assorbito.
══════════════════════════════════════════════════════ */

export type VoceStorico =
  | { kind: 'poker'; data: string; partita: Partita }
  | { kind: 'gioco'; data: string; giocoId: string; sessione: SessioneGioco };

/**
 * Voci storico di una lega, unificate e ordinate per `data` desc.
 * - `giocoId === 'poker'` → solo lega.partite (kind 'poker').
 * - `giocoId` di un gioco → solo le sessioniGioco chiuse di quel gioco (kind 'gioco').
 * - `giocoId` assente     → TUTTO: poker + tutte le sessioniGioco chiuse, mescolate
 *   (copre la lacuna "filtro-gioco assente" di LegaStorico, decisione (d)).
 * - `range` opzionale (preserva il filtro-data del poker; `data` = "YYYY-MM-DD").
 * Ordinamento lessicografico su `data` (le stringhe YYYY-MM-DD si ordinano bene). Pura.
 */
export function vociStorico(
  lega: Lega,
  opts?: { giocoId?: string; range?: { from?: string; to?: string } },
): VoceStorico[] {
  const giocoId = opts?.giocoId;
  const range   = opts?.range;

  const inRange = (data: string): boolean => {
    if (range?.from && data < range.from) return false;
    if (range?.to   && data > range.to)   return false;
    return true;
  };

  const voci: VoceStorico[] = [];

  // Poker: incluso se il filtro è 'poker' o assente.
  if (giocoId === 'poker' || giocoId === undefined) {
    for (const partita of lega.partite) {
      if (!inRange(partita.data)) continue;
      voci.push({ kind: 'poker', data: partita.data, partita });
    }
  }

  // Giochi non-poker: inclusi se il filtro è un gioco specifico o assente.
  if (giocoId !== 'poker') {
    for (const sessione of lega.sessioniGioco ?? []) {
      if (sessione.stato !== 'chiusa') continue;
      if (giocoId !== undefined && sessione.giocoId !== giocoId) continue;
      if (!inRange(sessione.data)) continue;
      voci.push({ kind: 'gioco', data: sessione.data, giocoId: sessione.giocoId, sessione });
    }
  }

  return voci.sort((a, b) => b.data.localeCompare(a.data));
}

/* ══════════════════════════════════════════════════════
   FILTRO PER NOME — STORICO (#4.6, semantica (f))
   Nello storico il filtro è SECCO: rimuove le voci dove il nome non compare
   fra i partecipanti. Match per `normalizzaNome` (#4.5) come substring.
══════════════════════════════════════════════════════ */

/**
 * True se un partecipante della voce matcha la query.
 * - poker → `partita.giocatori[].id_nome`.
 * - gioco → `sessione.partecipanti` ∪ eventuali `partita.partecipanti` (override).
 * `nomeById` risolve id → nome (la lega lo fornisce). Query vuota → true.
 */
export function voceCoinvolgeNome(
  voce:    VoceStorico,
  query:   string,
  nomeById: (id: number) => string,
): boolean {
  const q = normalizzaNome(query);
  if (!q) return true;
  const idMatcha = (id: number) => normalizzaNome(nomeById(id)).includes(q);

  if (voce.kind === 'poker') {
    return voce.partita.giocatori.some(g => idMatcha(g.id_nome));
  }
  const ids = new Set<number>(voce.sessione.partecipanti);
  for (const p of voce.sessione.partite) {
    if (p.partecipanti) for (const id of p.partecipanti) ids.add(id);
  }
  for (const id of ids) if (idMatcha(id)) return true;
  return false;
}

/** Filtro secco: tiene solo le voci che coinvolgono il nome. Query vuota → tutte. */
export function filtraStoricoPerNome(
  voci:    VoceStorico[],
  query:   string,
  nomeById: (id: number) => string,
): VoceStorico[] {
  if (!normalizzaNome(query)) return voci;
  return voci.filter(v => voceCoinvolgeNome(v, query, nomeById));
}
