'use strict';

/* ══════════════════════════════════════════════════════
   LIVE SESSION — CASH (compute + render)
══════════════════════════════════════════════════════ */
function computeLive(lega) {
  const s = lega.sessioneAttiva;
  const arr = s.giocatori.map(g => {
    const ricaricheTot       = g.ricariche.reduce((a, r) => a + r.importo, 0);
    const ricarichePagate    = g.ricariche.reduce((a, r) => a + (r.pagata ? r.importo : 0), 0);
    const buyInDovuto        = g.entrato ? s.buy_in : 0;
    const buyInPagatoAmt     = (g.entrato && g.buy_in_pagato) ? s.buy_in : 0;
    const extraDovuto        = g.entrato ? (g.extra_amt || 0) : 0;
    const extraPagatoAmt     = (g.entrato && g.extra_amt > 0 && g.extra_pagato) ? g.extra_amt : 0;
    const versato_totale     = buyInDovuto + extraDovuto + ricaricheTot;
    const versato_pagato     = buyInPagatoAmt + extraPagatoAmt + ricarichePagate;
    const mancante           = Math.max(0, versato_totale - versato_pagato);
    const fiches             = g.fiches_finali || 0;
    const ricevuti           = g.soldi_ricevuti || 0;
    // Netto = fiches + soldi_ricevuti − (buy-in + extra + ricariche)  [fiches = €]
    const netto = g.entrato ? (fiches + ricevuti - versato_totale) : 0;
    return { ...g, ricaricheTot, versato: versato_totale, versato_pagato, mancante, fiches, ricevuti, netto };
  });
  let leaderId = null;
  const entrati = arr.filter(c => c.entrato);
  if (entrati.length) {
    const max = Math.max(...entrati.map(c => c.netto));
    if (max >= 0) {
      const w = entrati.find(c => c.netto === max);
      if (w) leaderId = w.id_nome;
    }
  }
  return { arr, leaderId };
}

function renderLiveHtml(lega) {
  const s = lega.sessioneAttiva;
  migrateSessione(s);
  if (s.modalita === 'torneo') {
    recoveryTimer();
    return renderLiveTorneoHtml(lega);
  }
  const modLabel = s.modalita === 'cash' ? '💰 Cash Game' : '🏆 Torneo';
  const meta = [
    s.ora_inizio ? `Inizio ${s.ora_inizio}` : '',
    s.ora_fine   ? `Fine ${s.ora_fine}`     : '',
    s.buy_in     ? `Buy-in €${euro(s.buy_in)}` : ''
  ].filter(Boolean).join(' · ');

  const tot    = s.giocatori.length;
  const attivi = s.giocatori.filter(g => g.entrato).length;

  const subTabs = `
    <div class="live-subtabs">
      <button class="live-subtab ${_liveSubTab === 'giocatori' ? 'active' : ''}" onclick="setLiveSubTab('giocatori')">
        👥 Giocatori <span class="count">${tot}</span>
      </button>
      <button class="live-subtab ${_liveSubTab === 'attivi' ? 'active' : ''}" onclick="setLiveSubTab('attivi')">
        ♠ Attivi <span class="count">${attivi}</span>
      </button>
    </div>
  `;

  const body = _liveSubTab === 'giocatori' ? renderSubGiocatori(lega) : renderSubAttivi(lega);

  return `
    <div class="live-summary">
      <div class="ls-row1">
        <span class="ls-data">${fmtData(s.data)}</span>
        <span class="ls-mod">${modLabel}</span>
      </div>
      <div class="ls-meta">${meta || '—'}</div>
    </div>

    ${subTabs}

    ${body}

    <div class="session-end-bar">
      <button class="btn btn-green btn-block" onclick="apriChiusura()">✓ Chiudi serata</button>
      <button class="btn btn-gray btn-block"  onclick="annullaSessione()">✕ Annulla serata</button>
    </div>
    <div style="height:16px"></div>
  `;
}

