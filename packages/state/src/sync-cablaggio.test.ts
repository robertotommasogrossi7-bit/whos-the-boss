import { describe, expect, it } from 'vitest';
import type { StateStorage } from 'zustand/middleware';
import {
  applicaStampImport, conteggiPayload, costruisciPayloadImport, creaSessione,
  haCambiamentiLocaliNonSincronizzati, nuovoGiocatoreSessione, preflightImport,
  revisioniSpedite,
  type ConSync, type Db,
} from '@whos-the-boss/core';
import { createAppStore } from './store';

/* ══════════════════════════════════════════════════════
   GATE di R7.4a-1 (P.8.4) — il cablaggio del sync, dalle AZIONI VERE
   ─────────────────────────────────────────────────────
   Il red team (S4-R7) ha trovato che le entità nascevano con `uid` e
   `syncUpdatedAt` scritti a mano e `syncRev` mai valorizzato. Senza syncRev
   "sporca" (syncRev > syncedRev) diventa `0 > 0` = false: tutto ciò che l'app
   crea nascerebbe già PULITO e il push non lo spedirebbe MAI. Silenziosamente.

   Questo test è la rete che impedisce il ritorno del bug. Non verifica gli
   helper (li testa uid.test.ts): guida le AZIONI dello store come le chiama
   l'app e controlla il risultato sul db. Un punto di creazione nuovo che si
   dimentica `nuovoSync()`/`conUid()` fa fallire qui.

   Le due proprietà che il push (R7.4c) richiede, e che qui si pretendono:
     1. ogni entità creata è DIRTY  → il filtro del push la seleziona;
     2. ogni entità/movimento ha un UID → il payload si costruisce SENZA
        battezzaDb (nel delta-sync il battesimo dell'import non c'è).
══════════════════════════════════════════════════════ */

function fakeStorage(): StateStorage {
  const map = new Map<string, string>();
  return {
    getItem: (name) => map.get(name) ?? null,
    setItem: (name, value) => { map.set(name, value); },
    removeItem: (name) => { map.delete(name); },
  };
}

function nuovoStore() {
  const store = createAppStore({ storage: fakeStorage() });
  return () => store.getState();
}

/* Ogni entità sincronizzata del db, con un'etichetta leggibile: se il test
   fallisce si deve capire SUBITO quale punto di creazione è scoperto. */
function entitaSincronizzate(db: Db): Array<{ dove: string; e: ConSync & { uid?: string } }> {
  const out: Array<{ dove: string; e: ConSync & { uid?: string } }> = [];
  for (const l of db.leghe) {
    out.push({ dove: `lega "${l.nome}"`, e: l });
    l.nomi.forEach((n) => out.push({ dove: `giocatore "${n.nome}"`, e: n }));
    l.giochi?.forEach((g) => out.push({ dove: `gioco "${g.nome}"`, e: g }));
    l.serate?.forEach((s) => out.push({ dove: `serata ${s.data}`, e: s }));
    l.sessioniGioco?.forEach((s) => {
      out.push({ dove: `sessione ${s.giocoId}`, e: s });
      s.partite.forEach((p) => out.push({ dove: `partita gioco ${p.id}`, e: p }));
    });
    for (const p of l.partite) {
      out.push({ dove: `partita poker ${p.data}`, e: p });
      p.giocatori.forEach((g) => out.push({ dove: `giocatore partita ${g.id_nome}`, e: g }));
      p.settlements.forEach((s) => out.push({ dove: `settlement ${s.from}->${s.to}`, e: s }));
    }
  }
  return out;
}

/* I movimenti del ledger: solo uid, niente syncRev (append-only, I5). */
function movimenti(db: Db): Array<{ dove: string; m: { uid?: string } }> {
  const out: Array<{ dove: string; m: { uid?: string } }> = [];
  for (const l of db.leghe) {
    for (const p of l.partite) {
      for (const g of p.giocatori) {
        g.ricariche.forEach((r) => out.push({ dove: `ricarica di ${g.id_nome}`, m: r }));
        g.pagamenti_effettuati.forEach((x) => out.push({ dove: `pagamento di ${g.id_nome}`, m: x }));
        g.pagamenti_ricevuti.forEach((x) => out.push({ dove: `incasso di ${g.id_nome}`, m: x }));
      }
    }
  }
  return out;
}

/* ── Flusso POKER CASH completo, dalle azioni dello store ──
   Anna deve 35 (buy-in 25 + ricarica 10) ma nel piatto ne mette 25 → resta
   scoperta di 10 e finisce a 0 fiche; Bruno paga i suoi 25 e chiude a 60.
   Il piatto (50) non basta a pagare Bruno: 10 glieli passa Anna a mano → un
   settlement + i due movimenti di pagamento. Serve un flusso che generi DAVVERO
   dei movimenti: senza, il test non proverebbe nulla sul ledger. */
