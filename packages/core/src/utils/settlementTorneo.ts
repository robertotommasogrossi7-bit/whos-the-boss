import type { SettlementEntrato, SettlementAlloc } from '../types';

/* ══════════════════════════════════════════════════════
   SETTLEMENT TORNEO — allocazione contributi → premi
   ─────────────────────────────────────────────────────
   Principio (analogo all'auto-compensazione del cash §8):
   il buy-in NON versato di un giocatore (contributo_residuo)
   si elide contro il SUO premio non ancora incassato
   (premio_residuo) PRIMA dell'abbinamento greedy.

   Senza questo, un vincitore che non ha versato il buy-in
   risulta debitore e creditore insieme, generando un
   trasferimento verso sé stesso (V → V).
══════════════════════════════════════════════════════ */

export interface TorneoSettlementResult {
  /** entrati con residui aggiornati dopo auto-compensazione */
  arr:         SettlementEntrato[];
  losers:      SettlementEntrato[];
  winners:     SettlementEntrato[];
  neutri:      SettlementEntrato[];
  allocazioni: Record<number, SettlementAlloc[]>;
}

export function calcolaSettlementTorneo(entrati: SettlementEntrato[]): TorneoSettlementResult {
  const r100 = (n: number) => Math.round(n * 100) / 100;

  /* Copia: non muta l'input */
  const arr = entrati.map(p => ({ ...p }));

  /* ── Auto-compensazione contributo_residuo ↔ premio_residuo (stesso giocatore) ── */
  arr.forEach(p => {
    const comp = r100(Math.min(p.contributo_residuo, p.premio_residuo));
    if (comp > 0) {
      p.contributo_residuo = r100(p.contributo_residuo - comp);
      p.premio_residuo     = r100(p.premio_residuo - comp);
      p.mancante           = p.contributo_residuo; // mancante torneo = contributo_residuo
    }
  });

  const losers  = arr.filter(p => p.contributo_residuo > 0.005)
                     .sort((a, b) => b.contributo_residuo - a.contributo_residuo);
  const winners = arr.filter(p => p.premio_residuo > 0.005)
                     .sort((a, b) => b.premio_residuo - a.premio_residuo);
  const neutri  = arr.filter(p => p.contributo_residuo <= 0.005 && p.premio_residuo <= 0.005);

  /* ── Abbinamento greedy: debiti losers → crediti winners ── */
  const winnersRem: Record<number, number> = {};
  winners.forEach(w => { winnersRem[w.id_nome] = w.premio_residuo; });

  const allocazioni: Record<number, SettlementAlloc[]> = {};
  losers.forEach(l => {
    allocazioni[l.id_nome] = [];
    let rem = l.contributo_residuo;
    for (const w of winners) {
      if (rem <= 0.005) break;
      if (w.id_nome === l.id_nome) continue; // mai a sé stesso (difesa)
      const avail = winnersRem[w.id_nome] ?? 0;
      if (avail <= 0.005) continue;
      const amt = r100(Math.min(rem, avail));
      allocazioni[l.id_nome]!.push({ to: w.id_nome, amount: amt });
      rem = r100(rem - amt);
      winnersRem[w.id_nome] = r100(avail - amt);
    }
  });

  return { arr, losers, winners, neutri, allocazioni };
}
