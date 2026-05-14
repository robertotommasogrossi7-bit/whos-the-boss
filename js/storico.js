'use strict';

/* ══════════════════════════════════════════════════════
   TAB 3 – STORICO
══════════════════════════════════════════════════════ */
function renderStorico() {
  const lega = currentLega();
  if (!lega) return;
  const el = document.getElementById('storico-container');
  document.getElementById('cnt-partite').textContent =
    lega.partite.length + (lega.partite.length === 1 ? ' partita' : ' partite');

  if (!lega.partite.length) {
    el.innerHTML = '<div class="empty"><div class="eico">📋</div><p>Nessuna partita salvata</p></div>';
    return;
  }

  lega.partite.forEach(migratePartita);

  const medals = ['🥇', '🥈', '🥉'];
  let partite = lega.partite.slice().sort((a, b) => b.data.localeCompare(a.data));
  if (_storicoFrom) partite = partite.filter(p => p.data >= _storicoFrom);
  if (_storicoTo)   partite = partite.filter(p => p.data <= _storicoTo);

  const filterBar = `
    <div class="date-filter-bar">
      <label>Da</label>
      <input type="date" value="${_storicoFrom}" onchange="_storicoFrom=this.value;renderStorico()">
      <label>A</label>
      <input type="date" value="${_storicoTo}" onchange="_storicoTo=this.value;renderStorico()">
      ${(_storicoFrom||_storicoTo) ? `<button class="btn-reset" onclick="_storicoFrom='';_storicoTo='';renderStorico()">✕ Reset</button>` : ''}
    </div>`;

  if (!partite.length) {
    el.innerHTML = filterBar + '<div class="empty"><div class="eico">📋</div><p>Nessuna partita nel periodo selezionato</p></div>';
    return;
  }

  el.innerHTML = filterBar + partite.map(p => {
    // Giocatori ordinati per netto desc
    const giocOrd = (p.giocatori || []).slice().sort((a, b) => (b.netto_finale || 0) - (a.netto_finale || 0));
    // Vincitore = primo della lista se netto > 0 (sennò nessuna corona)
    const winnerId = (giocOrd[0] && giocOrd[0].netto_finale > 0) ? giocOrd[0].id_nome : null;

    const rows = giocOrd.map((g, i) => {
      const rankCls = (i < 3) ? `rank-${i+1}` : '';
      const medal   = medals[i] || (i + 1);
      const isWin   = g.id_nome === winnerId;
      const nettoCls = g.netto_finale > 0 ? 'pos' : g.netto_finale < 0 ? 'neg' : 'neu';

      // Costruisci pillole pagamenti per questo giocatore
      const pills = [];
      (p.settlements || []).forEach((stl, idx) => {
        if (stl.from === g.id_nome) {
          // questo giocatore DEVE pagare stl.to
          const lbl = `€${euro(stl.amount)} → ${esc(getNome(lega, stl.to))}`;
          pills.push(`<button class="pay-pill ${stl.pagato ? 'paid' : 'debt'}" onclick="toggleSettlementPaid(${p.id}, ${idx})">${lbl}</button>`);
        } else if (stl.to === g.id_nome) {
          // questo giocatore RICEVE da stl.from
          const lbl = `€${euro(stl.amount)} ← ${esc(getNome(lega, stl.from))}`;
          pills.push(`<button class="pay-pill ${stl.pagato ? 'paid' : 'credit'}" onclick="toggleSettlementPaid(${p.id}, ${idx})">${lbl}</button>`);
        }
      });
      const payCell = pills.length
        ? `<div class="pay-cell">${pills.join('')}</div>`
        : (g.netto_finale === 0 ? '<span class="neu">—</span>' : '<span class="pay-empty">✓</span>');

      return `
        <tr class="${rankCls}">
          <td><span class="rank-pos"><span class="medal">${medal}</span></span></td>
          <td>
            <span class="name-with-crown">
              <strong>${esc(getNome(lega, g.id_nome))}</strong>
              ${isWin ? '<span class="crown">👑</span>' : ''}
            </span>
          </td>
          <td>€${euro(g.entrate)}</td>
          <td>€${euro(g.ricarica_fatta)}</td>
          <td class="${nettoCls}">${euroSigned(g.netto_finale)}</td>
          <td>${payCell}</td>
        </tr>`;
    }).join('');

    const oraInfo = (p.ora_inizio || p.ora_fine)
      ? `<div style="font-size:12px;opacity:.85;margin-top:1px">${p.ora_inizio || '?'}${p.ora_fine ? ' — ' + p.ora_fine : ''}${p.modalita ? ' · ' + (p.modalita === 'cash' ? 'Cash' : 'Torneo') : ''}${p.buy_in ? ' · Buy-in €' + euro(p.buy_in) : ''}</div>`
      : '';

    return `
      <div class="game-card">
        <div class="game-card-head" style="cursor:pointer" onclick="toggleStoricoCard(${p.id})">
          <div>
            <div class="game-card-date">${fmtData(p.data)}</div>
            ${oraInfo}
          </div>
          <div class="game-card-actions">
            <span id="sc-tog-${p.id}" style="font-size:13px;opacity:.8;margin-right:4px">${_storicoOpen.has(p.id)?'▼':'▶'}</span>
            <button class="ic-btn" title="Elimina" onclick="event.stopPropagation();eliminaPartita(${p.id})">🗑</button>
          </div>
        </div>
        <div id="sc-body-${p.id}" style="${_storicoOpen.has(p.id)?'':'display:none'}">
          <div class="tbl-wrap">
            <table class="ranking-tbl">
              <thead>
                <tr>
                  <th>#</th><th>Nome</th><th>Entrata</th><th>Ricarica</th>
                  <th>Netto</th><th>Soldi</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleStoricoCard(id) {
  if (_storicoOpen.has(id)) _storicoOpen.delete(id);
  else _storicoOpen.add(id);
  const body = document.getElementById('sc-body-' + id);
  if (body) body.style.display = _storicoOpen.has(id) ? '' : 'none';
  const icon = document.getElementById('sc-tog-' + id);
  if (icon) icon.textContent = _storicoOpen.has(id) ? '▼' : '▶';
}

function toggleSettlementPaid(partitaId, idx) {
  const lega = currentLega();
  if (!lega) return;
  const p = lega.partite.find(x => x.id === partitaId);
  if (!p || !p.settlements || !p.settlements[idx]) return;
  p.settlements[idx].pagato = !p.settlements[idx].pagato;
  saveLega(lega);
  renderStorico();
  aggiornaFabDebiti();
  toast(p.settlements[idx].pagato ? '✓ Pagamento saldato' : 'Pagamento riaperto');
}

function eliminaPartita(id) {
  if (!confirm('Eliminare questa partita?')) return;
  const lega = currentLega();
  if (!lega) return;
  lega.partite = lega.partite.filter(p => p.id !== id);
  if (lega._currentGameId === id) delete lega._currentGameId;
  saveLega(lega);
  _formRendered = false;
  renderStorico();
  aggiornaFabDebiti();
  toast('Partita eliminata');
}
