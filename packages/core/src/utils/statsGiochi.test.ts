import { describe, it, expect } from 'vitest';
import { calcolaStatsGioco } from './statsGiochi';
import type { GiocoLega, SessioneGioco, PartitaGioco } from '../types';

const A = 1, B = 2, C = 3;

function gioco(pareggioComeVittoria = true): GiocoLega {
  return { id: 'scopa', nome: 'Scopa', preimpostato: true, attivo: true, pareggioComeVittoria };
}

function partita(
  id: number,
  vincitori: number[],
  opts: { pareggio?: boolean; partecipanti?: number[] } = {},
): PartitaGioco {
  return {
    id, ora_inizio: '20:00', ora_fine: '20:30',
    vincitori, pareggio: opts.pareggio ?? false,
    partecipanti: opts.partecipanti,
  };
}

function sessione(
  id: number,
  partecipanti: number[],
  partite: PartitaGioco[],
  opts: { stato?: SessioneGioco['stato']; esitoPareggio?: boolean; giocoId?: string } = {},
): SessioneGioco {
  return {
    id, giocoId: opts.giocoId ?? 'scopa', data: '2026-06-01',
    stato: opts.stato ?? 'chiusa', ora_inizio: '20:00', ora_fine: '22:00',
    partecipanti, partite, esitoPareggio: opts.esitoPareggio ?? false,
  };
}

describe('calcolaStatsGioco — statistiche per gioco (SPEC §7)', () => {

  it('1. base: A vince 2/3, B 1/3 — A vince la sessione', () => {
    const sess = [sessione(1, [A, B], [partita(1, [A]), partita(2, [A]), partita(3, [B])])];
    expect(calcolaStatsGioco(gioco(), sess, A)).toEqual({
      sessioniGiocate: 1, sessioniVinte: 1, sessioniPerse: 0, sessioniPareggio: 0,
      partiteGiocate: 3, partiteVinte: 2, partitePerse: 1, partitePareggio: 0,
      percVittorie: 66.7,
    });
    expect(calcolaStatsGioco(gioco(), sess, B)).toEqual({
      sessioniGiocate: 1, sessioniVinte: 0, sessioniPerse: 1, sessioniPareggio: 0,
      partiteGiocate: 3, partiteVinte: 1, partitePerse: 2, partitePareggio: 0,
      percVittorie: 33.3,
    });
  });

  it('2. pareggio partita, pareggioComeVittoria=true: entra nella %', () => {
    const sess = [sessione(1, [A, B], [partita(1, [A]), partita(2, [], { pareggio: true })])];
    const a = calcolaStatsGioco(gioco(true), sess, A);
    expect(a.partiteVinte).toBe(1);
    expect(a.partitePareggio).toBe(1);
    expect(a.partiteGiocate).toBe(2);
    expect(a.percVittorie).toBe(100); // (1 vinta + 1 pareggio) / 2
  });

  it('3. pareggio partita, pareggioComeVittoria=false: NON entra nella %', () => {
    const sess = [sessione(1, [A, B], [partita(1, [A]), partita(2, [], { pareggio: true })])];
    const a = calcolaStatsGioco(gioco(false), sess, A);
    expect(a.partitePareggio).toBe(1); // contato a parte
    expect(a.percVittorie).toBe(50);   // solo 1 vinta / 2 giocate
  });

  it('4a. parità di vittorie → pareggio sessione per entrambi', () => {
    const sess = [sessione(1, [A, B], [partita(1, [A]), partita(2, [B])])];
    const a = calcolaStatsGioco(gioco(), sess, A);
    const b = calcolaStatsGioco(gioco(), sess, B);
    expect(a.sessioniPareggio).toBe(1);
    expect(a.sessioniVinte).toBe(0);
    expect(b.sessioniPareggio).toBe(1);
    expect(b.sessioniVinte).toBe(0);
  });

  it('4b. esitoPareggio=true forza il pareggio anche con un primo netto', () => {
    const sess = [sessione(1, [A, B], [partita(1, [A]), partita(2, [A])], { esitoPareggio: true })];
    const a = calcolaStatsGioco(gioco(), sess, A);
    expect(a.partiteVinte).toBe(2);  // A ha vinto entrambe le partite
    expect(a.sessioniVinte).toBe(0); // ma la sessione è dichiarata pareggio
    expect(a.sessioniPareggio).toBe(1);
  });

  it('5. partecipanti per-partita: C non gioca la partita override', () => {
    const sess = [sessione(1, [A, B, C], [
      partita(1, [A], { partecipanti: [A, B] }), // C non gioca questa
      partita(2, [C]),                           // default [A,B,C]
    ])];
    const c = calcolaStatsGioco(gioco(), sess, C);
    expect(c.partiteGiocate).toBe(1); // solo la partita 2
    expect(c.partiteVinte).toBe(1);
    expect(c.sessioniGiocate).toBe(1); // C è tra i partecipanti della sessione
    expect(calcolaStatsGioco(gioco(), sess, A).partiteGiocate).toBe(2); // A gioca entrambe
  });

  it('ignora sessioni non chiuse e di altri giochi', () => {
    const sess = [
      sessione(1, [A], [partita(1, [A])], { stato: 'attiva' }),     // non chiusa
      sessione(2, [A], [partita(1, [A])], { giocoId: 'briscola' }), // altro gioco
    ];
    expect(calcolaStatsGioco(gioco(), sess, A).sessioniGiocate).toBe(0);
  });

  it('giocatore non partecipante / nessuna sessione → tutto a zero, % 0', () => {
    const sess = [sessione(1, [A, B], [partita(1, [A])])];
    const z = calcolaStatsGioco(gioco(), sess, C); // C non è nella sessione
    expect(z.sessioniGiocate).toBe(0);
    expect(z.partiteGiocate).toBe(0);
    expect(z.percVittorie).toBe(0);
  });

});
