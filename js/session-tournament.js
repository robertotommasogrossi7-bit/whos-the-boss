'use strict';

/* ══════════════════════════════════════════════════════
   TORNEO — LIVE (timer, blinds, controlli, sub-tab)
══════════════════════════════════════════════════════ */
function stopTimerInterval() {
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
}

function ensureTimer() {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva || lega.sessioneAttiva.modalita !== 'torneo') {
    stopTimerInterval(); return;
  }
  const s = lega.sessioneAttiva;
  if (s.stato === 'attivo') {
    if (!_timerInterval) _timerInterval = setInterval(tickTimer, 1000);
  } else {
    stopTimerInterval();
  }
}

function tickTimer() {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva || lega.sessioneAttiva.modalita !== 'torneo') {
    stopTimerInterval(); return;
  }
  const s = lega.sessioneAttiva;
  if (s.stato !== 'attivo') { stopTimerInterval(); return; }
  const livello = s.livelli[s.livello_corrente];
  if (!livello) { stopTimerInterval(); return; }
  const totale = livello.durata * 60 * 1000;
  const trascorso = Date.now() - s.inizio_livello_ms;
  const residuo = totale - trascorso;
  if (residuo <= 0) {
    avanzaLivelloAuto();
  } else {
    const sec = Math.ceil(residuo / 1000);
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    const el = document.getElementById('timer-clock');
    if (el) el.textContent = String(m).padStart(2,'0') + ':' + String(r).padStart(2,'0');
  }
}

function recoveryTimer() {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const s = lega.sessioneAttiva;
  if (s.modalita !== 'torneo' || s.stato !== 'attivo') return;
  let advanced = 0;
  while (s.livello_corrente < s.livelli.length) {
    const livello = s.livelli[s.livello_corrente];
    const totale = livello.durata * 60 * 1000;
    const trascorso = Date.now() - s.inizio_livello_ms;
    if (trascorso < totale) break;
    s.livello_corrente++;
    s.inizio_livello_ms += totale;
    advanced++;
    consolidaPremiSeNecessario(s);
  }
  if (s.livello_corrente >= s.livelli.length) {
    s.livello_corrente = s.livelli.length - 1;
    s.stato = 'concluso';
  }
  if (advanced > 0) saveLega(lega);
}

function avviaTorneo() {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const s = lega.sessioneAttiva;
  if (s.stato !== 'pre') return;
  s.stato = 'attivo';
  s.inizio_livello_ms = Date.now() - (s.trascorso_ms || 0);
  s.trascorso_ms = 0;
  saveLega(lega);
  renderPartitaForm();
  toast('▶ Torneo avviato!');
}

function pausaTorneo() {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const s = lega.sessioneAttiva;
  if (s.stato !== 'attivo') return;
  s.trascorso_ms = Date.now() - s.inizio_livello_ms;
  s.stato = 'pausa';
  stopTimerInterval();
  saveLega(lega);
  renderPartitaForm();
  toast('⏸ Pausa');
}

function riprendiTorneo() {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const s = lega.sessioneAttiva;
  if (s.stato !== 'pausa') return;
  s.inizio_livello_ms = Date.now() - (s.trascorso_ms || 0);
  s.trascorso_ms = 0;
  s.stato = 'attivo';
  saveLega(lega);
  renderPartitaForm();
  toast('▶ Ripreso');
}

function avanzaLivelloAuto() {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const s = lega.sessioneAttiva;
  if (s.livello_corrente + 1 >= s.livelli.length) {
    s.stato = 'concluso';
    stopTimerInterval();
    saveLega(lega);
    renderPartitaForm();
    toast('Ultimo livello completato');
    return;
  }
  s.livello_corrente++;
  s.inizio_livello_ms = Date.now();
  s.trascorso_ms = 0;
  consolidaPremiSeNecessario(s);
  saveLega(lega);
  renderPartitaForm();
}

