import { describe, expect, it } from 'vitest';
import type { GiocatorePartita, Partita, Settlement } from '../types';
import {
  giocatorePartitaFromCloudRow, giocatorePartitaToCloudRow,
  movimentiFromCloudRows, movimentiToCloudRows,
  partitaFromCloudRow, partitaToCloudRow,
  settlementFromCloudRow, settlementToCloudRow,
  type PokerMovimentoCloudRow,
} from './mappingPoker';

function partitaBase(over: Partial<Partita> = {}): Partita {
  return {
    id: 1, buy_in: 20, data: '2026-07-11', ora_inizio: '20:00', ora_fine: '23:00',
    modalita: 'cash', giocatori: [], settlements: [],
    uid: 'partita-uid-1', syncUpdatedAt: '2026-07-11T10:00:00.000Z',
    ...over,
  };
}

describe('partitaToCloudRow / partitaFromCloudRow', () => {
  it('mappa i campi di primo livello', () => {
    const row = partitaToCloudRow(partitaBase(), 'lega-uid-1');
    expect(row).toEqual({
      id: 'partita-uid-1', lega_id: 'lega-uid-1', local_id: 1, buy_in: 20,
      data: '2026-07-11', ora_inizio: '20:00', ora_fine: '23:00', modalita: 'cash', deleted_at: null,
    });
  });

  it('lancia se manca uid', () => {
    expect(() => partitaToCloudRow(partitaBase({ uid: undefined }), 'lega-uid-1')).toThrow(/uid/);
  });

  it('round-trip preserva modalita torneo', () => {
    const base = partitaBase({ modalita: 'torneo' });
    const row = {
      id: 'partita-uid-1', lega_id: 'lega-uid-1', local_id: 1, buy_in: 50,
      data: '2026-07-12', ora_inizio: '21:00', ora_fine: '01:00', modalita: 'torneo' as const,
      created_at: '2026-07-11T09:00:00.000Z', updated_at: '2026-07-11T12:00:00.000Z', deleted_at: null,
    };
    const locale = partitaFromCloudRow(row, base);
    expect(locale.modalita).toBe('torneo');
    const back = partitaToCloudRow(locale, 'lega-uid-1');
    expect(back).toEqual({
      id: row.id, lega_id: 'lega-uid-1', local_id: row.local_id, buy_in: row.buy_in,
      data: row.data, ora_inizio: row.ora_inizio, ora_fine: row.ora_fine,
      modalita: row.modalita, deleted_at: row.deleted_at,
    });
  });
});

function giocatorePartitaBase(over: Partial<GiocatorePartita> = {}): GiocatorePartita {
  return {
    id_nome: 1, entrate: 20, ricarica_fatta: 0, extra: 0, soldi_ricevuti: 0,
    fiches_finali: 20, netto_finale: 0, premio: 0, vincitore: false,
    buy_in_pagato: true, extra_pagato: true, ricariche: [], pagamenti_effettuati: [], pagamenti_ricevuti: [],
    posizione_finale: null, add_on_fatto: false, add_on_pagato: false,
    uid: 'gp-uid-1', syncUpdatedAt: '2026-07-11T10:00:00.000Z',
    ...over,
  };
}

describe('giocatorePartitaToCloudRow / giocatorePartitaFromCloudRow', () => {
  it('mappa i campi numerici/booleani, non le liste ricariche/pagamenti', () => {
    const row = giocatorePartitaToCloudRow(giocatorePartitaBase({ vincitore: true, netto_finale: 30 }), 'partita-uid-1', 'giocatore-uid-1');
    expect(row.vincitore).toBe(true);
    expect(row.netto_finale).toBe(30);
    expect(row).not.toHaveProperty('ricariche');
  });

  it('lancia se manca uid', () => {
    expect(() => giocatorePartitaToCloudRow(giocatorePartitaBase({ uid: undefined }), 'p', 'g')).toThrow(/uid/);
  });

  it('round-trip preserva posizione_finale (torneo)', () => {
    const base = giocatorePartitaBase();
    const row = {
      id: 'gp-uid-1', partita_id: 'partita-uid-1', giocatore_id: 'giocatore-uid-1',
      entrate: 20, ricarica_fatta: 10, extra: 0, soldi_ricevuti: 0, fiches_finali: 0,
      netto_finale: -30, premio: 0, vincitore: false, buy_in_pagato: true, extra_pagato: true,
      add_on_fatto: false, add_on_pagato: false, posizione_finale: 3,
      created_at: '2026-07-11T09:00:00.000Z', updated_at: '2026-07-11T12:00:00.000Z', deleted_at: null,
    };
    const locale = giocatorePartitaFromCloudRow(row, base);
    expect(locale.posizione_finale).toBe(3);
    const back = giocatorePartitaToCloudRow(locale, 'partita-uid-1', 'giocatore-uid-1');
    expect(back).toEqual({
      id: row.id, partita_id: row.partita_id, giocatore_id: row.giocatore_id,
      entrate: row.entrate, ricarica_fatta: row.ricarica_fatta, extra: row.extra,
      soldi_ricevuti: row.soldi_ricevuti, fiches_finali: row.fiches_finali, netto_finale: row.netto_finale,
      premio: row.premio, vincitore: row.vincitore, buy_in_pagato: row.buy_in_pagato,
      extra_pagato: row.extra_pagato, add_on_fatto: row.add_on_fatto, add_on_pagato: row.add_on_pagato,
      posizione_finale: row.posizione_finale, deleted_at: row.deleted_at,
    });
  });
});

