import { describe, expect, it } from 'vitest';
import type { Db, Lega } from '../types';
import { haCambiamentiLocaliNonSincronizzati } from './merge';
import { applicaPull, type SnapshotCloud } from './pull';

/* ══════════════════════════════════════════════════════
   R7.4b (ciclo pull) — applicaPull(db, snapshot) — percorso lega+giocatori+poker.
   Lo scenario che conta è "due device": B pulla ciò che A ha creato/modificato.
══════════════════════════════════════════════════════ */

const T = '2026-07-17T12:00:00.000Z';

/** Snapshot vuoto: i test riempiono solo le tabelle che servono. */
function snapVuoto(): SnapshotCloud {
  return {
    leghe: [], giocatori: [], giochi_lega: [],
    partite_poker: [], partita_poker_giocatori: [], poker_movimenti: [], settlements: [],
    serate: [], serata_partecipanti: [],
    sessioni_gioco: [], sessione_gioco_partecipanti: [],
    partite_gioco: [], partita_gioco_vincitori: [], partita_gioco_partecipanti: [],
  };
}

function dbVuoto(over: Partial<Db> = {}): Db {
  return { leghe: [], _lid: 1, _currentLegaId: undefined, ...over };
}

/* Riga cloud di una lega, con i default comodi. */
function legaRow(over: Partial<SnapshotCloud['leghe'][0]> = {}) {
  return {
    id: 'L1', owner_id: 'acc', local_id: 1, nome: 'Amici', foto: null,
    personale: false, mono_gioco_id: null, created_at: T, updated_at: T, deleted_at: null, ...over,
  };
}
function giocatoreRow(over: Partial<SnapshotCloud['giocatori'][0]> = {}) {
  return {
    id: 'G1', lega_id: 'L1', local_id: 1, nome: 'Anna', account_id: null,
    created_by_account_id: null, created_at: T, updated_at: T, deleted_at: null, ...over,
  };
}

describe('applicaPull — lega nuova da un altro device', () => {
  it('materializza la lega con un id locale NUOVO (non il local_id del cloud)', () => {
    const snap = { ...snapVuoto(), leghe: [legaRow({ local_id: 99 })] };
    const out = applicaPull(dbVuoto({ _lid: 5 }), snap);
    expect(out.leghe).toHaveLength(1);
    expect(out.leghe[0].id).toBe(5);        // dal contatore locale
    expect(out.leghe[0].uid).toBe('L1');    // chiave di sync dal cloud
    expect(out._lid).toBe(6);               // contatore avanzato
    expect(haCambiamentiLocaliNonSincronizzati(out.leghe[0])).toBe(false); // pulita
  });

  it('materializza anche i giocatori, con id locali nuovi e la idMap viva', () => {
    const snap = {
      ...snapVuoto(),
      leghe: [legaRow()],
      giocatori: [giocatoreRow({ id: 'G1', nome: 'Anna' }), giocatoreRow({ id: 'G2', nome: 'Bruno' })],
    };
    const out = applicaPull(dbVuoto(), snap);
    const lega = out.leghe[0];
    expect(lega.nomi.map((n) => n.nome)).toEqual(['Anna', 'Bruno']);
    expect(lega.nomi.map((n) => n.id)).toEqual([1, 2]);  // _nid interno alla lega
    expect(lega._nid).toBe(3);
    expect(lega.nomi.every((n) => !haCambiamentiLocaliNonSincronizzati(n))).toBe(true);
  });
});