function avanzaLivelloManuale() {
  if (!confirm('Passare al livello successivo?')) return;
  avanzaLivelloAuto();
  toast('▶ Livello successivo');
}

function stopTorneo() {
  if (!confirm('Concludere il torneo? Lo stato verrà bloccato e potrai chiudere la serata.')) return;
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const s = lega.sessioneAttiva;
  s.stato = 'concluso';
  stopTimerInterval();
  consolidaPremiSeNecessario(s);
  saveLega(lega);
  renderPartitaForm();
  toast('⏹ Torneo terminato');
}

function consolidaPremiSeNecessario(s) {
  if (s.premi_consolidati) return;
  const gameLvlNow = s.livelli.slice(0, s.livello_corrente + 1).filter(l => l.tipo === 'gioco').length;
  if (gameLvlNow > s.late_reg.fino_a_livello || s.stato === 'concluso') {
    const entrati = s.giocatori.filter(g => g.entrato).length;
    const monte = calcolaMontepremi(s);
    s.premi = calcolaPremi(monte, entrati);
    s.premi_consolidati = true;
  }
}

/* ───────── RENDER TORNEO LIVE ───────── */
function renderLiveTorneoHtml(lega) {
  const s = lega.sessioneAttiva;
  if (!['orologio', 'giocatori', 'premi'].includes(_liveSubTab)) _liveSubTab = 'orologio';

  // Header
  const meta = [
    s.ora_inizio ? `Inizio ${s.ora_inizio}` : '',
    s.buy_in     ? `Buy-in €${euro(s.buy_in)}` : '',
    s.fiche_iniziali ? `${s.fiche_iniziali.toLocaleString('it-IT')} fiche` : ''
  ].filter(Boolean).join(' · ');

  const header = `
    <div class="live-summary">
      <div class="ls-row1">
        <span class="ls-data">${fmtData(s.data)}</span>
        <span class="ls-mod">🏆 Torneo</span>
      </div>
      <div class="ls-meta">${meta || '—'}</div>
    </div>
  `;

  // Sub-tabs
  const vivi = s.giocatori.filter(g => g.entrato && !g.eliminato).length;
  const totEntrati = s.giocatori.filter(g => g.entrato).length;
  const subTabs = `
    <div class="live-subtabs">
      <button class="live-subtab ${_liveSubTab==='orologio'?'active':''}" onclick="setLiveSubTab('orologio')">🕐 Orologio</button>
      <button class="live-subtab ${_liveSubTab==='giocatori'?'active':''}" onclick="setLiveSubTab('giocatori')">👥 Player <span class="count">${vivi}/${totEntrati || s.giocatori.length}</span></button>
      <button class="live-subtab ${_liveSubTab==='premi'?'active':''}" onclick="setLiveSubTab('premi')">💰 Premi</button>
    </div>
  `;

  let body;
  if (_liveSubTab === 'orologio')       body = renderSubOrologio(lega);
  else if (_liveSubTab === 'giocatori') body = renderSubGiocatoriTorneo(lega);
  else                                  body = renderSubPremi(lega);

  // Bottom controls
  const bottom = `
    <div class="session-end-bar">
      <button class="btn btn-green btn-block" onclick="apriChiusura()">✓ Chiudi serata</button>
      <button class="btn btn-gray btn-block"  onclick="annullaSessione()">✕ Annulla torneo</button>
    </div>
    <div style="height:16px"></div>
  `;

  // Avvia/ferma timer in base allo stato
  setTimeout(ensureTimer, 0);

  return header + subTabs + body + bottom;
}

