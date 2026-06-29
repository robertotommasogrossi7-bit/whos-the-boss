import { describe, it, expect } from 'vitest';
import {
  nuovaSessioneGioco,
  nuovaPartitaGioco,
  prossimoIdPartita,
  partitaInCorso,
  partecipantiPartita,
  esitoSessione,
} from './sessioneGioco';
import { calcolaStatsGioco } from './statsGiochi';
import type { GiocoLega, SessioneGioco, PartitaGioco } from '../types';

const A = 1, B = 2, C = 3;

function gioco(pareggioComeVittoria = true): GiocoLega {
  return { id: 'scopa', nome: 'Scopa', preimpostato: true, attivo: true, pareggioComeVittoria };
}

/** Partita "chiusa" pronta all'uso nei test. */
function partita(
  id: number,
  vincitori: number[],
  opts: { pareggio?: boolean; partecipanti?: number[]; nomeLibero?: string } = {},
): PartitaGioco {
  return {
    id, ora_inizio: '20:00', ora_fine: '20:30',
    vincitori, pareggio: opts.pareggio ?? false,
    partecipanti: opts.partecipanti,
    nomeLibero: opts.nomeLibero,
  };
}

function sessioneChiusa(
  id: number,
  partecipanti: number[],
  partite: PartitaGioco[],
  opts: { esitoPareggio?: boolean } = {},
): SessioneGioco {
  return {
    id, giocoId: 'scopa', data: '2026-06-01', stato: 'chiusa',
    ora_inizio: '20:00', ora_fine: '22:00',
    partecipanti, partite, esitoPareggio: opts.esitoPareggio ?? false,
  };
}

describe('costruttori puri sessione/partita (M3)', () => {
  it('nuovaSessioneGioco: stato pre, orari/partite/esito vuoti', () => {
    const s = nuovaSessioneGioco(7, 'scopa', [A, B], '2026-06-03', '21:00');
    expect(s).toEqual({
      id: 7, giocoId: 'scopa', data: '2026-06-03', stato: 'pre',
      ora_inizio: '21:00', ora_fine: '', partecipanti: [A, B],
      partite: [], esitoPareggio: false,
    });
  });

  it('nuovaPartitaGioco: in corso (ora_fine vuota), nessun vincitore', () => {
    const p = nuovaPartitaGioco(1, '21:05');
    expect(p).toEqual({ id: 1, ora_inizio: '21:05', ora_fine: '', vincitori: [], pareggio: false });
    expect(partitaInCorso(p)).toBe(true);
    expect(partitaInCorso({ ...p, ora_fine: '21:20' })).toBe(false);
  });

  it('prossimoIdPartita: max+1 (robusto a id non contigui)', () => {
    const s = sessioneChiusa(1, [A], []);
    expect(prossimoIdPartita(s)).toBe(1);
    expect(prossimoIdPartita({ ...s, partite: [partita(1, [A]), partita(5, [A])] })).toBe(6);
  });

  it('partecipantiPartita: override se presente, sennò quelli della sessione', () => {
    const s = sessioneChiusa(1, [A, B, C], []);
    expect(partecipantiPartita(s, partita(1, [A]))).toEqual([A, B, C]);
    expect(partecipantiPartita(s, partita(1, [A], { partecipanti: [A, B] }))).toEqual([A, B]);
  });
});

describe('esitoSessione (SPEC §7)', () => {
  it('vincitore singolo: A vince 2 partite su 3', () => {
    const s = sessioneChiusa(1, [A, B], [partita(1, [A]), partita(2, [A]), partita(3, [B])]);
    const e = esitoSessione(s);
    expect(e.pareggio).toBe(false);
    expect(e.vincitori).toEqual([A]);
    expect(e.vittorie.get(A)).toBe(2);
    expect(e.vittorie.get(B)).toBe(1);
  });

  it('parità in testa → pareggio, nessun vincitore', () => {
    const s = sessioneChiusa(1, [A, B], [partita(1, [A]), partita(2, [B])]);
    const e = esitoSessione(s);
    expect(e.pareggio).toBe(true);
    expect(e.vincitori).toEqual([]);
  });

  it('esitoPareggio forza il pareggio anche con un leader netto', () => {
    const s = sessioneChiusa(1, [A, B], [partita(1, [A]), partita(2, [A])], { esitoPareggio: true });
    const e = esitoSessione(s);
    expect(e.pareggio).toBe(true);
    expect(e.vincitori).toEqual([]);
    expect(e.vittorie.get(A)).toBe(2); // le vittorie restano contate
  });

  it('nomeLibero è ininfluente sull\'esito e sulle statistiche', () => {
    const base = sessioneChiusa(1, [A, B], [partita(1, [A]), partita(2, [A]), partita(3, [B])]);
    const conNome = sessioneChiusa(1, [A, B], [
      partita(1, [A], { nomeLibero: 'Briscola chiamata' }),
      partita(2, [A]),
      partita(3, [B], { nomeLibero: 'Tressette' }),
    ]);
    expect(esitoSessione(conNome)).toEqual(esitoSessione(base));
    expect(calcolaStatsGioco(gioco(), [conNome], A)).toEqual(calcolaStatsGioco(gioco(), [base], A));
  });
});

describe('coerenza esitoSessione ↔ calcolaStatsGioco (stesse regole §7)', () => {
  // Scenari che coprono: leader netto, parità, override partecipanti, esitoPareggio.
  const scenari: SessioneGioco[] = [
    sessioneChiusa(1, [A, B], [partita(1, [A]), partita(2, [A]), partita(3, [B])]),       // A leader
    sessioneChiusa(2, [A, B], [partita(1, [A]), partita(2, [B])]),                         // parità
    sessioneChiusa(3, [A, B], [partita(1, [A]), partita(2, [A])], { esitoPareggio: true }),// pareggio dichiarato
    sessioneChiusa(4, [A, B, C], [                                                         // override
      partita(1, [A], { partecipanti: [A, B] }),
      partita(2, [C]),
      partita(3, [C]),
    ]),
  ];

  it('per ogni partecipante, l\'esito sessione combacia coi conteggi delle stat', () => {
    for (const sess of scenari) {
      const e = esitoSessione(sess);
      const max = Math.max(...e.vittorie.values());
      for (const id of sess.partecipanti) {
        const stats = calcolaStatsGioco(gioco(), [sess], id);
        const vinta = e.vincitori.includes(id);
        // §7: vinto = leader unico; pareggio = dichiarato (per tutti) o parità in
        // testa (solo per chi è in testa); altrimenti persa.
        const inTesta = e.vittorie.get(id) === max;
        const expPareggio = !vinta && (sess.esitoPareggio || inTesta);
        const expPersa = !vinta && !expPareggio;
        expect(stats.sessioniVinte).toBe(vinta ? 1 : 0);
        expect(stats.sessioniPareggio).toBe(expPareggio ? 1 : 0);
        expect(stats.sessioniPerse).toBe(expPersa ? 1 : 0);
      }
    }
  });
});
