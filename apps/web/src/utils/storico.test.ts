import { describe, it, expect } from 'vitest';
import { vociStorico, voceCoinvolgeNome, filtraStoricoPerNome, type VoceStorico } from './storico';
import type { Lega, Partita, GiocatorePartita, SessioneGioco, PartitaGioco, NomeGiocatore } from '../types';

const A = 1, B = 2;

/* ── builders ── */

function gpok(id_nome: number, netto = 0, vincitore = false): GiocatorePartita {
  return {
    id_nome, entrate: 0, ricarica_fatta: 0, extra: 0, soldi_ricevuti: 0,
    fiches_finali: 0, netto_finale: netto, premio: 0, vincitore,
    buy_in_pagato: true, extra_pagato: false, ricariche: [],
    pagamenti_effettuati: [], pagamenti_ricevuti: [],
    posizione_finale: null, add_on_fatto: false, add_on_pagato: false,
  };
}

function ppok(id: number, data: string, giocatori: GiocatorePartita[]): Partita {
  return { id, buy_in: 25, data, ora_inizio: '21:00', ora_fine: '00:00', modalita: 'cash', giocatori, settlements: [] };
}

function pgioco(id: number, vincitori: number[], partecipanti?: number[]): PartitaGioco {
  return { id, ora_inizio: '20:00', ora_fine: '20:30', vincitori, pareggio: false, partecipanti };
}

function sgioco(
  id: number, data: string, giocoId: string, partecipanti: number[], partite: PartitaGioco[],
  stato: SessioneGioco['stato'] = 'chiusa',
): SessioneGioco {
  return { id, giocoId, data, stato, ora_inizio: '20:00', ora_fine: '22:00', partecipanti, partite, esitoPareggio: false };
}

function mkLega(
  nomi: NomeGiocatore[], partite: Partita[], sessioniGioco: SessioneGioco[],
): Lega {
  return {
    id: 1, nome: 'Lega', foto: '', nomi, partite,
    sessioneAttiva: undefined, serate_bg: [], _nid: 10, _pid: 10,
    sessioniGioco, personale: false,
  };
}

const nomi: NomeGiocatore[] = [{ id: A, nome: 'Alice' }, { id: B, nome: 'Bob' }];

/* ══════════════════════════════════════════════════════
   vociStorico
══════════════════════════════════════════════════════ */

describe('vociStorico', () => {
  it('giocoId "poker" → solo le partite poker', () => {
    const lega = mkLega(
      nomi,
      [ppok(1, '2026-06-02', [gpok(A, 10, true)])],
      [sgioco(1, '2026-06-03', 'scopa', [A], [pgioco(1, [A])])],
    );
    const voci = vociStorico(lega, { giocoId: 'poker' });
    expect(voci.length).toBe(1);
    expect(voci[0]!.kind).toBe('poker');
  });

  it('giocoId di un gioco → solo le sessioni chiuse di quel gioco', () => {
    const lega = mkLega(
      nomi,
      [ppok(1, '2026-06-02', [gpok(A, 10, true)])],
      [
        sgioco(1, '2026-06-03', 'scopa',    [A], [pgioco(1, [A])]),
        sgioco(2, '2026-06-04', 'briscola', [A], [pgioco(2, [A])]),
      ],
    );
    const voci = vociStorico(lega, { giocoId: 'scopa' });
    expect(voci.length).toBe(1);
    expect(voci[0]!.kind === 'gioco' && voci[0]!.giocoId).toBe('scopa');
  });

  it('giocoId assente → TUTTO mescolato e ordinato per data desc', () => {
    const lega = mkLega(
      nomi,
      [
        ppok(1, '2026-06-01', [gpok(A, 10, true)]),
        ppok(2, '2026-06-05', [gpok(B, 10, true)]),
      ],
      [
        sgioco(1, '2026-06-03', 'scopa',    [A], [pgioco(1, [A])]),
        sgioco(2, '2026-06-07', 'briscola', [A], [pgioco(2, [A])]),
      ],
    );
    const voci = vociStorico(lega);
    expect(voci.map(v => v.data)).toEqual(['2026-06-07', '2026-06-05', '2026-06-03', '2026-06-01']);
    // mix dei due kind
    expect(voci[0]!.kind).toBe('gioco');   // 07 briscola
    expect(voci[1]!.kind).toBe('poker');   // 05 poker
  });

  it('ignora le sessioni non chiuse (solo "chiusa")', () => {
    const lega = mkLega(
      nomi, [],
      [
        sgioco(1, '2026-06-03', 'scopa', [A], [pgioco(1, [A])], 'chiusa'),
        sgioco(2, '2026-06-04', 'scopa', [A], [pgioco(2, [A])], 'attiva'),
        sgioco(3, '2026-06-05', 'scopa', [A], [],               'pre'),
      ],
    );
    const voci = vociStorico(lega);
    expect(voci.length).toBe(1);
    expect(voci[0]!.data).toBe('2026-06-03');
  });

  it('range data filtra poker e giochi insieme', () => {
    const lega = mkLega(
      nomi,
      [
        ppok(1, '2026-05-20', [gpok(A, 1, true)]),  // fuori
        ppok(2, '2026-06-10', [gpok(A, 1, true)]),  // dentro
      ],
      [
        sgioco(1, '2026-06-15', 'scopa', [A], [pgioco(1, [A])]),  // dentro
        sgioco(2, '2026-07-01', 'scopa', [A], [pgioco(2, [A])]),  // fuori
      ],
    );
    const voci = vociStorico(lega, { range: { from: '2026-06-01', to: '2026-06-30' } });
    expect(voci.map(v => v.data)).toEqual(['2026-06-15', '2026-06-10']);
  });

  it('lega senza poker (partite vuote) → solo voci gioco', () => {
    const lega = mkLega(nomi, [], [sgioco(1, '2026-06-03', 'scopa', [A], [pgioco(1, [A])])]);
    const voci = vociStorico(lega);
    expect(voci.length).toBe(1);
    expect(voci[0]!.kind).toBe('gioco');
  });

  it('lega senza sessioniGioco (undefined) → solo voci poker, niente crash', () => {
    const lega: Lega = { ...mkLega(nomi, [ppok(1, '2026-06-03', [gpok(A, 5, true)])], []), sessioniGioco: undefined };
    const voci = vociStorico(lega);
    expect(voci.length).toBe(1);
    expect(voci[0]!.kind).toBe('poker');
  });

  it('lega completamente vuota → []', () => {
    expect(vociStorico(mkLega(nomi, [], []))).toEqual([]);
  });
});