function renderSubOrologio(lega) {
  const s = lega.sessioneAttiva;
  const livello = s.livelli[s.livello_corrente];
  const isPausa = livello && livello.tipo === 'pausa';

  let totaleMs = livello ? livello.durata * 60 * 1000 : 0;
  let trascorso = 0;
  if (s.stato === 'attivo' && s.inizio_livello_ms) trascorso = Date.now() - s.inizio_livello_ms;
  else if (s.stato === 'pausa')                    trascorso = s.trascorso_ms || 0;
  const residuo = Math.max(0, totaleMs - trascorso);

  const gameLvlNum = s.livelli.slice(0, s.livello_corrente + 1).filter(l => l.tipo === 'gioco').length;
  const totGameLevels = s.livelli.filter(l => l.tipo === 'gioco').length;
  let nextGioco = null;
  for (let i = s.livello_corrente + 1; i < s.livelli.length; i++) {
    if (s.livelli[i].tipo === 'gioco') { nextGioco = s.livelli[i]; break; }
  }

  let statusLbl, cardCls = '';
  if (s.stato === 'pre')         { statusLbl = 'PRE-TORNEO — premi START'; }
  else if (s.stato === 'attivo') {
    if (isPausa) { statusLbl = '🍕 PAUSA DI TORNEO'; cardCls = 'break'; }
    else         { statusLbl = `LIVELLO ${gameLvlNum} di ${totGameLevels}`; }
  }
  else if (s.stato === 'pausa')  { statusLbl = '⏸ PAUSA MANUALE'; cardCls = 'pausa'; }
  else if (s.stato === 'concluso'){ statusLbl = '⏹ TORNEO CONCLUSO'; cardCls = 'concluso'; }

  const sec = Math.ceil(residuo / 1000);
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  const clockStr = String(m).padStart(2,'0') + ':' + String(r).padStart(2,'0');

  let blindInfo;
  if (isPausa)        blindInfo = `<div class="timer-blinds">🍕 Break</div>`;
  else if (livello)   blindInfo = `<div class="timer-blinds">${livello.sb.toLocaleString('it-IT')} / ${livello.bb.toLocaleString('it-IT')}${livello.ante > 0 ? `<span class="ante">Ante ${livello.ante.toLocaleString('it-IT')}</span>` : ''}</div>`;
  else                blindInfo = '';

  let nextHtml = '';
  if (nextGioco) nextHtml = `<div class="timer-next">Prossimo: ${nextGioco.sb.toLocaleString('it-IT')} / ${nextGioco.bb.toLocaleString('it-IT')}${nextGioco.ante > 0 ? ` · ante ${nextGioco.ante.toLocaleString('it-IT')}` : ''}</div>`;
  else if (s.livello_corrente >= s.livelli.length - 1) nextHtml = `<div class="timer-next">Ultimo livello</div>`;

  let controls = '';
  if (s.stato === 'pre')           controls = `<button class="tc-btn primary" onclick="avviaTorneo()">▶ Avvia torneo</button>`;
  else if (s.stato === 'attivo')   controls = `
    <button class="tc-btn" onclick="pausaTorneo()">⏸ Pausa</button>
    <button class="tc-btn" onclick="avanzaLivelloManuale()">⏭ Prossimo</button>
    <button class="tc-btn" onclick="stopTorneo()">⏹ Stop</button>
  `;
  else if (s.stato === 'pausa')    controls = `
    <button class="tc-btn primary" onclick="riprendiTorneo()">▶ Riprendi</button>
    <button class="tc-btn" onclick="stopTorneo()">⏹ Stop</button>
  `;
  else if (s.stato === 'concluso') controls = `<span style="opacity:.85;flex:1;text-align:center;padding:10px;font-weight:700">Procedi alla chiusura ↓</span>`;

  // Stats
  const entrati = s.giocatori.filter(g => g.entrato).length;
  const vivi = s.giocatori.filter(g => g.entrato && !g.eliminato).length;
  const monte = calcolaMontepremi(s);

  // Reg banner
  const lateRegOpen = gameLvlNum <= s.late_reg.fino_a_livello;
  const regBanner = `
    <div class="reg-banner ${lateRegOpen ? '' : 'closed'}">
      ${lateRegOpen ? '📝' : '🔒'}
      <span style="flex:1">${lateRegOpen
        ? `Late reg aperta (fino a fine L${s.late_reg.fino_a_livello})`
        : 'Late reg chiusa — montepremi consolidato'}</span>
    </div>
  `;

  return `
    <div class="timer-card ${cardCls}">
      <div class="timer-level">${statusLbl}</div>
      <div class="timer-clock" id="timer-clock">${clockStr}</div>
      ${blindInfo}
      ${nextHtml}
      <div class="timer-controls">${controls}</div>
    </div>

    ${regBanner}

    <div class="stats-mini-bar">
      <div class="smb-item">
        <div class="smb-label">Iscritti</div>
        <div class="smb-val">${entrati}</div>
      </div>
      <div class="smb-item">
        <div class="smb-label">In gioco</div>
        <div class="smb-val">${vivi}</div>
      </div>
      <div class="smb-item">
        <div class="smb-label">Montepremi</div>
        <div class="smb-val">€${euro(monte)}</div>
      </div>
    </div>
  `;
}

