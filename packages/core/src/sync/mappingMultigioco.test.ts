import { describe, expect, it } from 'vitest';
import type { PartitaGioco, SerataMulti, SessioneGioco } from '../types';
import {
  partitaGiocoFromCloudRow, partitaGiocoToCloudRow,
  serataFromCloudRow, serataToCloudRow,
  sessioneGiocoFromCloudRow, sessioneGiocoToCloudRow,
} from './mappingMultigioco';

function serataBase(over: Partial<SerataMulti> = {}): SerataMulti {
  return { id: 1, data: '2026-07-11', partecipanti: [], uid: 'serata-uid-1', syncUpdatedAt: '2026-07-11T10:00:00.000Z', ...over };
}

describe('serataToCloudRow / serataFromCloudRow', () => {
  it('mappa data/local_id, non tocca partecipanti (ponte a parte)', () => {
    const row = serataToCloudRow(serataBase(), 'lega-uid-1');
    expect(row).toEqual({ id: 'serata-uid-1', lega_id: 'lega-uid-1', local_id: 1, data: '2026-07-11', deleted_at: null });
  });

  it('lancia se manca uid', () => {
    expect(() => serataToCloudRow(serataBase({ uid: undefined }), 'lega-uid-1')).toThrow(/uid/);
  });

  it('round-trip', () => {
    const base = serataBase();
    const row = {
      id: 'serata-uid-1', lega_id: 'lega-uid-1', local_id: 1, data: '2026-07-12',
      created_at: '2026-07-11T09:00:00.000Z', updated_at: '2026-07-11T12:00:00.000Z', deleted_at: null,
    };
    const locale = serataFromCloudRow(row, base);
    expect(locale.data).toBe('2026-07-12');
    expect(locale.partecipanti).toBe(base.partecipanti); // collezione via ponte, intatta
    const back = serataToCloudRow(locale, 'lega-uid-1');
    expect(back).toEqual({ id: row.id, lega_id: 'lega-uid-1', local_id: row.local_id, data: row.data, deleted_at: row.deleted_at });
  });
});

function sessioneGiocoBase(over: Partial<SessioneGioco> = {}): SessioneGioco {
  return {
    id: 1, giocoId: 'scopa', data: '2026-07-11', stato: 'pre', ora_inizio: '20:00', ora_fine: '',
    partecipanti: [], partite: [], esitoPareggio: false,
    uid: 'sessione-uid-1', syncUpdatedAt: '2026-07-11T10:00:00.000Z',
    ...over,
  };
}

