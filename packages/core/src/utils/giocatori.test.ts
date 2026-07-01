import { describe, it, expect } from 'vitest';
import { validaRinomina } from './giocatori';
import type { Lega, NomeGiocatore } from '../types';

function mkLega(nomi: NomeGiocatore[], personale = false): Lega {
  return {
    id: 1, nome: 'Lega', foto: '', nomi,
    partite: [], sessioneAttiva: undefined, serate_bg: [],
    _nid: 100, _pid: 1, personale,
  };
}

describe('validaRinomina (#4.7c)', () => {
  const lega = mkLega([
    { id: 1, nome: 'Giulio Rossi', accountId: 'a1' },
    { id: 2, nome: 'Giulio Bianchi' },
    { id: 3, nome: 'José' },
  ]);

  it('nome vuoto → errore', () => {
    expect(validaRinomina(lega, 1, '   ', null)).toBe('Inserisci un nome');
  });

  it('record inesistente → errore', () => {
    expect(validaRinomina(lega, 99, 'Pippo', null)).toBe('Giocatore non trovato');
  });

  it('rename valido → null (id resta, cambia solo il nome)', () => {
    expect(validaRinomina(lega, 1, 'Giulio R.', null)).toBeNull();
  });

  it('collisione con un ALTRO giocatore → "Nome già presente"', () => {
    expect(validaRinomina(lega, 1, 'Giulio Bianchi', null)).toBe('Nome già presente');
  });

  it('collisione NORMALIZZATA (accenti/maiuscole) con un altro → bloccata', () => {
    expect(validaRinomina(lega, 1, 'JOSE', null)).toBe('Nome già presente'); // ≡ José (id 3)
  });

  it('ritocco del PROPRIO record (case/accenti) → ok (stesso id, niente collisione con sé)', () => {
    expect(validaRinomina(lega, 3, 'jose', null)).toBeNull();   // José → jose, stesso record
    expect(validaRinomina(lega, 1, 'GIULIO ROSSI', null)).toBeNull();
  });

  it('blocco sul record dell\'account loggato (sei tu)', () => {
    expect(validaRinomina(lega, 1, 'Nuovo Nome', 'a1')).toBe('Il tuo nome si cambia dall\'account');
  });

  it('record di un ALTRO account → nessun blocco "sei tu"', () => {
    // id 1 è dell'account a1; loggato come a2 → puoi rinominarlo (non sei tu)
    expect(validaRinomina(lega, 1, 'Giulio R.', 'a2')).toBeNull();
  });

  it('record guest (senza account) → nessun blocco "sei tu"', () => {
    expect(validaRinomina(lega, 2, 'Giulio B.', 'a1')).toBeNull();
  });
});
