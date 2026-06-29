import type { Lega } from '../types';
import { normalizzaNome, èSeiTu } from './normalizzaNome';

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
  username?: string | null,
): string | null {
  const n = nuovoNome.trim();
  if (!n) return 'Inserisci un nome';
  const rec = lega.nomi.find(x => x.id === idNome);
  if (!rec) return 'Giocatore non trovato';
  if (èSeiTu(rec.nome, username)) return 'Il tuo nome si cambia dall\'account';
  const norm = normalizzaNome(n);
  if (lega.nomi.some(x => x.id !== idNome && normalizzaNome(x.nome) === norm)) {
    return 'Nome già presente';
  }
  return null;
}
