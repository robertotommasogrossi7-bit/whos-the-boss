'use strict';

/* ══════════════════════════════════════════════════════
   TAB 4 – CLASSIFICA
══════════════════════════════════════════════════════ */
function renderClassifica() {
  const lega = currentLega();
  if (!lega) return;
  const el = document.getElementById('classifica-container');

  const filterBar = `
    <div class="date-filter-bar">
      <label>Da</label>
      <input type="date" value="${_classificaFrom}" onchange="_classificaFrom=this.value;renderClassifica()">
      <label>A</label>
      <input type="date" value="${_classificaTo}" onchange="_classificaTo=this.value;renderClassifica()">
      ${(_classificaFrom||_classificaTo) ? `<button class="btn-reset" onclick="_classificaFrom='';_classificaTo='';renderClassifica()">✕ Reset</button>` : ''}
    </div>`;

  if (!lega.partite.length) {
    el.innerHTML = filterBar + '<div class="empty"><div class="eico">🏆</div><p>Nessuna partita giocata</p></div>';
    return;
  }

  const stats = {};
  lega.nomi.forEach(n => stats[n.id] = {
    id: n.id, nome: n.nome,
    netto: 0, partite: 0, vittorie: 0,
    daDare: 0, daRicevere: 0
  });

  let partiteFiltrate = lega.partite;
  if (_classificaFrom) partiteFiltrate = partiteFiltrate.filter(p => p.data >= _classificaFrom);
  if (_classificaTo)   partiteFiltrate = partiteFiltrate.filter(p => p.data <= _classificaTo);

  partiteFiltrate.forEach(p => {
    migratePartita(p);
    p.giocatori.forEach(g => {
      const s = stats[g.id_nome];
      if (!s) return;
      s.netto    += g.netto_finale || 0;
      s.partite  += 1;
      if (g.vincitore) s.vittorie += 1;
    });
    (p.settlements || []).forEach(stl => {
      if (stl.pagato || stl.amount <= 0) return;
      if (stats[stl.from]) stats[stl.from].daDare    += stl.amount;
      if (stats[stl.to])   stats[stl.to].daRicevere  += stl.amount;
    });
  });

  const lista = Object.values(stats)
    .filter(s => s.partite > 0)
    .sort((a, b) => b.netto - a.netto);

  if (!lista.length) {
    el.innerHTML = filterBar + '<div class="empty"><div class="eico">🏆</div><p>Nessun dato disponibile</p></div>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const rows = lista.map((s, i) => {
    const netUnpaid = s.daRicevere - s.daDare;
    let pendCell;
    if (Math.abs(netUnpaid) < 0.005) {
      pendCell = '<span class="neu">—</span>';
    } else if (netUnpaid > 0) {
      // Deve ancora ricevere
      pendCell = `<span class="pay-pill credit" style="cursor:default">€${euro(netUnpaid)}</span>`;
    } else {
      // Deve ancora dare
      pendCell = `<span class="pay-pill debt" style="cursor:default">€${euro(-netUnpaid)}</span>`;
    }
    return `
      <tr>
        <td><span class="rank-medal">${medals[i] || (i + 1)}</span></td>
        <td><strong>${esc(s.nome)}</strong></td>
        <td class="${s.netto > 0 ? 'pos' : s.netto < 0 ? 'neg' : 'neu'}">${euroSigned(s.netto)}</td>
        <td>${s.partite}</td>
        <td>${s.vittorie}</td>
        <td>${pendCell}</td>
      </tr>
    `;
  }).join('');

  el.innerHTML = filterBar + `
    <div class="card" style="padding:0;overflow:hidden">
      <div class="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Nome</th><th>Netto</th>
              <th>Part.</th><th>Vitt.</th><th>Pendenti</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    <p style="font-size:11px;color:var(--muted);margin:10px 4px 0;line-height:1.5">
      <b style="color:#6a4d00">Pendenti</b> = netto dei soldi non ancora scambiati.
      <span style="background:#fff3b0;padding:1px 6px;border-radius:8px;color:#6a4d00;font-weight:700">Giallo</span> = deve ricevere ·
      <span style="background:#fde4e1;padding:1px 6px;border-radius:8px;color:var(--red);font-weight:700">Rosso</span> = deve dare.
    </p>
  `;
}
