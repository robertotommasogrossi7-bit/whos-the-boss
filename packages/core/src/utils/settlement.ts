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
    // B05 (audit 2026-07-03): fiche negative (dato corrotto/UI senza guardia)
    // genererebbero un debito fantasma a valle — difesa qui, alla sorgente
    // del calcolo (la guardia "vera" sta comunque nello store, che non deve
    // MAI produrre un valore negativo in primo luogo).
    const fiche            = Math.max(0, p.fiche);
    const mancante         = r100(Math.max(0, p.dovuto - p.versato));
    const eccedenza        = r100(Math.max(0, p.versato - p.dovuto));
    const versatoLegittimo = r100(Math.min(p.versato, p.dovuto));
    const netto            = r100(fiche - p.dovuto);

    // ── Passo 2: auto-compensazione ─────────────────────────────
    const cancelled  = r100(Math.min(mancante, fiche));
    const mancanteP  = r100(mancante - cancelled);
    const ficheP     = r100(fiche - cancelled);

    // ── Passo 3: bisogno ────────────────────────────────────────
    const bisogno = r100(Math.max(0, ficheP - versatoLegittimo));

    return {
      id_nome: p.id_nome,
      dovuto:  r100(p.dovuto),
      versato: r100(p.versato),
      mancante,
      mancanteP,
      fiche:   r100(fiche),
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
  // B07 (audit 2026-07-03): se il "bisogno" totale dei creditori non copre
  // il "mancante" totale dei debitori (dati di ingresso non bilanciati:
  // fiche totali ≠ dovuto totale), il resto del debitore va scartato —
  // prima in silenzio, ora accumulato qui ed esposto nel risultato.
  let sbilancio = 0;

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
    if (rem > 0.005) sbilancio = r100(sbilancio + rem);
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
    sbilancio,
  };
}
