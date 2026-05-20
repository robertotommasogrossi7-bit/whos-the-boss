'use strict';

/* ══════════════════════════════════════════════════════
   TORNEO — PREMI (sub-tab + eliminazioni + modal premio)
══════════════════════════════════════════════════════ */
function renderSubPremi(lega) {
  const s = lega.sessioneAttiva;
  const monte      = calcolaMontepremi(s);         // teorico TOTALE
  const incassato  = calcolaMontepremiIncassato(s); // cassa effettiva
  const giaPagato  = calcolaPremiPagati(s);         // premi già consegnati
  const residuo    = Math.max(0, Math.round((monte - giaPagato) * 100) / 100);
  const nonPagato  = Math.round((monte - incassato) * 100) / 100;
  const entrati    = s.giocatori.filter(g => g.entrato).length;

  const premi = s.premi_consolidati ? s.premi : calcolaPremi(monte, entrati);

  let banner;
  if (s.premi_consolidati) {
    banner = `
      <div class="pool-banner locked">
        <div class="pb-lbl">Montepremi consolidato</div>
        <div class="pb-val">€${euro(monte)}</div>
        <div class="pb-sub">🔒 Late reg chiusa</div>
      </div>
    `;
  } else {
    banner = `
      <div class="pool-banner">
        <div class="pb-lbl">Montepremi (include non pagati)</div>
        <div class="pb-val">€${euro(monte)}</div>
        <div class="pb-sub">Si consolida a fine late reg · Chi non paga creerà un debito</div>
      </div>
    `;
  }

  // Mini-barra stato cassa
  const poolStateBar = `
    <div class="stats-mini-bar" style="margin-bottom:10px">
      <div class="smb-item">
        <div class="smb-label">Incassato</div>
        <div class="smb-val pos">€${euro(incassato)}</div>
      </div>
      <div class="smb-item">
        <div class="smb-label">Pagato a vinc.</div>
        <div class="smb-val">€${euro(giaPagato)}</div>
      </div>
      <div class="smb-item">
        <div class="smb-label">${nonPagato > 0.005 ? '⚠ Da incassare' : 'Residuo monte'}</div>
        <div class="smb-val ${nonPagato > 0.005 ? 'neg' : ''}">€${euro(nonPagato > 0.005 ? nonPagato : residuo)}</div>
      </div>
    </div>
  `;
  banner += poolStateBar;

  if (!premi.length || !entrati) {
    return banner + '<div class="empty"><div class="eico">💰</div><p>Aggiungi giocatori entrati per vedere la struttura premi</p></div>';
  }

  const medals = ['🥇', '🥈', '🥉'];
  const rows = premi.map((p, i) => {
    let cls = '';
    if (i === 0) cls = 'gold';
    else if (i === 1) cls = 'silver';
    else if (i === 2) cls = 'bronze';
    return `
      <div class="prize-row ${cls}">
        <div class="prize-medal">${medals[i] || (i+1)+'°'}</div>
        <div><strong>${i+1}° posto</strong></div>
        <div class="prize-perc">${p.percentuale}%</div>
        <div class="prize-amount">€${euro(p.importo)}</div>
      </div>
    `;
  }).join('');

  const payoutNote = entrati <= 4 ? 'winner takes all'
                    : entrati <= 9 ? 'top 2 paid'
                    : entrati <= 15 ? 'top 3 paid'
                    : entrati <= 27 ? 'top 4 paid'
                    : 'top 6 paid';

  return `
    ${banner}
    <div class="card" style="padding:0;overflow:hidden">
      <div class="prize-row head">
        <div></div><div>Posizione</div><div>%</div><div>Premio</div>
      </div>
      ${rows}
    </div>
    <p class="help-note" style="margin:10px 4px 0">Struttura standard per ${entrati} iscritti: <b>${payoutNote}</b>.</p>
  `;
}

function torneoElimina(idNome) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const s = lega.sessioneAttiva;
  const g = s.giocatori.find(x => x.id_nome === idNome);
  if (!g || !g.entrato || g.eliminato) return;
  g.eliminato = true;
  g.elim_ts_ms = Date.now();
  const vivi = s.giocatori.filter(x => x.entrato && !x.eliminato).length;
  g.posizione_finale = vivi + 1;

  // Calcola/aggiorna premi se servono per la cifra mostrata
  if (!s.premi || !s.premi.length || !s.premi_consolidati) {
    const monte = calcolaMontepremi(s);
    s.premi = calcolaPremi(monte, s.giocatori.filter(x => x.entrato).length);
  }

  saveLega(lega);

  // Caso "ultimo rimasto = vincitore"
  if (vivi === 1) {
    const winner = s.giocatori.find(x => x.entrato && !x.eliminato);
    if (winner) {
      winner.posizione_finale = 1;
      s.stato = 'concluso';
      stopTimerInterval();
      consolidaPremiSeNecessario(s);
      saveLega(lega);
      const premioWin = (s.premi && s.premi[0]) ? s.premi[0].importo : 0;
      toast('🏆 Vince ' + getNome(lega, winner.id_nome) + '!');
      renderPartitaForm();
      if (premioWin > 0) showPrizeModal(winner.id_nome, 1, premioWin);
      return;
    }
  }

  // Eliminato in zona premi? Mostra modale
  const premio = (s.premi && s.premi[g.posizione_finale - 1]) ? s.premi[g.posizione_finale - 1].importo : 0;
  renderPartitaForm();
  if (premio > 0) {
    showPrizeModal(idNome, g.posizione_finale, premio);
  } else {
    toast('Eliminato — posizione ' + g.posizione_finale);
  }
}

/* Modale "Eliminato in zona premi" */
function showPrizeModal(idNome, posizione, importo) {
  const lega = currentLega();
  if (!lega) return;
  _pendingPrizeNome = idNome;
  const emoji = posizione === 1 ? '🏆' : (posizione === 2 ? '🥈' : (posizione === 3 ? '🥉' : '💰'));
  document.getElementById('prize-modal-emoji').textContent = emoji;
  document.getElementById('prize-modal-title').textContent = posizione === 1 ? 'Vincitore!' : 'In the money!';
  document.getElementById('prize-modal-pos').textContent = posizione + '° posto';
  document.getElementById('prize-modal-name').textContent = getNome(lega, idNome);
  document.getElementById('prize-modal-amt').textContent = '€' + euro(importo);
  document.getElementById('prize-modal').style.display = 'flex';
}

function confirmaPremio(pagato) {
  document.getElementById('prize-modal').style.display = 'none';
  if (_pendingPrizeNome == null) return;
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) { _pendingPrizeNome = null; return; }
  const g = lega.sessioneAttiva.giocatori.find(x => x.id_nome === _pendingPrizeNome);
  if (g) g.prize_pagato = !!pagato;
  saveLega(lega);
  _pendingPrizeNome = null;
  renderPartitaForm();
  toast(pagato ? '✓ Premio segnato come pagato' : '⏱ Premio segnato come da pagare');
}
