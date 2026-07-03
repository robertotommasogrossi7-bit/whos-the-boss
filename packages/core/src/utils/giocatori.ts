import type { Lega, Sessione } from '../types';
import { normalizzaNome } from './normalizzaNome';
import { èSeiTuRecord } from './personale';

/* ══════════════════════════════════════════════════════
   GIOCATORI — validazioni condivise (#4.7c)
   Il soprannome è COSMETICO: rinominare cambia solo `nome`, l'`id` resta
   stabile → si propaga ovunque (classifica/storico risolvono per id).
   Il record "sei tu" NON si rinomina: il tuo nome è account-level (→ #8).
══════════════════════════════════════════════════════ */

/**
 * Valida un rename di giocatore. Pura: ritorna un messaggio d'errore (stringa)
 * o `null` se valido. La usa l'azione store `rinominaGiocatore`.
 * - nome vuoto → errore;
 * - record assente → errore;
 * - record "sei tu" → vietato (nome account-level);
 * - collisione (NORMALIZZATA) con un ALTRO giocatore della lega → vietato.
 *   Ritoccare maiuscole/accenti del proprio record è ok (stesso id).
 */
export function validaRinomina(
  lega:      Lega,
  idNome:    number,
  nuovoNome: string,
  accountId?: string | null,
): string | null {
  const n = nuovoNome.trim();
  if (!n) return 'Inserisci un nome';
  const rec = lega.nomi.find(x => x.id === idNome);
  if (!rec) return 'Giocatore non trovato';
  if (èSeiTuRecord(rec, accountId)) return 'Il tuo nome si cambia dall\'account';
  const norm = normalizzaNome(n);
  if (lega.nomi.some(x => x.id !== idNome && normalizzaNome(x.nome) === norm)) {
    return 'Nome già presente';
  }
  return null;
}

/**
 * True se `idNome` compare in QUALSIASI contenitore della lega — non solo le
 * partite poker salvate (M9, audit 2026-07-03): serve a `eliminaGiocatore`
 * per non lasciare orfani in storico/classifiche multigioco o in una sessione
 * live. Copre: partite poker salvate, sessione poker live (attiva + quelle in
 * coda), sessioni/partite/serate multigioco. Pura.
 */
export function giocatoreInUso(lega: Lega, idNome: number): boolean {
  if (lega.partite.some(p => p.giocatori.some(g => g.id_nome === idNome))) return true;

  const inSessionePoker = (s: Sessione | undefined): boolean =>
    !!s && s.giocatori.some(g => g.id_nome === idNome);
  if (inSessionePoker(lega.sessioneAttiva)) return true;
  if (lega.serate_bg.some(inSessionePoker)) return true;

  if ((lega.sessioniGioco ?? []).some(sg =>
    sg.partecipanti.includes(idNome) ||
    sg.partite.some(p => p.vincitori.includes(idNome) || (p.partecipanti ?? []).includes(idNome)),
  )) return true;

  if ((lega.serate ?? []).some(s => s.partecipanti.includes(idNome))) return true;

  return false;
}
