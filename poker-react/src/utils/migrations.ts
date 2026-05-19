import type { Sessione, Partita, Ricarica } from '../types';

/* Forma "legacy" di un giocatore di sessione: contiene i campi del
   vecchio modello (extra_amt/extra_pagato/soldi_ricevuti) che la
   migrazione converte e rimuove. */
interface GiocatoreLegacy {
  ricariche?: Ricarica[] | number[];
  rebuys?: Ricarica[];
  entrato?: boolean;
  buy_in_pagato?: boolean;
  entrata?: number;
  entrata_pagata?: boolean;
  fiches_finali?: number;
  extra_amt?: number;
  extra_pagato?: boolean;
  soldi_ricevuti?: number;
}

export function migrateSessione(s: Sessione | undefined): void {
  if (!s?.giocatori) return;
  s.giocatori.forEach(raw => {
    const g = raw as unknown as GiocatoreLegacy;

    // Retrocompatibilità: ricariche erano array di numeri
    if (
      Array.isArray(g.ricariche) && g.ricariche.length &&
      typeof g.ricariche[0] === 'number'
    ) {
      g.ricariche = (g.ricariche as number[]).map(v => ({ importo: v, pagata: true }));
    }
    if (!g.ricariche) g.ricariche = [];
    if (!g.rebuys)    g.rebuys = [];
    if (g.buy_in_pagato === undefined) g.buy_in_pagato = !!g.entrato;
    if (g.fiches_finali === undefined) g.fiches_finali = 0;

    // §3 — ingresso libero: entrata = buy_in di sessione, entrata_pagata = buy_in_pagato
    if (g.entrata === undefined)        g.entrata = s.buy_in;
    if (g.entrata_pagata === undefined) g.entrata_pagata = !!g.buy_in_pagato;

    // §3 — un extra_amt > 0 del vecchio modello diventa una ricarica
    if (typeof g.extra_amt === 'number' && g.extra_amt > 0) {
      (g.ricariche as Ricarica[]).push({ importo: g.extra_amt, pagata: !!g.extra_pagato });
    }
    delete g.extra_amt;
    delete g.extra_pagato;
    delete g.soldi_ricevuti;
  });
}

export function migratePartita(p: Partita): void {
  if (!p || p.settlements) return;
  const acc: Partita['settlements'] = [];
  (p.giocatori ?? []).forEach(g => {
    (g.pagamenti_effettuati ?? []).forEach(a => {
      if (a && a.amount > 0) {
        acc.push({
          from: g.id_nome,
          to: a.to,
          amount: a.amount,
          pagato: !!(a as { pagato?: boolean }).pagato,
        });
      }
    });
  });
  p.settlements = acc.length ? acc : [];
}