describe('applicaPull — partita poker da un altro device (soldi)', () => {
  it('materializza partita + giocatori-partita + settlement, risolvendo gli id_nome via idMap', () => {
    const snap = {
      ...snapVuoto(),
      leghe: [legaRow()],
      giocatori: [giocatoreRow({ id: 'G1', nome: 'Anna' }), giocatoreRow({ id: 'G2', nome: 'Bruno' })],
      partite_poker: [{
        id: 'P1', lega_id: 'L1', local_id: 1, buy_in: 25, data: '2026-07-17',
        ora_inizio: '21:00', ora_fine: '01:00', modalita: 'cash' as const, created_at: T, updated_at: T, deleted_at: null,
      }],
      partita_poker_giocatori: [
        { id: 'GP1', partita_id: 'P1', giocatore_id: 'G1', entrate: 25, ricarica_fatta: 10, extra: 0, soldi_ricevuti: 0, fiches_finali: 0, netto_finale: -35, premio: 0, vincitore: false, buy_in_pagato: true, extra_pagato: true, add_on_fatto: false, add_on_pagato: false, posizione_finale: null, created_at: T, updated_at: T, deleted_at: null },
        { id: 'GP2', partita_id: 'P1', giocatore_id: 'G2', entrate: 25, ricarica_fatta: 0, extra: 0, soldi_ricevuti: 35, fiches_finali: 60, netto_finale: 35, premio: 0, vincitore: true, buy_in_pagato: true, extra_pagato: true, add_on_fatto: false, add_on_pagato: false, posizione_finale: null, created_at: T, updated_at: T, deleted_at: null },
      ],
      poker_movimenti: [
        { id: 'M1', partita_giocatore_id: 'GP1', tipo: 'ricarica' as const, importo: 10, pagata: false, contro_giocatore_id: null, ordine: 0, created_at: T, updated_at: T },
        { id: 'M2', partita_giocatore_id: 'GP1', tipo: 'pagamento_effettuato' as const, importo: 10, pagata: false, contro_giocatore_id: 'G2', ordine: 1, created_at: T, updated_at: T },
      ],
      settlements: [
        { id: 'S1', partita_id: 'P1', from_giocatore_id: 'G1', to_giocatore_id: 'G2', amount: 10, pagato: false, ordine: 0, created_at: T, updated_at: T, deleted_at: null },
      ],
    };
    const out = applicaPull(dbVuoto(), snap);
    const lega = out.leghe[0];
    const [annaId, brunoId] = [lega.nomi[0].id, lega.nomi[1].id];

    expect(lega.partite).toHaveLength(1);
    const p = lega.partite[0];
    expect(p.id).toBe(1);
    expect(p.buy_in).toBe(25);

    // giocatori-partita con id_nome risolti agli id LOCALI
    expect(p.giocatori.map((g) => g.id_nome)).toEqual([annaId, brunoId]);
    const anna = p.giocatori[0];
    expect(anna.netto_finale).toBe(-35);
    expect(anna.ricariche).toEqual([{ importo: 10, pagata: false, uid: 'M1' }]);
    expect(anna.pagamenti_effettuati).toEqual([{ to: brunoId, amount: 10, pagato: false, uid: 'M2' }]);

    // settlement con from/to risolti
    expect(p.settlements).toEqual([expect.objectContaining({ from: annaId, to: brunoId, amount: 10, pagato: false, uid: 'S1' })]);
    // tutto pulito (viene dal cloud)
    expect(p.giocatori.every((g) => !haCambiamentiLocaliNonSincronizzati(g))).toBe(true);
    expect(haCambiamentiLocaliNonSincronizzati(p.settlements[0])).toBe(false);
  });
});

