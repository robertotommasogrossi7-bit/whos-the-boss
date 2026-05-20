'use strict';

/* ══════════════════════════════════════════════════════
   DATABASE  (localStorage)
   Schema:
     leghe: [{
       id, nome, foto,
       nomi:    [{id, nome}],
       partite: [{id, data, giocatori:[{
                    id_nome, entrate, ricarica_fatta,
                    netto_finale, vincitore, soldi_dati }]}],
       _nid, _pid, _currentGameId
     }]
     _lid, _currentLegaId
══════════════════════════════════════════════════════ */

function dbGet() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return _emptyDb();
    return JSON.parse(raw);
  } catch (_) { return _emptyDb(); }
}
function dbSave(db) { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
function _emptyDb() { return { leghe: [], _lid: 1 }; }

function currentLega() {
  const db = dbGet();
  if (db._currentLegaId === undefined) return null;
  return db.leghe.find(l => l.id === db._currentLegaId) || null;
}

function saveLega(updated) {
  const db = dbGet();
  const i = db.leghe.findIndex(l => l.id === updated.id);
  if (i >= 0) db.leghe[i] = updated;
  dbSave(db);
}

/* Migrazione schema sessione (per dati salvati in vecchio formato) */
function migrateSessione(s) {
  if (!s || !s.giocatori) return;
  s.giocatori.forEach(g => {
    if (g.ricariche && g.ricariche.length && typeof g.ricariche[0] === 'number') {
      g.ricariche = g.ricariche.map(v => ({ importo: v, pagata: true }));
    }
    if (g.ricariche === undefined)      g.ricariche = [];
    if (g.buy_in_pagato === undefined)  g.buy_in_pagato = !!g.entrato;
    if (g.extra_amt === undefined)      g.extra_amt = 0;
    if (g.extra_pagato === undefined)   g.extra_pagato = true;
    if (g.soldi_ricevuti === undefined) g.soldi_ricevuti = 0;
    if (g.fiches_finali === undefined)  g.fiches_finali = 0;
  });
}

/* Migrazione: deriva settlements da vecchie partite con pagamenti_effettuati */
function migratePartita(p) {
  if (!p || p.settlements) return;
  const acc = [];
  (p.giocatori || []).forEach(g => {
    (g.pagamenti_effettuati || []).forEach(a => {
      if (a && a.amount > 0) acc.push({ from: g.id_nome, to: a.to, amount: a.amount, pagato: !!a.pagato });
    });
  });
  if (acc.length) p.settlements = acc;
  else            p.settlements = []; // partita pre-settlement: lista vuota
}
