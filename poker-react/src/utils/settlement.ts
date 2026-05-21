import type { CashSettlementResult, GiocatoreCalcolato, Trasferimento } from '../types';

export interface PlayerInput {
  id_nome: number;
  dovuto:  number; // entrata + sum(ricariche)
  versato: number; // quanto è nel piatto
  fiche:   number; // fiches_finali
}

/**
 * Algoritmo §8 SETTLEMENT_SPEC.md
 * Funzione pura: nessuna dipendenza React/store.
 */
export function calcolaSettlement(players: PlayerInput[]): CashSettlementResult {
  const r100 = (n: number) => Math.round(n * 100) / 100;

  // ── Passo 1: grandezze base ──────────────────────────────────
  const calcolati: GiocatoreCalcolato[] = players.map(p => {
    const mancante         = r100(Math.max(0, p.dovuto - p.versato));
    const eccedenza        = r100(Math.max(0, p.versato - p.dovuto));
    const versatoLegittimo = r100(Math.min(p.versato, p.dovuto));
    const netto            = r100(p.fiche - p.dovuto);

    // ── Passo 2: auto-compensazione ─────────────────────────────
    const cancelled  = r100(Math.min(mancante, p.fiche));
    const mancanteP  = r100(mancante - cancelled);
    const ficheP     = r100(p.fiche - cancelled);

    // ── Passo 3: bisogno ────────────────────────────────────────
    const bisogno = r100(Math.max(0, ficheP - versatoLegittimo));

    return {
      id_nome: p.id_nome,
      dovuto:  r100(p.dovuto),
      versato: r100(p.versato),
      mancante,
      mancanteP,
      fiche:   r100(p.fiche),
      ficheP,
      eccedenza,
      versatoLegittimo,
      bisogno,
      netto,
    };
  });

  // ── Passo 4: abbinamento greedy (genera trasferimenti) ───────
  const debitori  = calcolati.filter(c => c.mancanteP > 0.005)
                             .sort((a, b) => b.mancanteP - a.mancanteP);
  const creditori = calcolati.filter(c => c.bisogno > 0.005)
                             .sort((a, b) => b.bisogno - a.bisogno);

  const bisognoRem: Record<number, number> = {};
  creditori.forEach(c => { bisognoRem[c.id_nome] = c.bisogno; });

  const trasferimenti: Trasferimento[] = [];

  for (const d of debitori) {
    let rem = d.mancanteP;
    for (const c of creditori) {
      if (rem <= 0.005) break;
      const avail = bisognoRem[c.id_nome] ?? 0;
      if (avail <= 0.005) continue;
      const amt = r100(Math.min(rem, avail));
      trasferimenti.push({ from: d.id_nome, to: c.id_nome, importo: amt });
      rem -= amt;
      bisognoRem[c.id_nome] = r100(avail - amt);
    }
  }

  // ── Piatto ──────────────────────────────────────────────────
  const totaleVersato = r100(calcolati.reduce((a, c) => a + c.versato, 0));
  const totaleDovuto  = r100(calcolati.reduce((a, c) => a + c.dovuto, 0));
  const breakdown = calcolati.map(c => ({
    id_nome:  c.id_nome,
    versato:  c.versato,
    dovuto:   c.dovuto,
    eccedenza: c.eccedenza,
  }));

  return {
    piatto: { totaleVersato, totaleDovuto, breakdown },
    trasferimenti,
    giocatori: calcolati,
  };
}
