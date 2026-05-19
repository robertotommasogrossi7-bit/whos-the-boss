import type { Sessione, Partita } from '../types';

export function migrateSessione(s: Sessione | undefined): void {
  if (!s?.giocatori) return;
  s.giocatori.forEach(g => {
    // Retrocompatibilità: ricariche erano array di numeri
    if (
      g.ricariche?.length &&
      typeof (g.ricariche as unknown[])[0] === 'number'
    ) {
      g.ricariche = (g.ricariche as unknown as number[]).map(v => ({
        importo: v,
        pagata: true,
      }));
    }
    if (!g.ricariche)          g.ricariche = [];
    if (!g.rebuys)             g.rebuys = [];
    if (g.buy_in_pagato === undefined) g.buy_in_pagato = !!g.entrato;
    if (g.entrata === undefined)        g.entrata = s.buy_in;
    if (g.entrata_pagata === undefined) g.entrata_pagata = !!g.buy_in_pagato;
    if (g.extra_amt === undefined)     g.extra_amt = 0;
    if (g.extra_pagato === undefined)  g.extra_pagato = true;
    if (g.soldi_ricevuti === undefined) g.soldi_ricevuti = 0;
    if (g.fiches_finali === undefined)  g.fiches_finali = 0;
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