function renderSubGiocatoriTorneo(lega) {
  const s = lega.sessioneAttiva;
  const gameLvlNow = s.livelli.slice(0, s.livello_corrente + 1).filter(l => l.tipo === 'gioco').length;
  const lateRegOpen = gameLvlNow <= s.late_reg.fino_a_livello;
  const addOnAvailable = s.add_on && s.add_on.abilitato;

  const addBtn = `
    <button class="add-player-card" onclick="torneoAggiungiGiocatore()" ${(!lateRegOpen && s.stato !== 'pre') ? 'disabled style="opacity:.5"' : ''}>
      <span class="api">➕</span>
      <span class="apt">${(!lateRegOpen && s.stato !== 'pre') ? 'Late reg chiusa — non puoi aggiungere' : 'Aggiungi giocatore al torneo'}</span>
    </button>
  `;

  if (!s.giocatori.length) {
    return addBtn + '<div class="empty"><div class="eico">👥</div><p>Nessun giocatore nel torneo</p></div>';
  }

  const sorted = [...s.giocatori].sort((a, b) => {
    if (a.entrato !== b.entrato) return a.entrato ? -1 : 1;
    if (a.eliminato !== b.eliminato) return a.eliminato ? 1 : -1;
    if (a.eliminato && b.eliminato) return (b.elim_ts_ms || 0) - (a.elim_ts_ms || 0);
    return 0;
  });

  const cards = sorted.map(g => {
    const nome = getNome(lega, g.id_nome);
    const seat = g.seat ? `<span class="seat">T${g.seat.tavolo}·P${g.seat.posto}</span>` : '';
    const cardCls = g.eliminato ? 'busted' : (g.entrato ? 'in' : '');

    let posBadge = '';
    if (g.posizione_finale === 1)                  posBadge = `<span class="pos">🏆 1°</span>`;
    else if (g.posizione_finale && g.eliminato)    posBadge = `<span class="pos">#${g.posizione_finale}</span>`;

    let body = '';
    if (!g.entrato) {
      body = `
        <p class="help-note" style="margin:0 0 6px">Tocca "Entra" quando si siede al tavolo.</p>
        <div class="torneo-pcard-actions">
          <button class="ta-paid" onclick="toggleEntrato(${g.id_nome})">✓ Entra</button>
          <button class="ta-bust" onclick="rimuoviGiocatoreSessione(${g.id_nome})">Rimuovi</button>
        </div>
      `;
    } else {
      const totVersato = (g.buy_in_pagato ? s.buy_in : 0)
                       + (g.rebuys || []).reduce((a,r) => a + (r.pagata ? r.importo : 0), 0)
                       + (g.add_on_fatto && g.add_on_pagato ? s.add_on.prezzo : 0);
      const totDovuto  = s.buy_in
                       + (g.rebuys || []).reduce((a,r) => a + r.importo, 0)
                       + (g.add_on_fatto ? s.add_on.prezzo : 0);
      const mancante   = totDovuto - totVersato;

      let rebuysHtml = '';
      if (g.rebuys && g.rebuys.length) {
        rebuysHtml = g.rebuys.map((r, i) => `
          <div class="torneo-info-row" style="background:#f7f7f7;padding:6px 9px;border-radius:8px">
            <span class="ti-lbl">Rebuy ${i+1} · €${euro(r.importo)}</span>
            <button class="pay-toggle ${r.pagata ? 'paid' : 'unpaid'}" onclick="torneoToggleRebuyPag(${g.id_nome}, ${i})">${r.pagata ? '✓ Pagato' : '✕ Non pagato'}</button>
          </div>
        `).join('');
      }
      let addOnHtml = '';
      if (g.add_on_fatto) {
        addOnHtml = `
          <div class="torneo-info-row" style="background:var(--gold-bg);padding:6px 9px;border-radius:8px">
            <span class="ti-lbl">Add-on · €${euro(s.add_on.prezzo)}</span>
            <button class="pay-toggle ${g.add_on_pagato ? 'paid' : 'unpaid'}" onclick="torneoToggleAddOnPag(${g.id_nome})">${g.add_on_pagato ? '✓ Pagato' : '✕ Non pagato'}</button>
          </div>
        `;
      }

      let actions;
      if (!g.eliminato) {
        actions = `
          <div class="torneo-pcard-actions">
            ${lateRegOpen ? `<button class="ta-rebuy" onclick="torneoAddRebuy(${g.id_nome})">+ Rebuy</button>` : ''}
            ${addOnAvailable && !g.add_on_fatto ? `<button class="ta-addon" onclick="torneoAddOn(${g.id_nome})">+ Add-on</button>` : ''}
            <button class="ta-bust" onclick="torneoElimina(${g.id_nome})">❌ Eliminato</button>
          </div>
        `;
      } else {
        actions = `
          <div class="torneo-pcard-actions">
            ${lateRegOpen ? `<button class="ta-rebuy" onclick="torneoAddRebuy(${g.id_nome})">+ Rebuy (rientra)</button>` : ''}
            <button class="ta-revive" onclick="torneoRevive(${g.id_nome})">Reintegra</button>
          </div>
        `;
      }

      body = `
        <div class="torneo-info-row">
          <span class="ti-lbl">Stato</span>
          <span class="ti-val">${g.eliminato ? '☠ Eliminato' + (g.posizione_finale ? ' · #' + g.posizione_finale : '') : '✓ In gioco'}</span>
        </div>
        <div class="torneo-info-row" style="background:#f7f7f7;padding:6px 9px;border-radius:8px;margin-top:4px">
          <span class="ti-lbl">Buy-in · €${euro(s.buy_in)}</span>
          <button class="pay-toggle ${g.buy_in_pagato ? 'paid' : 'unpaid'}" onclick="toggleBuyInPagato(${g.id_nome})">${g.buy_in_pagato ? '✓ Pagato' : '✕ Non pagato'}</button>
        </div>
        ${rebuysHtml}
        ${addOnHtml}
        <div class="torneo-info-row" style="margin-top:6px">
          <span class="ti-lbl">Totale versato</span>
          <span class="ti-val">€${euro(totVersato)} / €${euro(totDovuto)}</span>
        </div>
        ${mancante > 0.005 ? `<div class="mancante-btn" style="margin-top:6px;font-size:13px">⚠ Mancano €${euro(mancante)} da versare</div>` : ''}
        ${actions}
      `;
    }

    return `
      <div class="torneo-pcard ${cardCls}">
        <div class="torneo-pcard-head">
          <div class="torneo-pcard-name">
            ${esc(nome)} ${seat} ${posBadge}
          </div>
        </div>
        <div class="torneo-pcard-body">${body}</div>
      </div>
    `;
  }).join('');

  return addBtn + cards;
}

