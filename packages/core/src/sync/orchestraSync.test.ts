import { describe, expect, it } from 'vitest';
import type { Db } from '../types';
import type { GiocatoreCloudRow, LegaCloudRow } from './mapping';
import { haCambiamentiLocaliNonSincronizzati } from './merge';
import {
  creaSync, giaSincronizzato, haDatiSignificativi,
  type DepsSync, type PayloadPush, type SnapshotCloud,
} from '../index';

/* ══════════════════════════════════════════════════════
   R7.4d — l'orchestratore del sync: ordine e rami, zero rete.
   T0 = pegno vecchio · T1 = updated_at "nuovo" ritornato dalla RPC finta.
══════════════════════════════════════════════════════ */

const T0 = '2026-07-16T10:00:00.000Z';
const T1 = '2026-07-17T12:00:00.000Z';

function rowLega(over: Partial<LegaCloudRow> = {}): LegaCloudRow {
  return {
    id: 'L1', owner_id: 'acc-1', local_id: 1, nome: 'Amici', foto: null,
    personale: false, mono_gioco_id: null,
    created_at: T0, updated_at: T0, deleted_at: null, ...over,
  };
}
function rowGiocatore(id: string, nome: string, over: Partial<GiocatoreCloudRow> = {}): GiocatoreCloudRow {
  return {
    id, lega_id: 'L1', local_id: 1, nome, account_id: null, created_by_account_id: null,
    created_at: T0, updated_at: T0, deleted_at: null, ...over,
  };
}
function snapVuoto(): SnapshotCloud {
  return {
    leghe: [], giocatori: [], giochi_lega: [], partite_poker: [],
    partita_poker_giocatori: [], poker_movimenti: [], settlements: [],
    serate: [], serata_partecipanti: [], sessioni_gioco: [],
    sessione_gioco_partecipanti: [], partite_gioco: [],
    partita_gioco_vincitori: [], partita_gioco_partecipanti: [],
  };
}
/** Il cloud tipico: la lega L1 con Anna e Bruno. */
function snapCloud(): SnapshotCloud {
  return {
    ...snapVuoto(),
    leghe: [rowLega()],
    giocatori: [rowGiocatore('G1', 'Anna'), rowGiocatore('G2', 'Bruno')],
  };
}

/** Il Personale auto-creato al boot: solo "te", zero partite (telefono nuovo). */
function dbTelefonoNuovo(): Db {
  return {
    _lid: 2, _currentLegaId: 1,
    leghe: [{
      id: 1, nome: 'Personale', personale: true, foto: '',
      nomi: [{ id: 1, nome: 'Roberto', uid: 'GP-LOC', syncRev: 1 }],
      partite: [], sessioneAttiva: undefined, serate_bg: [], _nid: 2, _pid: 1,
      uid: 'PERS-LOC', syncRev: 1,
    }],
  };
}

/** Mai sincronizzato ma con dati VERI (una lega non-Personale creata offline). */
function dbConDati(): Db {
  const base = dbTelefonoNuovo();
  return {
    ...base, _lid: 3,
    leghe: [...base.leghe, {
      id: 2, nome: 'Amici locali', foto: '',
      nomi: [{ id: 1, nome: 'Pino', uid: 'GL-LOC', syncRev: 1 }],
      partite: [], sessioneAttiva: undefined, serate_bg: [], _nid: 2, _pid: 1,
      uid: 'AM-LOC', syncRev: 1,
    }],
  };
}

/** Già sincronizzato: L1 pulita col pegno, Anna rinominata (dirty). */
function dbSincronizzato(): Db {
  return {
    _lid: 2, _currentLegaId: 1,
    leghe: [{
      id: 1, nome: 'Amici', foto: '', _nid: 3, _pid: 1,
      nomi: [
        { id: 1, nome: 'Anna B.', uid: 'G1', syncRev: 2, syncedRev: 1, lastSyncedAt: T0 },
        { id: 2, nome: 'Bruno', uid: 'G2', syncRev: 1, syncedRev: 1, lastSyncedAt: T0 },
      ],
      partite: [], sessioneAttiva: undefined, serate_bg: [],
      uid: 'L1', syncRev: 1, syncedRev: 1, lastSyncedAt: T0,
    }],
  };
}