describe('applicaPull — merge su lega esistente', () => {
  function dbConLega(over: Partial<Lega> = {}): Db {
    const lega: Lega = {
      id: 1, nome: 'Amici', foto: '', nomi: [{ id: 1, nome: 'Anna', uid: 'G1', syncRev: 1, syncedRev: 1, lastSyncedAt: '2026-07-01T00:00:00.000Z' }],
      partite: [], sessioneAttiva: undefined, serate_bg: [], _nid: 2, _pid: 1,
      uid: 'L1', syncRev: 1, syncedRev: 1, lastSyncedAt: '2026-07-01T00:00:00.000Z', ...over,
    };
    return dbVuoto({ leghe: [lega], _lid: 2 });
  }

  it('il cloud aggiorna un giocatore pulito (rename fatto su un altro device)', () => {
    const snap = { ...snapVuoto(), leghe: [legaRow()], giocatori: [giocatoreRow({ id: 'G1', nome: 'Anna B.' })] };
    const out = applicaPull(dbConLega(), snap);
    expect(out.leghe[0].nomi[0].nome).toBe('Anna B.');   // vince il cloud
    expect(out.leghe[0].nomi).toHaveLength(1);           // nessun doppione
  });

  it('un edit locale DIRTY vince sui dati, ma il pegno si aggiorna (regola del pegno)', () => {
    const db = dbConLega();
    // rendo il giocatore locale dirty con un nome diverso
    db.leghe[0].nomi[0] = { ...db.leghe[0].nomi[0], nome: 'Anna (mio)', syncRev: 2, syncedRev: 1 };
    const snap = { ...snapVuoto(), leghe: [legaRow()], giocatori: [giocatoreRow({ id: 'G1', nome: 'Anna (cloud)' })] };
    const out = applicaPull(db, snap);
    const g = out.leghe[0].nomi[0];
    expect(g.nome, 'i dati locali vincono').toBe('Anna (mio)');
    expect(g.lastSyncedAt, 'ma il pegno segue il cloud → niente deadlock al push').toBe(T);
    expect(haCambiamentiLocaliNonSincronizzati(g), 'ancora dirty: si pusherà').toBe(true);
  });

  it('idempotente: ri-applicare lo stesso snapshot non cambia nulla', () => {
    const snap = { ...snapVuoto(), leghe: [legaRow()], giocatori: [giocatoreRow({ id: 'G1', nome: 'Anna B.' })] };
    const uno = applicaPull(dbConLega(), snap);
    const due = applicaPull(uno, snap);
    expect(due).toEqual(uno);
  });

  it('una lega SOLO locale (non ancora pushata) resta intatta', () => {
    const db = dbConLega({ id: 9, uid: undefined, nome: 'Locale', nomi: [] });
    const out = applicaPull(db, snapVuoto());  // snapshot vuoto: il cloud non la conosce
    expect(out.leghe).toHaveLength(1);
    expect(out.leghe[0].nome).toBe('Locale');
  });
});

