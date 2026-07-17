import { describe, expect, it } from 'vitest';
import { haCambiamentiLocaliNonSincronizzati } from './merge';
import {
  materializzaGiocatore, materializzaGiocatorePartita, materializzaGiocoLega, materializzaLega,
  materializzaPartita, materializzaPartitaGioco, materializzaSerata, materializzaSessioneGioco,
  materializzaSettlement,
} from './materializza';
import type { LegaCloudRow, GiocatoreCloudRow, GiocoLegaCloudRow } from './mapping';
import type { PartitaPokerCloudRow, GiocatorePartitaCloudRow, SettlementCloudRow } from './mappingPoker';
import type { SerataCloudRow, SessioneGiocoCloudRow, PartitaGiocoCloudRow } from './mappingMultigioco';

/* ══════════════════════════════════════════════════════
   R7.4b-1 — materializzatori: righe cloud nuove → entità locali pure.
   Le tre proprietà che ogni materializzatore DEVE garantire (P.3):
     1. id locale = quello iniettato (NON il local_id del cloud);
     2. uid = quello del cloud (l'unica chiave che attraversa il confine, I1);
     3. la riga nasce PULITA (non-dirty) col pegno del CAS = updated_at server.
══════════════════════════════════════════════════════ */

const CREATED = '2026-07-10T09:00:00.000Z';
const UPDATED = '2026-07-17T12:00:00.000Z';

function pulita(e: { syncRev?: number; syncedRev?: number; lastSyncedAt?: string; uid?: string }, uid: string) {
  expect(e.uid, 'uid dal cloud').toBe(uid);
  expect(haCambiamentiLocaliNonSincronizzati(e), 'materializzata = pulita, il push non la ri-spedisce').toBe(false);
  expect(e.lastSyncedAt, 'pegno del CAS = updated_at del server').toBe(UPDATED);
}

describe('materializzaLega', () => {
  const row: LegaCloudRow = {
    id: 'lega-uid', owner_id: 'acc-1', local_id: 99, nome: 'Amici', foto: null,
    personale: false, mono_gioco_id: null, created_at: CREATED, updated_at: UPDATED, deleted_at: null,
  };
  it('usa l\'id locale iniettato, NON il local_id del cloud (spazi id indipendenti)', () => {
    const l = materializzaLega(row, 3);
    expect(l.id).toBe(3);
    expect(l.nome).toBe('Amici');
    pulita(l, 'lega-uid');
  });
  it('nasce SENZA figli e coi contatori a 1 (li fa avanzare l\'orchestratore)', () => {
    const l = materializzaLega(row, 3);
    expect(l.nomi).toEqual([]);
    expect(l.partite).toEqual([]);
    expect(l.sessioniGioco).toEqual([]);
    expect(l._nid).toBe(1);
    expect(l._pid).toBe(1);
    expect(l.sessioneAttiva).toBeUndefined(); // lo stato live non è sincronizzato
  });
  it('propaga il tombstone del cloud', () => {
    const l = materializzaLega({ ...row, deleted_at: UPDATED }, 3);
    expect(l.deletedAt).toBe(UPDATED);
  });
});

describe('materializzaGiocatore', () => {
  const row: GiocatoreCloudRow = {
    id: 'g-uid', lega_id: 'lega-uid', local_id: 5, nome: 'Anna', account_id: 'acc-9',
    created_by_account_id: null, created_at: CREATED, updated_at: UPDATED, deleted_at: null,
  };
  it('id locale iniettato + account_id dal cloud + pulita', () => {
    const g = materializzaGiocatore(row, 7);
    expect(g.id).toBe(7);
    expect(g.nome).toBe('Anna');
    expect(g.accountId).toBe('acc-9');
    pulita(g, 'g-uid');
  });
});

describe('materializzaGiocoLega', () => {
  it('id = gioco_key; per un preset con campi null → fallback al catalogo', () => {
    const row: GiocoLegaCloudRow = {
      id: 'gl-uid', lega_id: 'lega-uid', gioco_key: 'scopa', nome: null, preimpostato: true,
      foto: null, accent: null, attivo: true, pareggio_come_vittoria: true,
      created_at: CREATED, updated_at: UPDATED, deleted_at: null,
    };
    const g = materializzaGiocoLega(row);
    expect(g.id).toBe('scopa');
    expect(g.nome).toBe('Scopa');            // dal catalogo, non 'Gioco'
    expect(g.accent).toBeTruthy();           // accent del preset
    pulita(g, 'gl-uid');
  });
  it('un custom porta i suoi campi dal cloud', () => {
    const row: GiocoLegaCloudRow = {
      id: 'gl-uid2', lega_id: 'lega-uid', gioco_key: 'custom-1', nome: 'Briscolone', preimpostato: false,
      foto: null, accent: '#ABCDEF', attivo: true, pareggio_come_vittoria: false,
      created_at: CREATED, updated_at: UPDATED, deleted_at: null,
    };
    const g = materializzaGiocoLega(row);
    expect(g.nome).toBe('Briscolone');
    expect(g.accent).toBe('#ABCDEF');
    expect(g.pareggioComeVittoria).toBe(false);
  });
});

