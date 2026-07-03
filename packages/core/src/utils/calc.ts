import type { Sessione, Premio, Lega } from '../types';

export function calcolaMontepremi(sess: Sessione): number {
  // Monte TEORICO: include tutti i contributi (pagati e non).
  // Chi non paga crea un debito a fine torneo.
  let totale = 0;
  sess.giocatori.forEach(g => {
    if (!g.entrato) return;
    totale += sess.buy_in;
    (g.rebuys ?? []).forEach(r => { totale += r.importo; });
    // B08 (audit 2026-07-03): `sess.add_on` è un oggetto sempre presente
    // (campo non opzionale su Sessione) → un check di verità su di esso è
    // sempre true e la guardia ".abilitato" non scattava mai davvero.
    if (g.add_on_fatto && sess.add_on?.abilitato) totale += sess.add_on.prezzo;
  });
  return Math.round(totale * 100) / 100;
}

export function calcolaMontepremiIncassato(sess: Sessione): number {
  // Cash realmente nel banco: solo contributi pagati.
  let totale = 0;
  sess.giocatori.forEach(g => {
    if (!g.entrato) return;
    if (g.buy_in_pagato) totale += sess.buy_in;
    (g.rebuys ?? []).forEach(r => { if (r.pagata) totale += r.importo; });
    if (g.add_on_fatto && g.add_on_pagato && sess.add_on?.abilitato) totale += sess.add_on.prezzo;
  });
  return Math.round(totale * 100) / 100;
}

export function calcolaPremiPagati(sess: Sessione): number {
  if (!sess.premi?.length) return 0;
  let totale = 0;
  sess.giocatori.forEach(g => {
    if (!g.entrato || !g.prize_pagato || !g.posizione_finale) return;
    const p = sess.premi.find(p => p.posizione === g.posizione_finale);
    if (p) totale += p.importo;
  });
  return Math.round(totale * 100) / 100;
}

/** Conta i debiti non ancora pagati in tutte le partite di una lega */
export function contaDebitiAperti(lega: Lega): number {
  let count = 0;
  for (const p of lega.partite) {
    for (const s of p.settlements) {
      if (!s.pagato) count++;
    }
  }
  return count;
}

export function calcolaPremi(montepremi: number, num_giocatori_entrati: number): Premio[] {
  if (!montepremi || !num_giocatori_entrati) return [];
  let payouts: number[];
  if (num_giocatori_entrati <= 4)       payouts = [1.00];
  else if (num_giocatori_entrati <= 9)  payouts = [0.65, 0.35];
  else if (num_giocatori_entrati <= 15) payouts = [0.50, 0.30, 0.20];
  else if (num_giocatori_entrati <= 27) payouts = [0.45, 0.27, 0.18, 0.10];
  else                                  payouts = [0.40, 0.25, 0.16, 0.10, 0.06, 0.03];

  const r100 = (n: number) => Math.round(n * 100) / 100;
  const importi = payouts.map(p => r100(montepremi * p));
  // B02 (audit 2026-07-03): l'arrotondamento per-posizione può far divergere
  // la somma dal montepremi (es. 42,50 → 42,51). Il 1° posto assorbe il
  // residuo esatto: Σimporti === montepremi SEMPRE, per costruzione.
  if (importi.length > 0) {
    const sommaAltri = importi.slice(1).reduce((a, x) => a + x, 0);
    importi[0] = r100(montepremi - sommaAltri);
  }

  return payouts.map((p, i) => ({
    posizione: i + 1,
    percentuale: Math.round(p * 100),
    importo: importi[i]!,
  }));
}

/** Consolida il montepremi e i premi se la late reg è chiusa o il torneo è concluso.
 *  Muta `sess` in-place (usare solo nelle azioni store su copie). */
export function consolidaPremiSeNecessario(sess: Sessione): void {
  if (sess.premi_consolidati) return;
  const gameLvlNow = sess.livelli
    .slice(0, sess.livello_corrente + 1)
    .filter(l => l.tipo === 'gioco').length;
  if (gameLvlNow > sess.late_reg.fino_a_livello || sess.stato === 'concluso') {
    const entrati = sess.giocatori.filter(g => g.entrato).length;
    sess.premi = calcolaPremi(calcolaMontepremi(sess), entrati);
    sess.premi_consolidati = true;
  }
}
