import type { Sessione, Partita } from '../types';

export function migrateSessione(s: Sessione | undefined): void {
  if (!s?.giocatori) return;
  const isCash = s.modalita === 'cash';
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
    if (g.extra_amt === undefined)     g.extra_amt = 0;
    if (g.extra_pagato === undefined)  g.extra_pagato = true;
    if (g.soldi_ricevuti === undefined) g.soldi_ricevuti = 0;
    if (g.fiches_finali === undefined)  g.fiches_finali = 0;

    // Migrazione cash → nuovo modello versato (§3 SETTLEMENT_SPEC)
    if (isCash && (g as { versato?: number }).versato === undefined) {
      const buyInPagato = g.buy_in_pagato ? (s.buy_in ?? 0) : 0;
      const ricarichePagate = g.ricariche.reduce(
        (acc, r) => acc + (r.pagata ? r.importo : 0), 0
      );
      const extraPagato = (g.extra_pagato && g.extra_amt > 0) ? g.extra_amt : 0;
      g.versato = Math.round((buyInPagato + ricarichePagate + extraPagato) * 100) / 100;

      if ((g as { entrata?: number }).entrata === undefined) {
        g.entrata = s.buy_in ?? 0;
      }

      // extra_amt non pagato → diventa ricarica
      if (g.extra_amt > 0 && !g.extra_pagato) {
        g.ricariche = [...g.ricariche, { importo: g.extra_amt }];
      }
      // Rimuove il flag pagata dalle ricariche cash (nuovo modello)
      g.ricariche = g.ricariche.map(r => ({ importo: r.importo }));
    }
    if ((g as { versato?: number }).versato === undefined) {
      g.versato = 0;
    }
    if ((g as { entrata?: number }).entrata === undefined) {
      g.entrata = isCash ? (s.buy_in ?? 0) : 0;
    }
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