/** Deps finte: db in memoria, RPC che conferma tutto con updated_at = T1. */
function depsFinte(dbIniziale: Db, snap: SnapshotCloud, over: Partial<DepsSync> = {}) {
  let db = dbIniziale;
  const contatori = { scritture: 0, push: 0, backup: 0, snapshot: 0, import: 0 };
  const ordine: string[] = [];
  let ultimoPayload: PayloadPush | null = null;
  const deps: DepsSync = {
    leggiDb: () => db,
    scriviDb: (d) => { db = d; contatori.scritture++; ordine.push('scrivi'); },
    accountAttuale: () => 'acc-1',
    scaricaSnapshot: async () => { contatori.snapshot++; return { snapshot: snap }; },
    chiamaRpcPush: async (payload) => {
      contatori.push++;
      ultimoPayload = payload;
      const righe = [
        ...payload.leghe, ...payload.giocatori, ...payload.giochi_lega,
        ...payload.partite_poker, ...payload.partita_poker_giocatori, ...payload.settlements,
        ...payload.serate, ...payload.sessioni_gioco, ...payload.partite_gioco,
      ];
      const applicate: Record<string, string> = {};
      righe.forEach((r) => { applicate[r.id] = T1; });
      return { conteggi: { righe: righe.length + payload.poker_movimenti.length }, applicate };
    },
    salvaBackupPreAdozione: async () => { contatori.backup++; ordine.push('backup'); },
    eseguiImport: async () => {
      contatori.import++;
      ordine.push('import');
      return { stato: 'ok', conteggi: { leghe: 1, giocatori: 2 }, anomalie: [] };
    },
    ...over,
  };
  return { deps, db: () => db, contatori, ordine, payload: () => ultimoPayload };
}

describe('guardie: mutex, account, primo contatto', () => {
  it('mutex (S11): un ciclo in volo fa saltare il successivo, niente coda', async () => {
    const { deps } = depsFinte(dbSincronizzato(), snapCloud(), {
      scaricaSnapshot: async () => {
        await new Promise((r) => setTimeout(r, 30));
        return { snapshot: snapCloud() };
      },
    });
    const sync = creaSync(deps);
    const [primo, secondo] = await Promise.all([sync(), sync()]);
    const saltati = [primo, secondo].filter((e) => e.stato === 'saltato' && e.motivo === 'in_corso');
    expect(saltati).toHaveLength(1);
    // ...e a ciclo finito si può rilanciare (il mutex si è liberato)
    expect((await sync()).stato).toBe('ok');
  });

  it('senza account non parte niente (nemmeno il pull)', async () => {
    const { deps, contatori } = depsFinte(dbSincronizzato(), snapCloud(), {
      accountAttuale: () => null,
    });
    expect(await creaSync(deps)()).toEqual({ stato: 'saltato', motivo: 'nessun_account' });
    expect(contatori.snapshot).toBe(0);
  });

  it('cloud vergine + dati locali → la prima semina parte DA SOLA (R7.4f), mai col push', async () => {
    const { deps, contatori } = depsFinte(dbConDati(), snapVuoto());
    expect(await creaSync(deps)()).toEqual({ stato: 'ok', pushate: 3, importato: true });
    expect(contatori.import, 'la semina passa dall\'import, non dalla RPC push').toBe(1);
    expect(contatori.push).toBe(0);
  });

  it('pre-flight bloccante → `bloccato` coi problemi (nessun dato spedito)', async () => {
    const problemi = [{ tipo: 'personale_duplicata' as const, messaggio: 'Ci sono 2 leghe "Personale".' }];
    const { deps, contatori } = depsFinte(dbConDati(), snapVuoto(), {
      eseguiImport: async () => ({ stato: 'bloccato', problemi }),
    });
    expect(await creaSync(deps)()).toEqual({ stato: 'bloccato', problemi });
    expect(contatori.push).toBe(0);
  });

  it('semina in corsa su un altro device (`gia_importato`) → `conflitto`: il giro dopo proporrà l\'adozione', async () => {
    const { deps } = depsFinte(dbConDati(), snapVuoto(), {
      eseguiImport: async () => ({ stato: 'gia_importato' }),
    });
    expect(await creaSync(deps)()).toEqual({ stato: 'conflitto' });
  });

  it('niente di qua e niente di là: giro a vuoto, non un errore', async () => {
    const { deps, contatori } = depsFinte({ leghe: [], _lid: 1, _currentLegaId: undefined }, snapVuoto());
    expect(await creaSync(deps)()).toEqual({ stato: 'ok', pushate: 0 });
    expect(contatori.import).toBe(0);
  });
});

