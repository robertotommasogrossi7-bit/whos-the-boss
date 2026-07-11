import { describe, expect, it } from 'vitest';
import type { Lega, NomeGiocatore } from '../types';
import {
  giocatoreFromCloudRow, giocatoreToCloudRow,
  legaFromCloudRow, legaToCloudRow,
} from './mapping';

function legaBase(over: Partial<Lega> = {}): Lega {
  return {
    id: 1, nome: 'Lega test', foto: '', nomi: [], partite: [],
    sessioneAttiva: undefined, serate_bg: [], _nid: 1, _pid: 1,
    uid: 'lega-uid-1', syncUpdatedAt: '2026-07-11T10:00:00.000Z',
    ...over,
  };
}

describe('legaToCloudRow', () => {
  it('mappa i campi di primo livello, foto vuota → null', () => {
    const row = legaToCloudRow(legaBase(), 'owner-1');
    expect(row).toEqual({
      id: 'lega-uid-1', owner_id: 'owner-1', local_id: 1, nome: 'Lega test',
      foto: null, personale: false, mono_gioco_id: null, deleted_at: null,
    });
  });

  it('personale/monoGiocoId/foto/deletedAt passano quando presenti', () => {
    const row = legaToCloudRow(legaBase({
      personale: true, monoGiocoId: 'scopa', foto: 'data:...', deletedAt: '2026-07-11T11:00:00.000Z',
    }), 'owner-1');
    expect(row.personale).toBe(true);
    expect(row.mono_gioco_id).toBe('scopa');
    expect(row.foto).toBe('data:...');
    expect(row.deleted_at).toBe('2026-07-11T11:00:00.000Z');
  });

  it('lancia se manca uid (generaUid() non chiamato)', () => {
    const lega = legaBase({ uid: undefined });
    expect(() => legaToCloudRow(lega, 'owner-1')).toThrow(/uid/);
  });
});

describe('legaFromCloudRow', () => {
  it('aggiorna i campi di primo livello + i cursori di sync, preserva le collezioni figlie', () => {
    const nomiOriginali = [{ id: 1, nome: 'Alice' }];
    const base = legaBase({ nomi: nomiOriginali, personale: false });
    const row = {
      id: 'lega-uid-1', owner_id: 'owner-1', local_id: 1, nome: 'Nome aggiornato dal cloud',
      foto: null, personale: true, mono_gioco_id: null,
      created_at: '2026-07-11T09:00:00.000Z', updated_at: '2026-07-11T12:00:00.000Z', deleted_at: null,
    };
    const out = legaFromCloudRow(row, base);
    expect(out.nome).toBe('Nome aggiornato dal cloud');
    expect(out.personale).toBe(true);
    expect(out.syncUpdatedAt).toBe('2026-07-11T12:00:00.000Z');
    expect(out.lastSyncedAt).toBe('2026-07-11T12:00:00.000Z');
    expect(out.nomi).toBe(nomiOriginali); // collezione figlia intatta (stesso riferimento)
  });

  it('deleted_at non-null diventa deletedAt locale (tombstone), niente cancellazione fisica', () => {
    const base = legaBase();
    const row = {
      id: 'lega-uid-1', owner_id: 'owner-1', local_id: 1, nome: 'Lega test',
      foto: null, personale: false, mono_gioco_id: null,
      created_at: '2026-07-11T09:00:00.000Z', updated_at: '2026-07-11T12:00:00.000Z',
      deleted_at: '2026-07-11T12:00:00.000Z',
    };
    const out = legaFromCloudRow(row, base);
    expect(out.deletedAt).toBe('2026-07-11T12:00:00.000Z');
    expect(out).toBeTruthy(); // la lega esiste ancora localmente, solo marcata
  });

  it('round-trip: toCloudRow(fromCloudRow(row, base)) coincide coi campi mappati della row originale', () => {
    const base = legaBase();
    const row = {
      id: 'lega-uid-1', owner_id: 'owner-1', local_id: 1, nome: 'Round trip',
      foto: 'data:x', personale: true, mono_gioco_id: 'magic',
      created_at: '2026-07-11T09:00:00.000Z', updated_at: '2026-07-11T12:00:00.000Z', deleted_at: null,
    };
    const locale = legaFromCloudRow(row, base);
    const back = legaToCloudRow(locale, 'owner-1');
    expect(back).toEqual({
      id: row.id, owner_id: 'owner-1', local_id: row.local_id, nome: row.nome,
      foto: row.foto, personale: row.personale, mono_gioco_id: row.mono_gioco_id,
      deleted_at: row.deleted_at,
    });
  });
});

