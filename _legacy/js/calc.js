'use strict';

/* ══════════════════════════════════════════════════════
   UTILS — formatting / escape / helpers
══════════════════════════════════════════════════════ */
function esc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function oggi() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'),
          String(d.getDate()).padStart(2,'0')].join('-');
}
function fmtData(s) {
  const [y,m,d] = s.split('-');
  return `${d}/${m}/${y}`;
}
function euro(v) {
  const n = parseFloat(v) || 0;
  return n.toFixed(2).replace('.',',');
}
function euroSigned(v) {
  const n = parseFloat(v) || 0;
  return (n >= 0 ? '+' : '') + euro(n);
}
function numVal(id) {
  return parseFloat(document.getElementById(id)?.value) || 0;
}
function getNome(lega, id) {
  const n = lega.nomi.find(n => n.id === id);
  return n ? n.nome : '?';
}

/* ══════════════════════════════════════════════════════
   MONTEPREMI / PREMI — calcolo torneo
══════════════════════════════════════════════════════ */
function calcolaMontepremi(sess) {
  // Montepremi teorico TOTALE: include tutti i contributi (pagati e non).
  // Usato per la struttura premi: chi entra contribuisce comunque al pool,
  // anche se non ha ancora versato — chi non paga creerà un debito a fine torneo.
  let totale = 0;
  sess.giocatori.forEach(g => {
    if (!g.entrato) return;
    totale += sess.buy_in;
    (g.rebuys || []).forEach(r => totale += r.importo);
    if (g.add_on_fatto && sess.add_on) totale += sess.add_on.prezzo;
  });
  return Math.round(totale * 100) / 100;
}

function calcolaMontepremiIncassato(sess) {
  // Cash realmente nel banco: solo contributi pagati.
  let totale = 0;
  sess.giocatori.forEach(g => {
    if (!g.entrato) return;
    if (g.buy_in_pagato) totale += sess.buy_in;
    (g.rebuys || []).forEach(r => { if (r.pagata) totale += r.importo; });
    if (g.add_on_fatto && g.add_on_pagato && sess.add_on) totale += sess.add_on.prezzo;
  });
  return Math.round(totale * 100) / 100;
}

function calcolaPremiPagati(sess) {
  // Somma dei premi già pagati ai giocatori (prize_pagato=true)
  if (!sess.premi || !sess.premi.length) return 0;
  let totale = 0;
  sess.giocatori.forEach(g => {
    if (!g.entrato || !g.prize_pagato || !g.posizione_finale) return;
    const p = sess.premi.find(p => p.posizione === g.posizione_finale);
    if (p) totale += p.importo;
  });
  return Math.round(totale * 100) / 100;
}

function calcolaPremi(montepremi, num_giocatori_entrati) {
  if (!montepremi || !num_giocatori_entrati) return [];
  let payouts;
  if (num_giocatori_entrati <= 4)       payouts = [1.00];
  else if (num_giocatori_entrati <= 9)  payouts = [0.65, 0.35];
  else if (num_giocatori_entrati <= 15) payouts = [0.50, 0.30, 0.20];
  else if (num_giocatori_entrati <= 27) payouts = [0.45, 0.27, 0.18, 0.10];
  else                                  payouts = [0.40, 0.25, 0.16, 0.10, 0.06, 0.03];
  return payouts.map((p, i) => ({
    posizione: i + 1,
    percentuale: Math.round(p * 100),
    importo: Math.round(montepremi * p * 100) / 100
  }));
}