describe('adozione del 2° device (P.8.1/DS9)', () => {
  it('locale con dati VERI + cloud popolato → `adozione_richiesta`, zero scritture', async () => {
    const { deps, contatori } = depsFinte(dbConDati(), snapCloud());
    expect(await creaSync(deps)()).toEqual({ stato: 'adozione_richiesta' });
    expect(contatori.scritture + contatori.backup + contatori.push).toBe(0);
  });

  it('con la conferma: backup PRIMA della sostituzione, il db diventa il cloud (pulito)', async () => {
    const { deps, db, contatori, ordine } = depsFinte(dbConDati(), snapCloud());
    const esito = await creaSync(deps)({ adozioneConfermata: true });
    expect(esito).toEqual({ stato: 'ok', pushate: 0, adottato: true });
    expect(contatori.backup).toBe(1);
    expect(ordine).toEqual(['backup', 'scrivi']);
    const dopo = db();
    // il locale mai sincronizzato è stato SOSTITUITO, non unito (S4-R1)
    expect(dopo.leghe.map((l) => l.uid)).toEqual(['L1']);
    expect(dopo.leghe[0].nomi.map((n) => n.nome)).toEqual(['Anna', 'Bruno']);
    expect(haCambiamentiLocaliNonSincronizzati(dopo.leghe[0]), 'le righe adottate nascono pulite').toBe(false);
    expect(dopo._currentLegaId).toBe(dopo.leghe[0].id);
  });

  it('telefono nuovo (solo il Personale auto-creato): adozione AUTOMATICA, senza chiedere', async () => {
    const { deps, db, contatori } = depsFinte(dbTelefonoNuovo(), snapCloud());
    const esito = await creaSync(deps)(); // nessuna conferma passata
    expect(esito).toEqual({ stato: 'ok', pushate: 0, adottato: true });
    expect(contatori.backup, 'il backup si salva comunque (DS9)').toBe(1);
    expect(db().leghe.map((l) => l.uid)).toEqual(['L1']);
  });

  it('haDatiSignificativi: una serata LIVE conta come dati (mai adozione silenziosa sopra una sessione in corso) — S5-R2', () => {
    const conLive = dbTelefonoNuovo();
    conLive.leghe[0] = { ...conLive.leghe[0], sessioneAttiva: { modalita: 'cash' } as never };
    expect(haDatiSignificativi(conLive)).toBe(true);
    const conBg = dbTelefonoNuovo();
    conBg.leghe[0] = { ...conBg.leghe[0], serate_bg: [{ modalita: 'cash' } as never] };
    expect(haDatiSignificativi(conBg)).toBe(true);
  });

  it('haDatiSignificativi: il Personale conta solo se ci hai messo qualcosa', () => {
    expect(haDatiSignificativi(dbTelefonoNuovo())).toBe(false);
    const conPartita = dbTelefonoNuovo();
    conPartita.leghe[0].partite = [{
      id: 1, buy_in: 10, data: '2026-07-17', ora_inizio: '21:00', ora_fine: '22:00',
      modalita: 'cash', giocatori: [], settlements: [], uid: 'P-LOC', syncRev: 1,
    }];
    expect(haDatiSignificativi(conPartita)).toBe(true);
    const conAmico = dbTelefonoNuovo();
    conAmico.leghe[0].nomi = [...conAmico.leghe[0].nomi, { id: 2, nome: 'Ugo', uid: 'GU', syncRev: 1 }];
    expect(haDatiSignificativi(conAmico)).toBe(true);
  });
});