describe('movimentiFromCloudRows', () => {
  const risolvi = (uid: string) => (uid === 'giocatore-uid-2' ? 2 : 1);

  it('ricostruisce le 3 liste, ordinate per `ordine`', () => {
    const rows: PokerMovimentoCloudRow[] = [
      { id: 'm3', partita_giocatore_id: 'gp-1', tipo: 'ricarica', importo: 10, pagata: true, contro_giocatore_id: null, ordine: 2, created_at: '', updated_at: '' },
      { id: 'm1', partita_giocatore_id: 'gp-1', tipo: 'ricarica', importo: 20, pagata: null, contro_giocatore_id: null, ordine: 0, created_at: '', updated_at: '' },
      { id: 'm2', partita_giocatore_id: 'gp-1', tipo: 'pagamento_effettuato', importo: 5, pagata: false, contro_giocatore_id: 'giocatore-uid-2', ordine: 1, created_at: '', updated_at: '' },
    ];
    const out = movimentiFromCloudRows(rows, risolvi);
    expect(out.ricariche).toEqual([{ importo: 20, pagata: undefined, uid: 'm1' }, { importo: 10, pagata: true, uid: 'm3' }]);
    expect(out.pagamenti_effettuati).toEqual([{ to: 2, amount: 5, pagato: false, uid: 'm2' }]);
    expect(out.pagamenti_ricevuti).toEqual([]);
  });

  it('pagamento_ricevuto risolve `from` tramite risolviIdNome', () => {
    const rows: PokerMovimentoCloudRow[] = [
      { id: 'm1', partita_giocatore_id: 'gp-1', tipo: 'pagamento_ricevuto', importo: 15, pagata: null, contro_giocatore_id: 'giocatore-uid-2', ordine: 0, created_at: '', updated_at: '' },
    ];
    const out = movimentiFromCloudRows(rows, risolvi);
    expect(out.pagamenti_ricevuti).toEqual([{ from: 2, amount: 15, uid: 'm1' }]);
  });

  it('riga pagamento senza contro_giocatore_id: tollerata, non crasha (F1)', () => {
    const rows: PokerMovimentoCloudRow[] = [
      { id: 'm1', partita_giocatore_id: 'gp-1', tipo: 'pagamento_effettuato', importo: 5, pagata: null, contro_giocatore_id: null, ordine: 0, created_at: '', updated_at: '' },
    ];
    expect(() => movimentiFromCloudRows(rows, risolvi)).not.toThrow();
    expect(movimentiFromCloudRows(rows, risolvi).pagamenti_effettuati).toEqual([]);
  });

  it('lista vuota → 3 liste vuote', () => {
    expect(movimentiFromCloudRows([], risolvi)).toEqual({ ricariche: [], pagamenti_effettuati: [], pagamenti_ricevuti: [] });
  });
});