describe('sessioneGiocoToCloudRow / sessioneGiocoFromCloudRow', () => {
  it('gioco_lega_id e serata_id risolti da chi chiama, non dal tipo locale', () => {
    const row = sessioneGiocoToCloudRow(sessioneGiocoBase(), 'lega-uid-1', 'gioco-uid-1', 'serata-uid-1');
    expect(row.gioco_lega_id).toBe('gioco-uid-1');
    expect(row.serata_id).toBe('serata-uid-1');
  });

  /* G1 (R7_SCHEMA sez. Q): l'identità del gioco viaggia SEMPRE in gioco_key,
     anche quando non esiste nessuna riga di override in giochi_lega — che è il
     caso normale finché non arriva M5. Prima esisteva solo la FK, e il cloud
     non sapeva mai quale gioco fosse stato giocato. */
  it('gioco_key porta l\'identità del gioco anche senza riga di override (caso normale)', () => {
    const row = sessioneGiocoToCloudRow(sessioneGiocoBase({ giocoId: 'scopa' }), 'lega-uid-1', null);
    expect(row.gioco_key).toBe('scopa');
    expect(row.gioco_lega_id).toBeNull();
  });

  it('senza serata (sessione libera, non in una serata multi-gioco): serata_id null', () => {
    const row = sessioneGiocoToCloudRow(sessioneGiocoBase(), 'lega-uid-1', 'gioco-uid-1');
    expect(row.serata_id).toBeNull();
  });

  it('fromCloudRow prende il gioco da gioco_key e traduce la serata con la lookup', () => {
    const base = sessioneGiocoBase();
    const row = {
      id: 'sessione-uid-1', lega_id: 'lega-uid-1', local_id: 1,
      gioco_key: 'scopa', gioco_lega_id: null,
      data: '2026-07-11', stato: 'chiusa' as const, ora_inizio: '20:00', ora_fine: '23:00',
      esito_pareggio: false, serata_id: 'serata-uid-1',
      created_at: '2026-07-11T09:00:00.000Z', updated_at: '2026-07-11T12:00:00.000Z', deleted_at: null,
    };
    const out = sessioneGiocoFromCloudRow(row, base, (uid) => (uid === 'serata-uid-1' ? 7 : undefined));
    expect(out.giocoId).toBe('scopa');
    expect(out.serataId).toBe(7);
    expect(out.stato).toBe('chiusa');
  });

  /* Il caso che G1 sblocca per R7.4b: una riga che arriva da un ALTRO device
     non ha una `base` locale sensata — il gioco DEVE venire dal cloud. Prima
     si ripiegava su `base.giocoId`, che qui sarebbe un valore inventato. */
  it('materializzazione da un altro device: il gioco arriva dal cloud, non dalla base', () => {
    const row = {
      id: 'sessione-uid-9', lega_id: 'lega-uid-1', local_id: 4,
      gioco_key: 'briscola', gioco_lega_id: null,
      data: '2026-07-17', stato: 'chiusa' as const, ora_inizio: '21:00', ora_fine: '22:00',
      esito_pareggio: false, serata_id: null,
      created_at: '2026-07-17T09:00:00.000Z', updated_at: '2026-07-17T12:00:00.000Z', deleted_at: null,
    };
    const out = sessioneGiocoFromCloudRow(row, sessioneGiocoBase({ giocoId: 'scopa' }), () => undefined);
    expect(out.giocoId).toBe('briscola');
  });
});

function partitaGiocoBase(over: Partial<PartitaGioco> = {}): PartitaGioco {
  return { id: 1, ora_inizio: '20:05', ora_fine: '', vincitori: [], pareggio: false, uid: 'pg-uid-1', syncUpdatedAt: '2026-07-11T10:00:00.000Z', ...over };
}

describe('partitaGiocoToCloudRow / partitaGiocoFromCloudRow', () => {
  it('usa l\'id locale come ordine (nessun campo ordine dedicato)', () => {
    const row = partitaGiocoToCloudRow(partitaGiocoBase({ id: 3 }), 'sessione-uid-1');
    expect(row.ordine).toBe(3);
    expect(row.local_id).toBe(3);
  });

  it('nomeLibero passa, non tocca vincitori/partecipanti (ponti a parte)', () => {
    const row = partitaGiocoToCloudRow(partitaGiocoBase({ nomeLibero: 'Burraco al volo' }), 'sessione-uid-1');
    expect(row.nome_libero).toBe('Burraco al volo');
    expect(row).not.toHaveProperty('vincitori');
  });

  it('lancia se manca uid', () => {
    expect(() => partitaGiocoToCloudRow(partitaGiocoBase({ uid: undefined }), 's')).toThrow(/uid/);
  });

  it('round-trip', () => {
    const base = partitaGiocoBase();
    const row = {
      id: 'pg-uid-1', sessione_gioco_id: 'sessione-uid-1', local_id: 1,
      ora_inizio: '20:05', ora_fine: '20:30', pareggio: true, nome_libero: null, ordine: 1,
      created_at: '2026-07-11T09:00:00.000Z', updated_at: '2026-07-11T12:00:00.000Z', deleted_at: null,
    };
    const locale = partitaGiocoFromCloudRow(row, base);
    expect(locale.pareggio).toBe(true);
    const back = partitaGiocoToCloudRow(locale, 'sessione-uid-1');
    expect(back).toEqual({
      id: row.id, sessione_gioco_id: 'sessione-uid-1', local_id: row.local_id,
      ora_inizio: row.ora_inizio, ora_fine: row.ora_fine, pareggio: row.pareggio,
      nome_libero: row.nome_libero, ordine: row.local_id, deleted_at: row.deleted_at,
    });
  });
});