/* ───────── AZIONI TORNEO ───────── */
function torneoAggiungiGiocatore() {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const s = lega.sessioneAttiva;
  const gameLvl = s.livelli.slice(0, s.livello_corrente + 1).filter(l => l.tipo === 'gioco').length;
  if (s.stato !== 'pre' && gameLvl > s.late_reg.fino_a_livello) {
    toast('Late reg chiusa — non puoi aggiungere altri giocatori'); return;
  }
  addGiocatoreSessione();
  // Riassegna posto se possibile
  const last = s.giocatori[s.giocatori.length - 1];
  if (last && !last.seat) {
    const used = new Set(s.giocatori.filter(g => g.seat).map(g => `T${g.seat.tavolo}P${g.seat.posto}`));
    const numT = s.num_tavoli || Math.ceil(s.giocatori.length / 9);
    outer: for (let t = 1; t <= numT + 1; t++) {
      for (let p = 1; p <= 9; p++) {
        if (!used.has(`T${t}P${p}`)) { last.seat = { tavolo: t, posto: p }; break outer; }
      }
    }
    if (last.seat && last.seat.tavolo > numT) s.num_tavoli = last.seat.tavolo;
    saveLega(lega);
    renderPartitaForm();
  }
}

function torneoAddRebuy(idNome) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const s = lega.sessioneAttiva;
  const g = s.giocatori.find(x => x.id_nome === idNome);
  if (!g || !g.entrato) return;
  const gameLvl = s.livelli.slice(0, s.livello_corrente + 1).filter(l => l.tipo === 'gioco').length;
  if (s.stato !== 'pre' && gameLvl > s.late_reg.fino_a_livello) { toast('Late reg chiusa'); return; }
  const pagata = confirm('Ha già versato i soldi del rebuy?\n\n[OK] Sì, già versati\n[Annulla] Da pagare');
  g.rebuys = g.rebuys || [];
  g.rebuys.push({ importo: s.buy_in, pagata });
  if (g.eliminato) { g.eliminato = false; g.elim_ts_ms = null; g.posizione_finale = null; }
  saveLega(lega);
  renderPartitaForm();
  toast('✓ Rebuy aggiunto');
}