describe('movimentiToCloudRows (push, R7.2d-3)', () => {
  const risolviUid = (idNome: number) => `giocatore-uid-${idNome}`;

  function gpConMovimenti(): GiocatorePartita {
    return {
      id_nome: 1, entrate: 20, ricarica_fatta: 0, extra: 0, soldi_ricevuti: 0,
      fiches_finali: 0, netto_finale: 0, premio: 0, vincitore: false,
      buy_in_pagato: true, extra_pagato: false, posizione_finale: null,
      add_on_fatto: false, add_on_pagato: false,
      ricariche: [{ importo: 20, uid: 'r1' }, { importo: 10, pagata: true, uid: 'r2' }],
      pagamenti_effettuati: [{ to: 2, amount: 5, pagato: false, uid: 'pe1' }],
      pagamenti_ricevuti: [{ from: 3, amount: 8, uid: 'pr1' }],
      uid: 'gp-uid-1',
    };
  }

  it('mappa le 3 liste con `ordine` progressivo, tipo e controparte risolta', () => {
    expect(movimentiToCloudRows(gpConMovimenti(), 'gp-uid-1', risolviUid)).toEqual([
      { id: 'r1', partita_giocatore_id: 'gp-uid-1', tipo: 'ricarica', importo: 20, pagata: null, contro_giocatore_id: null, ordine: 0 },
      { id: 'r2', partita_giocatore_id: 'gp-uid-1', tipo: 'ricarica', importo: 10, pagata: true, contro_giocatore_id: null, ordine: 1 },
      { id: 'pe1', partita_giocatore_id: 'gp-uid-1', tipo: 'pagamento_effettuato', importo: 5, pagata: false, contro_giocatore_id: 'giocatore-uid-2', ordine: 2 },
      { id: 'pr1', partita_giocatore_id: 'gp-uid-1', tipo: 'pagamento_ricevuto', importo: 8, pagata: null, contro_giocatore_id: 'giocatore-uid-3', ordine: 3 },
    ]);
  });

  it('lancia se un movimento non ha uid (generaUid mancante alla creazione)', () => {
    const gp = gpConMovimenti();
    gp.ricariche = [{ importo: 5 }]; // senza uid
    expect(() => movimentiToCloudRows(gp, 'gp-uid-1', risolviUid)).toThrow(/uid/);
  });

  it('round-trip push→pull ricostruisce le stesse liste (uid preservato)', () => {
    const gp = gpConMovimenti();
    const rows = movimentiToCloudRows(gp, 'gp-uid-1', risolviUid)
      .map((r) => ({ ...r, created_at: '', updated_at: '' }));
    const risolviIdNome = (uid: string) => Number(uid.replace('giocatore-uid-', ''));
    const back = movimentiFromCloudRows(rows, risolviIdNome);
    expect(back.ricariche).toEqual(gp.ricariche);
    expect(back.pagamenti_effettuati).toEqual(gp.pagamenti_effettuati);
    expect(back.pagamenti_ricevuti).toEqual(gp.pagamenti_ricevuti);
  });
});

function settlementBase(over: Partial<Settlement> = {}): Settlement {
  return { from: 1, to: 2, amount: 15, pagato: false, uid: 'settlement-uid-1', syncUpdatedAt: '2026-07-11T10:00:00.000Z', ...over };
}

describe('settlementToCloudRow / settlementFromCloudRow', () => {
  it('mappa from/to/amount/pagato/ordine', () => {
    const row = settlementToCloudRow(settlementBase(), 'partita-uid-1', 'giocatore-uid-1', 'giocatore-uid-2', 3);
    expect(row).toEqual({
      id: 'settlement-uid-1', partita_id: 'partita-uid-1', from_giocatore_id: 'giocatore-uid-1',
      to_giocatore_id: 'giocatore-uid-2', amount: 15, pagato: false, ordine: 3, deleted_at: null,
    });
  });

  it('lancia se manca uid', () => {
    expect(() => settlementToCloudRow(settlementBase({ uid: undefined }), 'p', 'g1', 'g2')).toThrow(/uid/);
  });

  it('fromCloudRow risolve from/to tramite risolviIdNome (sono id_nome, non uid)', () => {
    const risolvi = (uid: string) => (uid === 'giocatore-uid-2' ? 2 : 1);
    const base = settlementBase();
    const row = {
      id: 'settlement-uid-1', partita_id: 'partita-uid-1', from_giocatore_id: 'giocatore-uid-1',
      to_giocatore_id: 'giocatore-uid-2', amount: 20, pagato: true, ordine: 1,
      created_at: '2026-07-11T09:00:00.000Z', updated_at: '2026-07-11T12:00:00.000Z', deleted_at: null,
    };
    const out = settlementFromCloudRow(row, base, risolvi);
    expect(out.from).toBe(1);
    expect(out.to).toBe(2);
    expect(out.amount).toBe(20);
    expect(out.pagato).toBe(true);
  });
});