/* ───────── SUB-TAB: GIOCATORI ───────── */
function renderSubGiocatori(lega) {
  const s = lega.sessioneAttiva;
  const addBtn = `
    <button class="add-player-card" onclick="addGiocatoreSessione()">
      <span class="api">➕</span>
      <span class="apt">Aggiungi giocatore alla serata</span>
    </button>
  `;
  if (!s.giocatori.length) {
    return addBtn + '<div class="empty"><div class="eico">👥</div><p>Nessun giocatore nella serata</p></div>';
  }
  const cards = s.giocatori.map(g => {
    const nome    = getNome(lega, g.id_nome);
    const entrato = g.entrato;
    let body = '';
    if (entrato) {
      body = `
        <div class="status-line">
          <span class="sl-label">Buy-in €${euro(s.buy_in)} versato?</span>
          <button class="pay-toggle ${g.buy_in_pagato ? 'paid' : 'unpaid'}" onclick="toggleBuyInPagato(${g.id_nome})">
            ${g.buy_in_pagato ? '✓ Pagato' : '✕ Non pagato'}
          </button>
        </div>
        <div class="status-line">
          <span class="sl-label">Entrato con extra?</span>
          <div class="sl-actions">
            <input type="number" placeholder="€ extra" step="0.50" min="0" value="${g.extra_amt || ''}"
                   inputmode="decimal" onchange="setExtraAmt(${g.id_nome}, this.value)">
            ${g.extra_amt > 0
              ? `<button class="pay-toggle ${g.extra_pagato ? 'paid' : 'unpaid'}" onclick="toggleExtraPagato(${g.id_nome})">${g.extra_pagato ? '✓' : '✕'}</button>`
              : ''}
          </div>
        </div>
      `;
    } else {
      body = `
        <p class="help-note" style="margin:0 0 8px">Segna come entrato per registrare buy-in, ricariche, soldi ricevuti e fiches.</p>
        <button class="btn btn-gray btn-sm" onclick="rimuoviGiocatoreSessione(${g.id_nome})">Rimuovi dalla serata</button>
      `;
    }
    return `
      <div class="live-card ${entrato ? 'in' : ''}">
        <div class="lc-head">
          <div class="lc-name">${esc(nome)}</div>
          <label class="entrato-toggle">
            <input type="checkbox" ${entrato ? 'checked' : ''} onchange="toggleEntrato(${g.id_nome})">
            <span>${entrato ? 'Entrato' : 'Entra'}</span>
          </label>
        </div>
        <div class="lc-body">${body}</div>
      </div>
    `;
  }).join('');
  return addBtn + cards;
}

