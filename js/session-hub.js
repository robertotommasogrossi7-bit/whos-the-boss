'use strict';

/* ══════════════════════════════════════════════════════
   TAB 2 – ORGANIZZA UNA SERATA / SESSION HUB (dispatcher)
══════════════════════════════════════════════════════ */
function renderPartitaForm() {
  const lega = currentLega();
  if (!lega) return;
  const hdr = document.getElementById('hdr-partita');
  const cnt = document.getElementById('partita-content');

  if (_serataView === 'live' && lega.sessioneAttiva) {
    hdr.textContent = 'Serata in corso';
    const backBtn = (lega.sessioneAttiva || (lega.serate_bg && lega.serate_bg.length))
      ? `<button class="btn btn-gray" style="margin:0 0 8px;padding:5px 12px;font-size:13px" onclick="_serataView='hub';renderPartitaForm()">‹ Tutte le serate</button>`
      : '';
    cnt.innerHTML = backBtn + renderLiveHtml(lega);
  } else if (_serataView === 'setup') {
    if (!_formRendered) {
      _setupPartIds  = new Set();
      _setupModalita = 'cash';
      _setupTorneo   = null;
    }
    hdr.textContent = 'Nuova serata';
    cnt.innerHTML = `<button class="btn btn-gray" style="margin:0 0 8px;padding:5px 12px;font-size:13px" onclick="_serataView='hub';renderPartitaForm()">‹ Indietro</button>` + renderSetupHtml(lega);
  } else {
    _serataView = 'hub';
    hdr.textContent = 'Serate';
    cnt.innerHTML = renderSerataHub(lega);
  }
  _formRendered = true;
}

function renderSerataHub(lega) {
  if (!lega.serate_bg) lega.serate_bg = [];
  const tutte = [];
  if (lega.sessioneAttiva) tutte.push({ s: lega.sessioneAttiva, bgIdx: -1 });
  lega.serate_bg.forEach((s, i) => tutte.push({ s, bgIdx: i }));

  const cardsHtml = tutte.map(({ s, bgIdx }) => {
    const tipo = s.modalita === 'torneo' ? '🏆 Torneo' : '💰 Cash';
    const nEnt = (s.giocatori || []).filter(g => g.entrato).length;
    const stato = s.stato === 'attivo' ? ' · ▶ In corso' : s.stato === 'pausa' ? ' · ⏸ Pausa' : '';
    return `<div class="serata-attiva-card" onclick="apriSerataAttiva(${bgIdx})">
      <div class="sac-dot">🔴</div>
      <div class="sac-info">
        <h3>${tipo} · ${fmtData(s.data || '')}</h3>
        <p>${nEnt} giocatori · Buy-in €${euro(s.buy_in || 0)}${stato}</p>
      </div>
      <div class="sac-arrow">›</div>
    </div>`;
  }).join('');

  return `
    <div class="hero-card" onclick="vaiSetupSerata()">
      <div class="h-ico">➕</div>
      <div class="h-text"><h3>Nuova serata</h3><p>Cash game o torneo</p></div>
    </div>
    ${cardsHtml || '<div class="empty" style="margin-top:16px"><div class="eico">♠</div><p>Nessuna serata in corso</p></div>'}
    <div style="height:20px"></div>
  `;
}

function vaiSetupSerata() {
  _serataView  = 'setup';
  _formRendered = false;
  renderPartitaForm();
}

function apriSerataAttiva(bgIdx) {
  const lega = currentLega();
  if (!lega) return;
  if (!lega.serate_bg) lega.serate_bg = [];
  if (bgIdx === -1) {
    // already current session
    _serataView = 'live';
    renderPartitaForm();
    return;
  }
  // swap bg session into current
  const bg = lega.serate_bg[bgIdx];
  if (!bg) return;
  lega.serate_bg[bgIdx] = lega.sessioneAttiva || null;
  lega.sessioneAttiva = bg;
  // clean up nulls
  lega.serate_bg = lega.serate_bg.filter(Boolean);
  saveLega(lega);
  _serataView = 'live';
  renderPartitaForm();
}

function setLiveSubTab(t) {
  _liveSubTab = t;
  renderPartitaForm();
}

function annullaSessione() {
  if (!confirm('Annullare la serata in corso? Tutti i dati saranno persi.')) return;
  const lega = currentLega();
  if (!lega) return;
  stopTimerInterval();
  delete lega.sessioneAttiva;
  if (lega.serate_bg && lega.serate_bg.length) {
    lega.sessioneAttiva = lega.serate_bg.shift();
  }
  saveLega(lega);
  _serataView = 'hub';
  _formRendered = false;
  renderPartitaForm();
  toast('Serata annullata');
}
