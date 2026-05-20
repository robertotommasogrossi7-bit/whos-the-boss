'use strict';

/* ══════════════════════════════════════════════════════
   DEBITI APERTI — FAB + SCHERMATA
══════════════════════════════════════════════════════ */
function contaDebitiAperti(lega) {
  if (!lega) return 0;
  let n = 0;
  (lega.partite || []).forEach(p => {
    migratePartita(p);
    (p.settlements || []).forEach(s => { if (!s.pagato && s.amount > 0) n++; });
  });
  return n;
}

function aggiornaFabDebiti() {
  const fab = document.getElementById('fab-debiti');
  const cnt = document.getElementById('fab-count');
  if (!fab || !cnt) return;
  const lega = currentLega();
  const n = contaDebitiAperti(lega);
  if (n > 0) {
    fab.style.display = 'flex';
    cnt.textContent = n;
  } else {
    fab.style.display = 'none';
  }
}

function apriDebiti() {
  if (!currentLega()) return;
  renderDebiti();
  goScreen('screen-debiti');
}

function chiudiDebiti() {
  goScreen('screen-app');
  refreshActiveAppTab();
  aggiornaFabDebiti();
}

function renderDebiti() {
  const lega = currentLega();
  const el = document.getElementById('debiti-content');
  if (!lega) return;

  // Raggruppa debiti aperti per debitore
  const byDebtor = {};
  (lega.partite || []).forEach(p => {
    migratePartita(p);
    (p.settlements || []).forEach((stl, idx) => {
      if (!stl.pagato && stl.amount > 0) {
        if (!byDebtor[stl.from]) byDebtor[stl.from] = [];
        byDebtor[stl.from].push({ partitaId: p.id, partitaData: p.data, idx, stl });
      }
    });
  });

  const debtorIds = Object.keys(byDebtor).map(Number);
  if (!debtorIds.length) {
    el.innerHTML = `
      <div class="empty">
        <div class="eico">✓</div>
        <p style="font-size:16px;font-weight:700;color:var(--green-dark)">Nessun debito aperto</p>
        <p style="margin-top:6px">Tutti i conti sono saldati! 🎉</p>
      </div>`;
    return;
  }

  // Ordina per totale debito desc
  debtorIds.sort((a, b) => {
    const tA = byDebtor[a].reduce((x, d) => x + d.stl.amount, 0);
    const tB = byDebtor[b].reduce((x, d) => x + d.stl.amount, 0);
    return tB - tA;
  });

  el.innerHTML = debtorIds.map(debtorId => {
    const debts = byDebtor[debtorId];
    const totale = debts.reduce((a, d) => a + d.stl.amount, 0);
    const items = debts.map(d => `
      <div class="debt-item">
        <div class="debt-info">
          <div class="debt-arrow">→ <strong>${esc(getNome(lega, d.stl.to))}</strong>
            <span class="debt-amount" style="margin-left:6px">€${euro(d.stl.amount)}</span>
          </div>
          <div class="debt-meta">Serata del ${fmtData(d.partitaData)}</div>
        </div>
        <button class="btn btn-green btn-sm" onclick="saldaDebito(${d.partitaId}, ${d.idx})">Salda</button>
      </div>
    `).join('');
    return `
      <div class="debt-card">
        <div class="debt-header">
          <span class="debt-name">${esc(getNome(lega, debtorId))}</span>
          <span class="debt-total">−€${euro(totale)}</span>
        </div>
        ${items}
        <div class="debt-salda-row">
          <button class="btn btn-outline btn-block btn-sm" onclick="saldaTuttiDi(${debtorId})">
            ✓ Salda tutti i debiti di ${esc(getNome(lega, debtorId))}
          </button>
        </div>
      </div>
    `;
  }).join('') + '<div style="height:18px"></div>';
}

function saldaDebito(partitaId, idx) {
  const lega = currentLega();
  if (!lega) return;
  const p = lega.partite.find(x => x.id === partitaId);
  if (!p || !p.settlements || !p.settlements[idx]) return;
  p.settlements[idx].pagato = true;
  saveLega(lega);
  renderDebiti();
  aggiornaFabDebiti();
  toast('✓ Debito saldato');
}

function saldaTuttiDi(debtorId) {
  const lega = currentLega();
  if (!lega) return;
  if (!confirm('Segnare come pagati tutti i debiti di ' + getNome(lega, debtorId) + '?')) return;
  let n = 0;
  (lega.partite || []).forEach(p => {
    (p.settlements || []).forEach(s => {
      if (!s.pagato && s.from === debtorId && s.amount > 0) { s.pagato = true; n++; }
    });
  });
  saveLega(lega);
  renderDebiti();
  aggiornaFabDebiti();
  toast(`✓ Saldati ${n} debit${n === 1 ? 'o' : 'i'}`);
}