describe('applicaPull — multigioco da un altro device', () => {
  it('materializza serata + sessione + partita-gioco, risolvendo ponti e serataId', () => {
    const snap: SnapshotCloud = {
      ...snapVuoto(),
      leghe: [legaRow()],
      giocatori: [giocatoreRow({ id: 'G1', nome: 'Anna' }), giocatoreRow({ id: 'G2', nome: 'Bruno' })],
      serate: [{ id: 'SER1', lega_id: 'L1', local_id: 1, data: '2026-07-17', created_at: T, updated_at: T, deleted_at: null }],
      serata_partecipanti: [{ serata_id: 'SER1', giocatore_id: 'G1' }, { serata_id: 'SER1', giocatore_id: 'G2' }],
      sessioni_gioco: [{
        id: 'SG1', lega_id: 'L1', local_id: 1, gioco_key: 'scopa', gioco_lega_id: null, data: '2026-07-17',
        stato: 'chiusa', ora_inizio: '21:00', ora_fine: '22:00', esito_pareggio: false, serata_id: 'SER1',
        created_at: T, updated_at: T, deleted_at: null,
      }],
      sessione_gioco_partecipanti: [{ sessione_gioco_id: 'SG1', giocatore_id: 'G1' }, { sessione_gioco_id: 'SG1', giocatore_id: 'G2' }],
      partite_gioco: [{
        id: 'PG1', sessione_gioco_id: 'SG1', local_id: 1, ora_inizio: '21:00', ora_fine: '21:30',
        pareggio: false, nome_libero: null, ordine: 1, created_at: T, updated_at: T, deleted_at: null,
      }],
      partita_gioco_vincitori: [{ partita_gioco_id: 'PG1', giocatore_id: 'G1' }],
    };
    const out = applicaPull(dbVuoto(), snap);
    const lega = out.leghe[0];
    const [annaId, brunoId] = [lega.nomi[0].id, lega.nomi[1].id];

    expect(lega.serate).toHaveLength(1);
    expect(lega.serate![0].id).toBe(1);
    expect(lega.serate![0].partecipanti).toEqual([annaId, brunoId]);
    expect(lega._serataId).toBe(2);

    expect(lega.sessioniGioco).toHaveLength(1);
    const sess = lega.sessioniGioco![0];
    expect(sess.giocoId).toBe('scopa');            // G1: dalla gioco_key
    expect(sess.serataId).toBe(1);                 // risolto all'id locale della serata
    expect(sess.partecipanti).toEqual([annaId, brunoId]);
    expect(lega._sgid).toBe(2);

    expect(sess.partite).toHaveLength(1);
    expect(sess.partite[0].vincitori).toEqual([annaId]);
    expect(haCambiamentiLocaliNonSincronizzati(sess)).toBe(false); // pulita
  });

  it('gioco custom: materializzato con i suoi campi', () => {
    const snap: SnapshotCloud = {
      ...snapVuoto(),
      leghe: [legaRow()],
      giochi_lega: [{
        id: 'GL1', lega_id: 'L1', gioco_key: 'custom-1', nome: 'Briscolone', preimpostato: false,
        foto: null, accent: '#ABCDEF', attivo: true, pareggio_come_vittoria: false, created_at: T, updated_at: T, deleted_at: null,
      }],
    };
    const gioco = applicaPull(dbVuoto(), snap).leghe[0].giochi![0];
    expect(gioco.id).toBe('custom-1');
    expect(gioco.nome).toBe('Briscolone');
    expect(gioco.pareggioComeVittoria).toBe(false);
  });

  /* ── Bonifica audit S5-R1: C4 valeva solo per i figli NUOVI ── */

  it('C4 in MERGE: il tombstone della sessione dal cloud uccide anche la partita GIÀ locale', () => {
    const VECCHIO = '2026-07-01T00:00:00.000Z';
    const db = dbVuoto({
      _lid: 2,
      leghe: [{
        id: 1, nome: 'Amici', foto: '', nomi: [], partite: [],
        sessioneAttiva: undefined, serate_bg: [], _nid: 1, _pid: 1, _sgid: 2,
        sessioniGioco: [{
          id: 1, giocoId: 'scopa', data: '2026-07-17', stato: 'chiusa',
          ora_inizio: '21:00', ora_fine: '22:00', partecipanti: [], esitoPareggio: false,
          uid: 'SG1', syncRev: 1, syncedRev: 1, lastSyncedAt: VECCHIO,
          partite: [{
            id: 1, ora_inizio: '21:00', ora_fine: '21:30', vincitori: [], pareggio: false,
            uid: 'PG1', syncRev: 1, syncedRev: 1, lastSyncedAt: VECCHIO,
          }],
        }],
        uid: 'L1', syncRev: 1, syncedRev: 1, lastSyncedAt: VECCHIO,
      }],
    });
    // un altro device ha cancellato la sessione SENZA conoscere PG1: sul cloud
    // la sessione è morta ma la partita risulta ancora viva
    const snap: SnapshotCloud = {
      ...snapVuoto(),
      leghe: [legaRow()],
      sessioni_gioco: [{
        id: 'SG1', lega_id: 'L1', local_id: 1, gioco_key: 'scopa', gioco_lega_id: null, data: '2026-07-17',
        stato: 'chiusa', ora_inizio: '21:00', ora_fine: '22:00', esito_pareggio: false, serata_id: null,
        created_at: T, updated_at: T, deleted_at: T,
      }],
      partite_gioco: [{
        id: 'PG1', sessione_gioco_id: 'SG1', local_id: 1, ora_inizio: '21:00', ora_fine: '21:30',
        pareggio: false, nome_libero: null, ordine: 1, created_at: T, updated_at: T, deleted_at: null,
      }],
    };
    const sess = applicaPull(db, snap).leghe[0].sessioniGioco![0];
    expect(sess.deletedAt, 'la sessione muore (delete-wins)').toBe(T);
    expect(sess.partite[0].deletedAt, 'la partita GIÀ locale non sopravvive al padre morto').toBeTruthy();
  });

  it('C4 al livello SERATA: le sessioni sotto una serata tombstonata muoiono con lei (nuove E già locali)', () => {
    const VECCHIO = '2026-07-01T00:00:00.000Z';
    const snap: SnapshotCloud = {
      ...snapVuoto(),
      leghe: [legaRow()],
      serate: [{ id: 'SER1', lega_id: 'L1', local_id: 1, data: '2026-07-17', created_at: T, updated_at: T, deleted_at: T }],
      // sessione ancora viva sul cloud (creata da un device che non sapeva della cancellazione)
      sessioni_gioco: [{
        id: 'SG1', lega_id: 'L1', local_id: 1, gioco_key: 'scopa', gioco_lega_id: null, data: '2026-07-17',
        stato: 'chiusa', ora_inizio: '21:00', ora_fine: '22:00', esito_pareggio: false, serata_id: 'SER1',
        created_at: T, updated_at: T, deleted_at: null,
      }],
      partite_gioco: [{
        id: 'PG1', sessione_gioco_id: 'SG1', local_id: 1, ora_inizio: '21:00', ora_fine: '21:30',
        pareggio: false, nome_libero: null, ordine: 1, created_at: T, updated_at: T, deleted_at: null,
      }],
    };
    // ramo MATERIALIZZA (device nuovo)
    const nuova = applicaPull(dbVuoto(), snap).leghe[0].sessioniGioco![0];
    expect(nuova.deletedAt, 'sessione nuova sotto serata morta: nasce morta').toBeTruthy();
    expect(nuova.partite[0].deletedAt, 'cascade fino alle partite').toBeTruthy();

    // ramo MERGE (sessione e serata già locali, vive)
    const db = dbVuoto({
      _lid: 2,
      leghe: [{
        id: 1, nome: 'Amici', foto: '', nomi: [], partite: [],
        sessioneAttiva: undefined, serate_bg: [], _nid: 1, _pid: 1, _sgid: 2, _serataId: 2,
        serate: [{ id: 1, data: '2026-07-17', partecipanti: [], uid: 'SER1', syncRev: 1, syncedRev: 1, lastSyncedAt: VECCHIO }],
        sessioniGioco: [{
          id: 1, giocoId: 'scopa', data: '2026-07-17', stato: 'chiusa',
          ora_inizio: '21:00', ora_fine: '22:00', partecipanti: [], esitoPareggio: false, serataId: 1,
          uid: 'SG1', syncRev: 1, syncedRev: 1, lastSyncedAt: VECCHIO, partite: [],
        }],
        uid: 'L1', syncRev: 1, syncedRev: 1, lastSyncedAt: VECCHIO,
      }],
    });
    const merged = applicaPull(db, snap).leghe[0].sessioniGioco![0];
    expect(merged.deletedAt, 'sessione GIÀ locale sotto serata morta: muore anche lei').toBeTruthy();
  });

  it('ORFANO ancestor-aware (C4): una partita-gioco nuova sotto una sessione tombstonata nasce tombstonata', () => {
    const snap: SnapshotCloud = {
      ...snapVuoto(),
      leghe: [legaRow()],
      giocatori: [giocatoreRow({ id: 'G1', nome: 'Anna' })],
      // la sessione è cancellata sul cloud...
      sessioni_gioco: [{
        id: 'SG1', lega_id: 'L1', local_id: 1, gioco_key: 'scopa', gioco_lega_id: null, data: '2026-07-17',
        stato: 'chiusa', ora_inizio: '21:00', ora_fine: '22:00', esito_pareggio: false, serata_id: null,
        created_at: T, updated_at: T, deleted_at: T,
      }],
      // ...ma una sua partita arriva ANCORA VIVA (un altro device l'ha aggiunta prima di vedere la cancellazione)
      partite_gioco: [{
        id: 'PG1', sessione_gioco_id: 'SG1', local_id: 1, ora_inizio: '21:00', ora_fine: '21:30',
        pareggio: false, nome_libero: null, ordine: 1, created_at: T, updated_at: T, deleted_at: null,
      }],
      partita_gioco_vincitori: [{ partita_gioco_id: 'PG1', giocatore_id: 'G1' }],
    };
    const sess = applicaPull(dbVuoto(), snap).leghe[0].sessioniGioco![0];
    expect(sess.deletedAt, 'la sessione è tombstonata').toBe(T);
    expect(sess.partite[0].deletedAt, 'la partita orfana NON resuscita: nasce tombstonata').toBeTruthy();
  });
});