function giocatoreBase(over: Partial<NomeGiocatore> = {}): NomeGiocatore {
  return { id: 1, nome: 'Anna', uid: 'giocatore-uid-1', syncUpdatedAt: '2026-07-11T10:00:00.000Z', ...over };
}

describe('giocatoreToCloudRow', () => {
  it('guest (nessun accountId/createdByAccountId): entrambi null', () => {
    const row = giocatoreToCloudRow(giocatoreBase(), 'lega-uid-1');
    expect(row).toEqual({
      id: 'giocatore-uid-1', lega_id: 'lega-uid-1', local_id: 1, nome: 'Anna',
      account_id: null, created_by_account_id: null, deleted_at: null,
    });
  });

  it('membro reale: account_id valorizzato', () => {
    const row = giocatoreToCloudRow(giocatoreBase({ accountId: 'acc-1' }), 'lega-uid-1');
    expect(row.account_id).toBe('acc-1');
  });

  it('ospite con gestore: created_by_account_id valorizzato', () => {
    const row = giocatoreToCloudRow(giocatoreBase({ createdByAccountId: 'manager-1' }), 'lega-uid-1');
    expect(row.created_by_account_id).toBe('manager-1');
    expect(row.account_id).toBeNull(); // ospite non ancora reclamato
  });

  it('lancia se manca uid', () => {
    const g = giocatoreBase({ uid: undefined });
    expect(() => giocatoreToCloudRow(g, 'lega-uid-1')).toThrow(/uid/);
  });
});

describe('giocatoreFromCloudRow', () => {
  it('aggiorna nome/account/cursori di sync', () => {
    const base = giocatoreBase();
    const row = {
      id: 'giocatore-uid-1', lega_id: 'lega-uid-1', local_id: 1, nome: 'Anna aggiornata',
      account_id: 'acc-1', created_by_account_id: null,
      created_at: '2026-07-11T09:00:00.000Z', updated_at: '2026-07-11T12:00:00.000Z', deleted_at: null,
    };
    const out = giocatoreFromCloudRow(row, base);
    expect(out.nome).toBe('Anna aggiornata');
    expect(out.accountId).toBe('acc-1');
    expect(out.syncUpdatedAt).toBe('2026-07-11T12:00:00.000Z');
    expect(out.lastSyncedAt).toBe('2026-07-11T12:00:00.000Z');
    expect(out.id).toBe(1); // local_id/id interno invariato (non è la chiave di sync)
  });

  it('round-trip su un ospite con gestore', () => {
    const base = giocatoreBase();
    const row = {
      id: 'giocatore-uid-1', lega_id: 'lega-uid-1', local_id: 1, nome: 'Ospite',
      account_id: null, created_by_account_id: 'manager-1',
      created_at: '2026-07-11T09:00:00.000Z', updated_at: '2026-07-11T12:00:00.000Z', deleted_at: null,
    };
    const locale = giocatoreFromCloudRow(row, base);
    const back = giocatoreToCloudRow(locale, 'lega-uid-1');
    expect(back).toEqual({
      id: row.id, lega_id: 'lega-uid-1', local_id: row.local_id, nome: row.nome,
      account_id: row.account_id, created_by_account_id: row.created_by_account_id,
      deleted_at: row.deleted_at,
    });
  });
});