describe('materializzaPartita + figli', () => {
  const row: PartitaPokerCloudRow = {
    id: 'p-uid', lega_id: 'lega-uid', local_id: 2, buy_in: 25, data: '2026-07-17',
    ora_inizio: '21:00', ora_fine: '01:00', modalita: 'cash', created_at: CREATED, updated_at: UPDATED, deleted_at: null,
  };
  it('partita ex-novo senza giocatori/settlement, id iniettato, pulita', () => {
    const p = materializzaPartita(row, 4);
    expect(p.id).toBe(4);
    expect(p.buy_in).toBe(25);
    expect(p.giocatori).toEqual([]);
    expect(p.settlements).toEqual([]);
    pulita(p, 'p-uid');
  });
  it('giocatore-partita: id_nome risolto + movimenti iniettati', () => {
    const gpRow: GiocatorePartitaCloudRow = {
      id: 'gp-uid', partita_id: 'p-uid', giocatore_id: 'g-uid', entrate: 25, ricarica_fatta: 10,
      extra: 0, soldi_ricevuti: 0, fiches_finali: 0, netto_finale: -35, premio: 0, vincitore: false,
      buy_in_pagato: true, extra_pagato: true, add_on_fatto: false, add_on_pagato: false,
      posizione_finale: null, created_at: CREATED, updated_at: UPDATED, deleted_at: null,
    };
    const movimenti = { ricariche: [{ importo: 10, uid: 'r1' }], pagamenti_effettuati: [], pagamenti_ricevuti: [] };
    const gp = materializzaGiocatorePartita(gpRow, 7, movimenti);
    expect(gp.id_nome).toBe(7);
    expect(gp.netto_finale).toBe(-35);
    expect(gp.ricariche).toEqual([{ importo: 10, uid: 'r1' }]);
    pulita(gp, 'gp-uid');
  });
  it('settlement: from/to risolti a id locali', () => {
    const sRow: SettlementCloudRow = {
      id: 's-uid', partita_id: 'p-uid', from_giocatore_id: 'g-uid', to_giocatore_id: 'g-uid2',
      amount: 10, pagato: false, ordine: 0, created_at: CREATED, updated_at: UPDATED, deleted_at: null,
    };
    const s = materializzaSettlement(sRow, 7, 8);
    expect(s.from).toBe(7);
    expect(s.to).toBe(8);
    expect(s.amount).toBe(10);
    pulita(s, 's-uid');
  });
});

describe('materializzatori multigioco', () => {
  it('serata: partecipanti risolti a id locali', () => {
    const row: SerataCloudRow = {
      id: 'ser-uid', lega_id: 'lega-uid', local_id: 1, data: '2026-07-17',
      created_at: CREATED, updated_at: UPDATED, deleted_at: null,
    };
    const s = materializzaSerata(row, 2, [7, 8]);
    expect(s.id).toBe(2);
    expect(s.partecipanti).toEqual([7, 8]);
    pulita(s, 'ser-uid');
  });
  it('sessione: giocoId dalla gioco_key (G1), serataId locale, senza partite', () => {
    const row: SessioneGiocoCloudRow = {
      id: 'sg-uid', lega_id: 'lega-uid', local_id: 1, gioco_key: 'scopa', gioco_lega_id: null,
      data: '2026-07-17', stato: 'chiusa', ora_inizio: '21:00', ora_fine: '22:00', esito_pareggio: false,
      serata_id: 'ser-uid', created_at: CREATED, updated_at: UPDATED, deleted_at: null,
    };
    const sg = materializzaSessioneGioco(row, 3, [7, 8], 2);
    expect(sg.id).toBe(3);
    expect(sg.giocoId).toBe('scopa');
    expect(sg.serataId).toBe(2);
    expect(sg.partite).toEqual([]);
    pulita(sg, 'sg-uid');
  });
  it('sessione senza serata: serataId undefined', () => {
    const row: SessioneGiocoCloudRow = {
      id: 'sg-uid2', lega_id: 'lega-uid', local_id: 1, gioco_key: 'briscola', gioco_lega_id: null,
      data: '2026-07-17', stato: 'attiva', ora_inizio: '21:00', ora_fine: '', esito_pareggio: false,
      serata_id: null, created_at: CREATED, updated_at: UPDATED, deleted_at: null,
    };
    expect(materializzaSessioneGioco(row, 3, [7], undefined).serataId).toBeUndefined();
  });
  it('partita-gioco: vincitori/partecipanti risolti, id interno iniettato', () => {
    const row: PartitaGiocoCloudRow = {
      id: 'pg-uid', sessione_gioco_id: 'sg-uid', local_id: 1, ora_inizio: '21:00', ora_fine: '21:30',
      pareggio: false, nome_libero: null, ordine: 1, created_at: CREATED, updated_at: UPDATED, deleted_at: null,
    };
    const pg = materializzaPartitaGioco(row, 1, [7], [7, 8]);
    expect(pg.id).toBe(1);
    expect(pg.vincitori).toEqual([7]);
    expect(pg.partecipanti).toEqual([7, 8]);
    pulita(pg, 'pg-uid');
  });
});
