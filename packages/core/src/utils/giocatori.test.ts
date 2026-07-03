import { describe, it, expect } from 'vitest';
import { validaRinomina, giocatoreInUso } from './giocatori';
import type { Lega, NomeGiocatore, Sessione } from '../types';

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

function mkSessPoker(idsGiocatori: number[]): Sessione {
  return {
    data: '', ora_inizio: '', ora_fine: '', modalita: 'cash',
    buy_in: 25, fiche_iniziali: 0, num_giocatori_target: 0, num_tavoli: 1,
    durata_ore: 0, livelli: [], late_reg: { fino_a_livello: 0 },
    add_on: { abilitato: false, fiche: 0, prezzo: 0 },
    premi: [], premi_consolidati: false,
    stato: 'attivo', livello_corrente: 0, inizio_livello_ms: 0, trascorso_ms: 0,
    giocatori: idsGiocatori.map(id_nome => ({
      id_nome, entrato: true, entrata: 25, versato: 0,
      buy_in_pagato: false, extra_amt: 0, extra_pagato: true,
      ricariche: [], rebuys: [], soldi_ricevuti: 0,
      fiches_finali: 0, seat: null, add_on_fatto: false, add_on_pagato: false,
      eliminato: false, posizione_finale: null, elim_ts_ms: null, prize_pagato: false,
    })),
  };
}

describe('giocatoreInUso — copertura di TUTTI i contenitori (M9, audit 2026-07-03)', () => {
  it('nessun contenitore → non in uso', () => {
    const lega = mkLega([{ id: 1, nome: 'Anna' }]);
    expect(giocatoreInUso(lega, 1)).toBe(false);
  });

  it('partita poker salvata → in uso (comportamento pre-esistente, invariato)', () => {
    const lega: Lega = {
      ...mkLega([{ id: 1, nome: 'Anna' }]),
      partite: [{ id: 1, buy_in: 25, data: '', ora_inizio: '', ora_fine: '', modalita: 'cash', giocatori: [{ id_nome: 1 } as never], settlements: [] }],
    };
    expect(giocatoreInUso(lega, 1)).toBe(true);
  });

  it('sessione poker ATTIVA (live) → in uso', () => {
    const lega: Lega = { ...mkLega([{ id: 1, nome: 'Anna' }]), sessioneAttiva: mkSessPoker([1, 2]) };
    expect(giocatoreInUso(lega, 1)).toBe(true);
    expect(giocatoreInUso(lega, 99)).toBe(false);
  });

  it('sessione poker in CODA (serate_bg) → in uso', () => {
    const lega: Lega = { ...mkLega([{ id: 1, nome: 'Anna' }]), serate_bg: [mkSessPoker([1])] };
    expect(giocatoreInUso(lega, 1)).toBe(true);
  });

  it('sessioniGioco.partecipanti (multigioco) → in uso', () => {
    const lega: Lega = {
      ...mkLega([{ id: 1, nome: 'Anna' }]),
      sessioniGioco: [{ id: 1, giocoId: 'scopa', data: '', stato: 'attiva', ora_inizio: '', ora_fine: '', partecipanti: [1], partite: [], esitoPareggio: false }],
    };
    expect(giocatoreInUso(lega, 1)).toBe(true);
  });

  it('sessioniGioco.partite[].vincitori → in uso', () => {
    const lega: Lega = {
      ...mkLega([{ id: 1, nome: 'Anna' }]),
      sessioniGioco: [{
        id: 1, giocoId: 'scopa', data: '', stato: 'chiusa', ora_inizio: '', ora_fine: '', partecipanti: [], esitoPareggio: false,
        partite: [{ id: 1, ora_inizio: '', ora_fine: '', vincitori: [1], pareggio: false }],
      }],
    };
    expect(giocatoreInUso(lega, 1)).toBe(true);
  });

  it('sessioniGioco.partite[].partecipanti (override per-partita) → in uso', () => {
    const lega: Lega = {
      ...mkLega([{ id: 1, nome: 'Anna' }]),
      sessioniGioco: [{
        id: 1, giocoId: 'scopa', data: '', stato: 'chiusa', ora_inizio: '', ora_fine: '', partecipanti: [], esitoPareggio: false,
        partite: [{ id: 1, ora_inizio: '', ora_fine: '', vincitori: [], pareggio: true, partecipanti: [1] }],
      }],
    };
    expect(giocatoreInUso(lega, 1)).toBe(true);
  });

  it('serate.partecipanti (serata multi-gioco) → in uso', () => {
    const lega: Lega = { ...mkLega([{ id: 1, nome: 'Anna' }]), serate: [{ id: 1, data: '', partecipanti: [1] }] };
    expect(giocatoreInUso(lega, 1)).toBe(true);
  });

  it('presente ma con un ALTRO id → non in uso', () => {
    const lega: Lega = {
      ...mkLega([{ id: 1, nome: 'Anna' }, { id: 2, nome: 'Bruno' }]),
      sessioniGioco: [{ id: 1, giocoId: 'scopa', data: '', stato: 'attiva', ora_inizio: '', ora_fine: '', partecipanti: [2], partite: [], esitoPareggio: false }],
    };
    expect(giocatoreInUso(lega, 1)).toBe(false);
  });
});