function torneoAddOn(idNome) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const s = lega.sessioneAttiva;
  if (!s.add_on || !s.add_on.abilitato) { toast('Add-on non disponibile'); return; }
  const g = s.giocatori.find(x => x.id_nome === idNome);
  if (!g || !g.entrato || g.eliminato) return;
  if (g.add_on_fatto) { toast('Add-on già preso'); return; }
  const pagato = confirm('Ha già versato i soldi dell\'add-on?\n\n[OK] Sì, già versati\n[Annulla] Da pagare');
  g.add_on_fatto = true;
  g.add_on_pagato = pagato;
  saveLega(lega);
  renderPartitaForm();
  toast('✓ Add-on');
}

function torneoRevive(idNome) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const g = lega.sessioneAttiva.giocatori.find(x => x.id_nome === idNome);
  if (!g || !g.eliminato) return;
  g.eliminato = false; g.elim_ts_ms = null; g.posizione_finale = null;
  saveLega(lega);
  renderPartitaForm();
  toast('Reintegrato');
}

function torneoToggleAddOnPag(idNome) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const g = lega.sessioneAttiva.giocatori.find(x => x.id_nome === idNome);
  if (!g) return;
  g.add_on_pagato = !g.add_on_pagato;
  saveLega(lega);
  renderPartitaForm();
}

function torneoToggleRebuyPag(idNome, idx) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const g = lega.sessioneAttiva.giocatori.find(x => x.id_nome === idNome);
  if (!g || !g.rebuys || !g.rebuys[idx]) return;
  g.rebuys[idx].pagata = !g.rebuys[idx].pagata;
  saveLega(lega);
  renderPartitaForm();
}