/* ───────── SUB-TAB: ATTIVI ───────── */
function renderSubAttivi(lega) {
  const { arr, leaderId } = computeLive(lega);
  const attivi = arr.filter(c => c.entrato);
  if (!attivi.length) {
    return `<div class="empty"><div class="eico">♠</div><p>Nessuno è ancora entrato.<br>Vai sulla tab <b>Giocatori</b> per segnare gli ingressi.</p></div>`;
  }
  const s = lega.sessioneAttiva;
  return attivi.map(c => {
    const isWinner = c.id_nome === leaderId;
    const nettoCls = c.netto > 0 ? 'pos' : c.netto < 0 ? 'neg' : 'neu';
    const nettoLabel = c.netto > 0 ? 'Riceve' : c.netto < 0 ? 'Deve dare' : '—';
    const ricariche = c.ricariche.map((r, i) => `
      <div class="ricariche-item">
        <span class="ri-amt">€${euro(r.importo)}</span>
        <div class="ri-actions">
          <button class="pay-toggle ${r.pagata ? 'paid' : 'unpaid'}" onclick="toggleRicaricaPagata(${c.id_nome}, ${i})">
            ${r.pagata ? '✓ Pagata' : '✕ Non pagata'}
          </button>
          <button class="btn-edit" onclick="modificaRicarica(${c.id_nome}, ${i})">✎</button>
        </div>
      </div>
    `).join('');
    const mancBtnTxt = c.mancante > 0
      ? `⚠ Mancano €${euro(c.mancante)} da versare`
      : '✓ Tutto versato';
    return `
      <div class="live-card in ${isWinner ? 'winner' : ''}" data-id="${c.id_nome}">
        <div class="lc-head">
          <div class="lc-name">
            ${esc(getNome(lega, c.id_nome))}
            ${isWinner ? '<span class="crown">👑</span>' : ''}
          </div>
        </div>
        <div class="lc-body">
          <div class="status-line">
            <span class="sl-label">Buy-in €${euro(s.buy_in)}</span>
            <button class="pay-toggle ${c.buy_in_pagato ? 'paid' : 'unpaid'}" onclick="toggleBuyInPagato(${c.id_nome})">
              ${c.buy_in_pagato ? '✓ Pagato' : '✕ Non pagato'}
            </button>
          </div>
          ${c.extra_amt > 0 ? `
            <div class="status-line">
              <span class="sl-label">Extra ingresso €${euro(c.extra_amt)}</span>
              <button class="pay-toggle ${c.extra_pagato ? 'paid' : 'unpaid'}" onclick="toggleExtraPagato(${c.id_nome})">
                ${c.extra_pagato ? '✓ Pagato' : '✕ Non pagato'}
              </button>
            </div>` : ''}

          ${c.ricariche.length ? `<div class="ricariche-list">${ricariche}</div>` : ''}
          <button class="btn btn-outline btn-sm" style="width:100%;margin-top:8px" onclick="aggiungiRicarica(${c.id_nome})">
            +€ Aggiungi ricarica
          </button>

          <div class="lc-row" style="margin-top:12px">
            <span class="lr-label">Soldi ricevuti in mano</span>
            <input type="number" id="live-ri-${c.id_nome}"
                   value="${c.soldi_ricevuti || ''}" placeholder="0"
                   step="0.50" min="0" inputmode="decimal"
                   oninput="setSoldiRicevuti(${c.id_nome}, this.value)">
          </div>
          <div class="lc-row">
            <span class="lr-label">Fiches finali (€)</span>
            <input type="number" id="live-fi-${c.id_nome}"
                   value="${c.fiches_finali || ''}" placeholder="0"
                   step="0.50" min="0" inputmode="decimal"
                   oninput="aggiornaFiches(${c.id_nome}, this.value)">
          </div>

          <div class="netto-block">
            <span class="netto-big ${nettoCls}">${euroSigned(c.netto)}</span>
            <div class="netto-label">${nettoLabel}</div>
          </div>

          <button class="mancante-btn ${c.mancante === 0 ? 'zero' : ''}" onclick="mostraMancanti(${c.id_nome})">
            ${mancBtnTxt}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/* ───────── AZIONI LIVE ───────── */
function toggleEntrato(idNome) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const g = lega.sessioneAttiva.giocatori.find(x => x.id_nome === idNome);
  if (!g) return;
  g.entrato = !g.entrato;
  saveLega(lega);
  renderPartitaForm();
}

function toggleBuyInPagato(idNome) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const g = lega.sessioneAttiva.giocatori.find(x => x.id_nome === idNome);
  if (!g) return;
  if (!g.entrato) { toast('Prima segna il giocatore come entrato'); return; }
  g.buy_in_pagato = !g.buy_in_pagato;
  saveLega(lega);
  renderPartitaForm();
}

function setExtraAmt(idNome, val) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const g = lega.sessioneAttiva.giocatori.find(x => x.id_nome === idNome);
  if (!g) return;
  const v = parseFloat(String(val).replace(',', '.')) || 0;
  g.extra_amt = v;
  if (v === 0) g.extra_pagato = true;
  saveLega(lega);
  renderPartitaForm();
}

function toggleExtraPagato(idNome) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const g = lega.sessioneAttiva.giocatori.find(x => x.id_nome === idNome);
  if (!g) return;
  g.extra_pagato = !g.extra_pagato;
  saveLega(lega);
  renderPartitaForm();
}

function toggleRicaricaPagata(idNome, idx) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const g = lega.sessioneAttiva.giocatori.find(x => x.id_nome === idNome);
  if (!g || !g.ricariche[idx]) return;
  g.ricariche[idx].pagata = !g.ricariche[idx].pagata;
  saveLega(lega);
  renderPartitaForm();
}

function aggiungiRicarica(idNome) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const g = lega.sessioneAttiva.giocatori.find(x => x.id_nome === idNome);
  if (!g) return;
  if (!g.entrato) { toast('Prima segna il giocatore come entrato'); return; }
  const raw = prompt('Importo ricarica (€)');
  if (raw === null) return;
  const v = parseFloat(String(raw).replace(',', '.'));
  if (isNaN(v) || v <= 0) { toast('Importo non valido'); return; }
  const pagata = confirm('Ha già versato i soldi?\n\n[OK] Sì, già versati\n[Annulla] Da pagare ancora');
  g.ricariche.push({ importo: v, pagata });
  saveLega(lega);
  renderPartitaForm();
}

function modificaRicarica(idNome, idx) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const g = lega.sessioneAttiva.giocatori.find(x => x.id_nome === idNome);
  if (!g || !g.ricariche[idx]) return;
  const cur = g.ricariche[idx];
  const raw = prompt(`Modifica importo (€${euro(cur.importo)}). Scrivi 0 per eliminare.`, cur.importo);
  if (raw === null) return;
  const v = parseFloat(String(raw).replace(',', '.'));
  if (isNaN(v) || v < 0) { toast('Importo non valido'); return; }
  if (v === 0) g.ricariche.splice(idx, 1);
  else         g.ricariche[idx].importo = v;
  saveLega(lega);
  renderPartitaForm();
}

function setSoldiRicevuti(idNome, val) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const g = lega.sessioneAttiva.giocatori.find(x => x.id_nome === idNome);
  if (!g) return;
  g.soldi_ricevuti = parseFloat(String(val).replace(',', '.')) || 0;
  saveLega(lega);
  aggiornaUiCalcoli();
}

function aggiornaFiches(idNome, val) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const g = lega.sessioneAttiva.giocatori.find(x => x.id_nome === idNome);
  if (!g) return;
  g.fiches_finali = parseFloat(String(val).replace(',', '.')) || 0;
  saveLega(lega);
  aggiornaUiCalcoli();
}

function aggiornaUiCalcoli() {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const { arr, leaderId } = computeLive(lega);
  arr.forEach(c => {
    const card = document.querySelector(`.live-card[data-id="${c.id_nome}"]`);
    if (!card) return;
    const isW = c.id_nome === leaderId;
    card.classList.toggle('winner', isW);
    const nameEl = card.querySelector('.lc-name');
    let crownEl = nameEl.querySelector('.crown');
    if (isW && !crownEl) nameEl.insertAdjacentHTML('beforeend', '<span class="crown">👑</span>');
    else if (!isW && crownEl) crownEl.remove();
    const nettoEl = card.querySelector('.netto-big');
    if (nettoEl) {
      nettoEl.className = 'netto-big ' + (c.netto > 0 ? 'pos' : c.netto < 0 ? 'neg' : 'neu');
      nettoEl.textContent = euroSigned(c.netto);
    }
    const lblEl = card.querySelector('.netto-label');
    if (lblEl) lblEl.textContent = c.netto > 0 ? 'Riceve' : c.netto < 0 ? 'Deve dare' : '—';
    const mbtn = card.querySelector('.mancante-btn');
    if (mbtn) {
      mbtn.classList.toggle('zero', c.mancante === 0);
      mbtn.textContent = c.mancante > 0
        ? `⚠ Mancano €${euro(c.mancante)} da versare`
        : '✓ Tutto versato';
    }
  });
}

function addGiocatoreSessione() {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const inSess = new Set(lega.sessioneAttiva.giocatori.map(g => g.id_nome));
  const disponibili = lega.nomi.filter(n => !inSess.has(n.id));
  let msg = 'Nome del giocatore da aggiungere:';
  if (disponibili.length) msg += '\n\nDisponibili dalla lega:\n' + disponibili.map(n => '• ' + n.nome).join('\n');
  const raw = prompt(msg);
  if (raw === null) return;
  const nome = raw.trim();
  if (!nome) return;
  let existing = lega.nomi.find(n => n.nome.toLowerCase() === nome.toLowerCase());
  if (existing && inSess.has(existing.id)) { toast('Già nella serata'); return; }
  if (!existing) {
    existing = { id: lega._nid++, nome };
    lega.nomi.push(existing);
  }
  lega.sessioneAttiva.giocatori.push(nuovoGiocatoreSessione(existing.id));
  saveLega(lega);
  renderPartitaForm();
  toast('✓ ' + nome + ' aggiunto alla serata');
}

function rimuoviGiocatoreSessione(idNome) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const g = lega.sessioneAttiva.giocatori.find(x => x.id_nome === idNome);
  if (!g) return;
  if (g.entrato) { toast('Non puoi rimuovere un giocatore già entrato'); return; }
  if (!confirm(`Rimuovere ${getNome(lega, idNome)} dalla serata?`)) return;
  lega.sessioneAttiva.giocatori = lega.sessioneAttiva.giocatori.filter(x => x.id_nome !== idNome);
  saveLega(lega);
  renderPartitaForm();
}

function mostraMancanti(idNome) {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const { arr } = computeLive(lega);
  const c = arr.find(x => x.id_nome === idNome);
  if (!c) return;
  if (c.mancante <= 0) { toast('✓ Tutto versato!'); return; }
  let det = `${getNome(lega, idNome)} deve ancora versare €${euro(c.mancante)}\n\nDettaglio:`;
  if (!c.buy_in_pagato)                     det += `\n• Buy-in: €${euro(lega.sessioneAttiva.buy_in)}`;
  if (c.extra_amt > 0 && !c.extra_pagato)   det += `\n• Extra ingresso: €${euro(c.extra_amt)}`;
  c.ricariche.forEach((r, i) => {
    if (!r.pagata) det += `\n• Ricarica ${i+1}: €${euro(r.importo)}`;
  });
  alert(det);
}