describe('il ciclo normale: pull → merge → push → stamp', () => {
  it('materializza le righe nuove dal cloud, pusha le dirty col pegno, stampa a conferma', async () => {
    const snap = snapCloud();
    snap.giocatori.push(rowGiocatore('G3', 'Carla', { local_id: null })); // nata su un altro device
    const { deps, db, contatori, payload } = depsFinte(dbSincronizzato(), snap);
    const esito = await creaSync(deps)();
    expect(esito.stato).toBe('ok');

    const lega = db().leghe[0];
    // pull: Carla materializzata; Anna resta col nome locale (dirty vince)
    expect(lega.nomi.map((n) => n.nome)).toEqual(['Anna B.', 'Bruno', 'Carla']);
    // push: UNA rpc, payload = solo Anna, col pegno del CAS
    expect(contatori.push).toBe(1);
    expect(payload()!.giocatori.map((g) => g.id)).toEqual(['G1']);
    expect(payload()!.giocatori[0].expected_updated_at).toBe(T0);
    // stamp: Anna confermata → pulita, pegno nuovo
    const anna = lega.nomi.find((n) => n.uid === 'G1')!;
    expect(anna.syncedRev).toBe(2);
    expect(anna.lastSyncedAt).toBe(T1);
    expect(haCambiamentiLocaliNonSincronizzati(anna)).toBe(false);
    expect(giaSincronizzato(db())).toBe(true);
  });

  it('tutto pulito → nessuna RPC (niente push a vuoto)', async () => {
    const pulito = dbSincronizzato();
    pulito.leghe[0].nomi[0] = { ...pulito.leghe[0].nomi[0], syncRev: 1 }; // Anna non più dirty
    const { deps, contatori } = depsFinte(pulito, snapCloud());
    const esito = await creaSync(deps)();
    expect(esito).toEqual({ stato: 'ok', pushate: 0 });
    expect(contatori.push).toBe(0);
  });

  it('conflitto CAS → esito `conflitto`, NIENTE stamp (la riga resta dirty per il prossimo giro)', async () => {
    const { deps, db } = depsFinte(dbSincronizzato(), snapCloud(), {
      chiamaRpcPush: async () => ({ errore: 'conflict: giocatori uid G1' }),
    });
    expect(await creaSync(deps)()).toEqual({ stato: 'conflitto' });
    const anna = db().leghe[0].nomi.find((n) => n.uid === 'G1')!;
    expect(haCambiamentiLocaliNonSincronizzati(anna)).toBe(true);
    expect(anna.syncedRev).toBe(1);
  });

  it('un conflitto su UNA lega non blocca il push delle ALTRE (S5-R3): esito conflitto a fine giro', async () => {
    const legaSincronizzata = (id: number, uidLega: string, uidG: string) => ({
      id, nome: `Lega ${uidLega}`, foto: '', _nid: 2, _pid: 1,
      nomi: [{ id: 1, nome: 'Dirty', uid: uidG, syncRev: 2, syncedRev: 1, lastSyncedAt: T0 }],
      partite: [], sessioneAttiva: undefined, serate_bg: [],
      uid: uidLega, syncRev: 1, syncedRev: 1, lastSyncedAt: T0,
    });
    const db2: Db = {
      _lid: 3, _currentLegaId: 1,
      leghe: [legaSincronizzata(1, 'L1', 'G1'), legaSincronizzata(2, 'L2', 'G2')],
    };
    const fixture = depsFinte(db2, snapVuoto());
    const rpcVera = fixture.deps.chiamaRpcPush;
    let tentativi = 0;
    fixture.deps.chiamaRpcPush = async (payload) => {
      tentativi++;
      return payload.lega_uid === 'L1' ? { errore: 'conflict: giocatori uid G1' } : rpcVera(payload);
    };

    expect(await creaSync(fixture.deps)()).toEqual({ stato: 'conflitto' });
    expect(tentativi, 'ANCHE la seconda lega va tentata').toBe(2);
    const [l1, l2] = fixture.db().leghe;
    expect(haCambiamentiLocaliNonSincronizzati(l1.nomi[0]), 'la lega in conflitto resta dirty').toBe(true);
    expect(haCambiamentiLocaliNonSincronizzati(l2.nomi[0]), 'l\'altra lega è stata pushata e stampata').toBe(false);
    expect(l2.nomi[0].lastSyncedAt).toBe(T1);
  });

  it('un edit arrivato DURANTE la RPC resta dirty da solo (O.3)', async () => {
    const fixture = depsFinte(dbSincronizzato(), snapCloud());
    const { deps, db } = fixture;
    const rpcVera = deps.chiamaRpcPush;
    deps.chiamaRpcPush = async (payload) => {
      // mentre la RPC è in volo, l'utente rinomina ancora Anna (syncRev 3)
      const corrente = db();
      deps.scriviDb({
        ...corrente,
        leghe: corrente.leghe.map((l) => ({
          ...l,
          nomi: l.nomi.map((n) => (n.uid === 'G1' ? { ...n, nome: 'Anna C.', syncRev: 3 } : n)),
        })),
      });
      return rpcVera(payload);
    };
    expect((await creaSync(deps)()).stato).toBe('ok');
    const anna = db().leghe[0].nomi.find((n) => n.uid === 'G1')!;
    expect(anna.nome).toBe('Anna C.');
    expect(anna.syncedRev, 'stamp = revisione SPEDITA (2), non quella nuova').toBe(2);
    expect(haCambiamentiLocaliNonSincronizzati(anna), 'l\'edit in volo resta da pushare').toBe(true);
  });

  it('logout durante il ciclo (S20): risultati SCARTATI, zero scritture', async () => {
    let vivo = true;
    const { deps, contatori } = depsFinte(dbSincronizzato(), snapCloud(), {
      accountAttuale: () => (vivo ? 'acc-1' : null),
      scaricaSnapshot: async () => { vivo = false; return { snapshot: snapCloud() }; },
    });
    expect(await creaSync(deps)()).toEqual({ stato: 'scartato' });
    expect(contatori.scritture).toBe(0);
  });

  it('errore di rete sul pull → esito `errore`, niente scritture', async () => {
    const { deps, contatori } = depsFinte(dbSincronizzato(), snapCloud(), {
      scaricaSnapshot: async () => ({ errore: 'network request failed' }),
    });
    expect(await creaSync(deps)()).toEqual({ stato: 'errore', messaggio: 'network request failed' });
    expect(contatori.scritture).toBe(0);
  });

  it('errore della RPC push (non-conflict) → esito `errore` col messaggio', async () => {
    const { deps } = depsFinte(dbSincronizzato(), snapCloud(), {
      chiamaRpcPush: async () => ({ errore: 'unique_violation: leghe_personale_uniq' }),
    });
    expect(await creaSync(deps)()).toEqual({ stato: 'errore', messaggio: 'unique_violation: leghe_personale_uniq' });
  });
});