/* ══════════════════════════════════════════════════════
   filtro per nome — STORICO (#4.6, filtro secco)
══════════════════════════════════════════════════════ */

const nomeById = (id: number) => nomi.find(n => n.id === id)?.nome ?? '?';

describe('voceCoinvolgeNome', () => {
  it('poker: matcha un giocatore della partita (per id_nome)', () => {
    const voce: VoceStorico = { kind: 'poker', data: '2026-06-01', partita: ppok(1, '2026-06-01', [gpok(A, 10, true), gpok(B, -10)]) };
    expect(voceCoinvolgeNome(voce, 'alice', nomeById)).toBe(true);
    expect(voceCoinvolgeNome(voce, 'carla', nomeById)).toBe(false);
  });

  it('gioco: matcha un partecipante della sessione', () => {
    const voce: VoceStorico = { kind: 'gioco', data: '2026-06-01', giocoId: 'scopa', sessione: sgioco(1, '2026-06-01', 'scopa', [A], [pgioco(1, [A])]) };
    expect(voceCoinvolgeNome(voce, 'alice', nomeById)).toBe(true);
    expect(voceCoinvolgeNome(voce, 'bob', nomeById)).toBe(false);
  });

  it('gioco: matcha anche un partecipante presente solo nell\'override di una partita', () => {
    // sessione coi soli [A]; una partita ha override partecipanti [A, B]
    const voce: VoceStorico = { kind: 'gioco', data: '2026-06-01', giocoId: 'scopa', sessione: sgioco(1, '2026-06-01', 'scopa', [A], [pgioco(1, [A], [A, B])]) };
    expect(voceCoinvolgeNome(voce, 'bob', nomeById)).toBe(true);
  });

  it('query vuota → true', () => {
    const voce: VoceStorico = { kind: 'poker', data: '2026-06-01', partita: ppok(1, '2026-06-01', [gpok(A)]) };
    expect(voceCoinvolgeNome(voce, '', nomeById)).toBe(true);
  });
});

describe('filtraStoricoPerNome', () => {
  const voci: VoceStorico[] = [
    { kind: 'poker', data: '2026-06-05', partita: ppok(1, '2026-06-05', [gpok(A, 10, true), gpok(B, -10)]) },
    { kind: 'gioco', data: '2026-06-03', giocoId: 'scopa', sessione: sgioco(1, '2026-06-03', 'scopa', [B], [pgioco(1, [B])]) },
  ];

  it('filtro secco: tiene solo le voci col nome', () => {
    const out = filtraStoricoPerNome(voci, 'alice', nomeById);
    expect(out.length).toBe(1);
    expect(out[0]!.kind).toBe('poker');
  });

  it('"bob" compare in entrambe', () => {
    expect(filtraStoricoPerNome(voci, 'bob', nomeById).length).toBe(2);
  });

  it('query vuota → tutte le voci (stesso riferimento)', () => {
    expect(filtraStoricoPerNome(voci, '   ', nomeById)).toBe(voci);
  });

  it('nessun match → []', () => {
    expect(filtraStoricoPerNome(voci, 'zelda', nomeById)).toEqual([]);
  });
});