function dbConPartitaPoker(): { db: Db; legaId: number } {
  const s = nuovoStore();
  s().runMigrations();                      // crea la lega "Personale"
  const legaId = s().db.leghe.find((l) => l.personale)!.id;

  s().aggiungiGiocatore(legaId, 'Anna');
  s().aggiungiGiocatore(legaId, 'Bruno');
  const nomi = s().db.leghe.find((l) => l.id === legaId)!.nomi;
  const anna = nomi.find((n) => n.nome === 'Anna')!.id;
  const bruno = nomi.find((n) => n.nome === 'Bruno')!.id;

  const sess = creaSessione('2026-07-17', '21:00', '', 25, 'cash', [
    nuovoGiocatoreSessione(anna, 25),
    nuovoGiocatoreSessione(bruno, 25),
  ]);
  s().avviaSessione(legaId, sess);
  s().toggleEntrato(legaId, anna);
  s().toggleEntrato(legaId, bruno);
  s().setVersato(legaId, anna, 25);
  s().setVersato(legaId, bruno, 25);
  s().aggiungiRicarica(legaId, anna, 10, false);   // movimento nel live
  s().aggiornaFiches(legaId, anna, 0);
  s().aggiornaFiches(legaId, bruno, 60);

  expect(s().apriChiusura(legaId)).toBe(true);
  expect(s().confermaChiusura(legaId, '01:00').ok).toBe(true);

  return { db: s().db, legaId };
}

describe('R7.4a-1 — le entità create dallo store nascono pronte per il sync', () => {
  it('poker: la partita chiusa (+ giocatori e settlement) nasce DIRTY', () => {
    const { db } = dbConPartitaPoker();
    const partita = db.leghe[0].partite[0];
    expect(partita.settlements.length).toBeGreaterThan(0); // il flusso genera davvero un debito

    for (const { dove, e } of entitaSincronizzate(db)) {
      expect(haCambiamentiLocaliNonSincronizzati(e), `${dove} non è dirty → il push non la spedirebbe mai`).toBe(true);
      expect(e.syncRev, `${dove} senza syncRev`).toBe(1);
    }
  });

  it('poker: ogni movimento del ledger nasce con il suo uid', () => {
    const { db } = dbConPartitaPoker();
    const movs = movimenti(db);
    // ricarica + pagamento effettuato (Anna) + incasso (Bruno)
    expect(movs.length).toBe(3);
    for (const { dove, m } of movs) {
      expect(m.uid, `${dove} senza uid → movimentiToCloudRows lancia al push`).toBeTruthy();
    }
  });

  it('il payload si costruisce SENZA battezzaDb (nel delta-sync non c\'è)', () => {
    const { db } = dbConPartitaPoker();
    expect(preflightImport(db)).toEqual([]);

    const payload = costruisciPayloadImport(db, 'owner-1');
    const conteggi = conteggiPayload(payload);
    expect(conteggi).toMatchObject({
      leghe: 1,
      giocatori: 2,
      partite_poker: 1,
      partita_poker_giocatori: 2,
      poker_movimenti: 3,
      settlements: 1,
    });
  });

  it('lo stamp del push (contratto O.3) le rende pulite: creo → dirty → stamp → pulito', () => {
    const { db } = dbConPartitaPoker();
    const pulito = applicaStampImport(db, revisioniSpedite(db));
    for (const { dove, e } of entitaSincronizzate(pulito)) {
      expect(haCambiamentiLocaliNonSincronizzati(e), `${dove} ancora dirty dopo lo stamp`).toBe(false);
    }
  });

  it('multigioco: serata + sessione + partita nascono DIRTY e con uid', () => {
    const s = nuovoStore();
    s().runMigrations();
    const legaId = s().db.leghe.find((l) => l.personale)!.id;
    s().aggiungiGiocatore(legaId, 'Anna');
    s().aggiungiGiocatore(legaId, 'Bruno');
    const nomi = s().db.leghe.find((l) => l.id === legaId)!.nomi;
    const ids = nomi.map((n) => n.id);

    const serataId = s().creaSerata(legaId, ids, '2026-07-17');
    expect(serataId).not.toBeNull();
    const sessId = s().creaSessioneGioco(legaId, 'scopa', ids, '2026-07-17', '21:00', serataId!);
    expect(sessId).not.toBeNull();
    s().avviaSessioneGioco(legaId, sessId!);
    const partitaId = s().aggiungiPartita(legaId, sessId!);
    s().chiudiPartita(legaId, sessId!, partitaId!, { vincitori: [ids[0]], pareggio: false });
    s().chiudiSessioneGioco(legaId, sessId!, false);

    for (const { dove, e } of entitaSincronizzate(s().db)) {
      expect(haCambiamentiLocaliNonSincronizzati(e), `${dove} non è dirty`).toBe(true);
      expect(e.uid, `${dove} senza uid`).toBeTruthy();
    }

    /* G1 (R7_SCHEMA sez. Q): è QUI che il difetto è saltato fuori. L'app non
       popola mai `lega.giochi` (i giochi vengono dal catalogo globale), e il
       preflight lo trattava come FK obbligatoria → ogni import multigioco
       bloccato. Il gioco ora viaggia in `gioco_key`: senza, il cloud non
       saprebbe MAI a cosa si è giocato. */
    const db = s().db;
    expect(db.leghe[0].giochi, 'l\'app non popola lega.giochi: è il caso normale, non un errore').toBeUndefined();
    expect(preflightImport(db)).toEqual([]);
    expect(costruisciPayloadImport(db, 'owner-1').sessioni_gioco[0].gioco_key).toBe('scopa');
  });
});
