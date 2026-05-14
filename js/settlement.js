'use strict';

/* ══════════════════════════════════════════════════════
   CHIUSURA SERATA — SETTLEMENT
══════════════════════════════════════════════════════ */
function apriChiusura() {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const s = lega.sessioneAttiva;

  if (s.modalita === 'torneo') return apriChiusuraTorneo();

  const { arr } = computeLive(lega);
  const entrati = arr.filter(c => c.entrato);
  if (entrati.length < 2) { toast('Almeno 2 giocatori devono essere entrati'); return; }

  // losers = chi ha ancora soldi da versare (mancante > 0)
  // winners = chi ha guadagnato netto in fiches
  const losers  = entrati.filter(c => c.mancante > 0.005).sort((a, b) => b.mancante - a.mancante);
  const winners = entrati.filter(c => c.netto > 0.005).sort((a, b) => b.netto - a.netto);
  const neutri  = entrati.filter(c => c.mancante <= 0.005 && c.netto <= 0.005);

  // Auto-allocazione: soldi non versati → vincitori
  const winnersRem = {};
  winners.forEach(w => winnersRem[w.id_nome] = w.netto);
  const allocazioni = {};

  losers.forEach(l => {
    allocazioni[l.id_nome] = [];
    let rem = l.mancante;
    for (const w of winners) {
      if (rem <= 0) break;
      if (winnersRem[w.id_nome] <= 0) continue;
      const amt = Math.min(rem, winnersRem[w.id_nome]);
      allocazioni[l.id_nome].push({ to: w.id_nome, amount: Math.round(amt * 100) / 100 });
      rem -= amt;
      winnersRem[w.id_nome] -= amt;
    }
  });

  _settlement = {
    legaId:  lega.id,
    sessione: JSON.parse(JSON.stringify(lega.sessioneAttiva)),
    entrati, losers, winners, neutri,
    allocazioni
  };

  renderChiusura();
  goScreen('screen-chiusura');
}

function apriChiusuraTorneo() {
  const lega = currentLega();
  if (!lega || !lega.sessioneAttiva) return;
  const s = lega.sessioneAttiva;
  const entrati = s.giocatori.filter(g => g.entrato);
  if (entrati.length < 2) { toast('Almeno 2 giocatori devono essere entrati'); return; }

  // Forza consolidamento premi (usa monte TEORICO che include non pagati)
  if (!s.premi_consolidati) {
    const monte = calcolaMontepremi(s);
    s.premi = calcolaPremi(monte, entrati.length);
    s.premi_consolidati = true;
  }

  // Assegna posizioni ai giocatori ancora vivi
  const vivi = entrati.filter(g => !g.eliminato);
  if (vivi.length > 1) {
    if (!confirm(`Ci sono ancora ${vivi.length} giocatori in gioco.\n\nProcedendo, ${getNome(lega, vivi[0].id_nome)} verrà assegnato al 1° posto, gli altri a seguire. Vuoi continuare?\n(Puoi prima eliminare i giocatori per scegliere l'ordine corretto).`)) return;
    vivi.forEach((g, i) => { if (!g.posizione_finale) g.posizione_finale = i + 1; });
  } else if (vivi.length === 1) {
    if (!vivi[0].posizione_finale) vivi[0].posizione_finale = 1;
  }
  let nextPos = entrati.length;
  entrati.forEach(g => { if (!g.posizione_finale) g.posizione_finale = nextPos--; });

  // Modello TORNEO: ogni player ha
  //   contributo_dovuto / pagato / residuo  (buy-in + rebuys + add-on)
  //   premio_dovuto / residuo (premio per la sua posizione, 0 se già pagato)
  const arr = entrati.map(g => {
    const ricarTot     = (g.rebuys || []).reduce((a, r) => a + r.importo, 0);
    const ricarPaid    = (g.rebuys || []).reduce((a, r) => a + (r.pagata ? r.importo : 0), 0);
    const addOnAmt     = (g.add_on_fatto && s.add_on) ? s.add_on.prezzo : 0;
    const addOnPaid    = (g.add_on_fatto && g.add_on_pagato) ? s.add_on.prezzo : 0;

    const contributo_dovuto  = s.buy_in + ricarTot + addOnAmt;
    const contributo_pagato  = (g.buy_in_pagato ? s.buy_in : 0) + ricarPaid + addOnPaid;
    const contributo_residuo = Math.max(0, Math.round((contributo_dovuto - contributo_pagato) * 100) / 100);

    const premio_dovuto  = ((s.premi || []).find(p => p.posizione === g.posizione_finale) || { importo: 0 }).importo;
    const premio_residuo = (!g.prize_pagato && premio_dovuto > 0)
                              ? Math.round(premio_dovuto * 100) / 100
                              : 0;

    return {
      ...g,
      contributo_dovuto, contributo_pagato, contributo_residuo,
      premio_dovuto, premio_residuo,
      ricaricheTot: ricarTot,
      ricariche:    g.rebuys || [],
      extra_amt:    addOnAmt,
      extra_pagato: !!g.add_on_pagato,
      buy_in_pagato:!!g.buy_in_pagato,
      fiches:       premio_dovuto,
      ricevuti:     0,
      // legacy: netto = premio − contributo (info)
      netto:        Math.round((premio_dovuto - contributo_dovuto) * 100) / 100
    };
  });

  // Debiti (chi non ha pagato contributi) e Crediti (chi non ha ricevuto premio)
  const losers  = arr.filter(p => p.contributo_residuo > 0.005)
                     .sort((a, b) => b.contributo_residuo - a.contributo_residuo);
  const winners = arr.filter(p => p.premio_residuo > 0.005)
                     .sort((a, b) => b.premio_residuo - a.premio_residuo);
  const neutri  = arr.filter(p => p.contributo_residuo <= 0.005 && p.premio_residuo <= 0.005);

  // Auto-allocazione greedy: contributi non pagati → vincitori non pagati
  const winnersRem = {};
  winners.forEach(w => winnersRem[w.id_nome] = w.premio_residuo);
  const allocazioni = {};
  losers.forEach(l => {
    allocazioni[l.id_nome] = [];
    let rem = l.contributo_residuo;
    for (const w of winners) {
      if (rem <= 0) break;
      if (winnersRem[w.id_nome] <= 0) continue;
      const amt = Math.min(rem, winnersRem[w.id_nome]);
      allocazioni[l.id_nome].push({ to: w.id_nome, amount: Math.round(amt * 100) / 100 });
      rem -= amt;
      winnersRem[w.id_nome] -= amt;
    }
  });

  saveLega(lega);

  _settlement = {
    legaId:  lega.id,
    sessione: JSON.parse(JSON.stringify(s)),
    entrati: arr,
    losers, winners, neutri,
    allocazioni,
    isTorneo: true
  };

  renderChiusura();
  goScreen('screen-chiusura');
}

function renderChiusuraTorneo() {
  const lega = currentLega();
  const s = _settlement;
  if (!lega || !s) return;
  const sa = s.sessione;

  // Sommario montepremi / pagato / da regolare
  const totaleMonte = calcolaMontepremi(sa);
  const incassato   = calcolaMontepremiIncassato(sa);
  const giaPagato   = calcolaPremiPagati(sa);
  const daRegolare  = Math.round((totaleMonte - giaPagato) * 100) / 100;

  const sommario = `
    <div class="settle-totalbar">
      <div class="stt-item">
        <div class="stt-lbl">Montepremi</div>
        <div class="stt-val">€${euro(totaleMonte)}</div>
      </div>
      <div class="stt-item">
        <div class="stt-lbl">Pagato</div>
        <div class="stt-val pos">€${euro(giaPagato)}</div>
      </div>
      <div class="stt-item">
        <div class="stt-lbl">Da regolare</div>
        <div class="stt-val ${daRegolare > 0.005 ? 'neg' : 'pos'}">${daRegolare > 0.005 ? '€'+euro(daRegolare) : '✓'}</div>
      </div>
    </div>
  `;

  // Premi già pagati durante il torneo (info)
  const giaPagatiCards = sa.giocatori
    .filter(g => g.entrato && g.prize_pagato && g.posizione_finale && sa.premi && sa.premi[g.posizione_finale - 1] && sa.premi[g.posizione_finale - 1].importo > 0)
    .sort((a, b) => a.posizione_finale - b.posizione_finale)
    .map(g => `
      <div class="settle-card winner-card" style="opacity:.8">
        <div class="settle-head">
          <span class="settle-name">${esc(getNome(lega, g.id_nome))} · ${g.posizione_finale}°</span>
          <span class="settle-amount pos">€${euro(sa.premi[g.posizione_finale-1].importo)} ✓</span>
        </div>
        <div class="torneo-paid-info">✓ Premio già consegnato durante il torneo</div>
      </div>
    `).join('');

  // Premi ancora da pagare (vincitori senza prize_pagato)
  const winnersCards = s.winners.map(w => {
    let allocato = 0;
    Object.values(s.allocazioni).forEach(allocs =>
      allocs.forEach(a => { if (a.to === w.id_nome) allocato += a.amount; })
    );
    const restante = Math.round((w.premio_residuo - allocato) * 100) / 100;
    return `
      <div class="settle-card winner-card">
        <div class="settle-head">
          <span class="settle-name">${esc(getNome(lega, w.id_nome))} · ${w.posizione_finale}°</span>
          <span class="settle-amount pos">+€${euro(w.premio_residuo)}</span>
        </div>
        <div style="font-size:12px;color:var(--muted)">
          Coperti €${euro(allocato)} su €${euro(w.premio_residuo)}
          ${Math.abs(restante) > 0.005
            ? `· <span style="color:var(--red);font-weight:700">mancano €${euro(restante)}</span>`
            : ' <span style="color:var(--green);font-weight:700">✓</span>'}
        </div>
      </div>
    `;
  }).join('');

  // Contributi non pagati (perdenti) con allocazione manuale
  const losersCards = s.losers.map(l => {
    const allocs = s.allocazioni[l.id_nome] || [];
    const debito = l.contributo_residuo;
    const allocTot = allocs.reduce((a, x) => a + x.amount, 0);
    const rem = Math.round((debito - allocTot) * 100) / 100;

    const dettagli = [];
    if (!l.buy_in_pagato) dettagli.push(`Buy-in €${euro(sa.buy_in)}`);
    (l.ricariche || []).forEach((r, i) => {
      if (!r.pagata) dettagli.push(`Rebuy ${i+1} €${euro(r.importo)}`);
    });
    if (l.add_on_fatto && !l.extra_pagato) dettagli.push(`Add-on €${euro(sa.add_on.prezzo)}`);

    const remCls = Math.abs(rem) < 0.005 ? 'ok' : 'bad';
    const remTxt = Math.abs(rem) < 0.005
      ? '✓ Tutto allocato'
      : rem > 0 ? `Mancano €${euro(rem)} da assegnare` : `Allocato €${euro(-rem)} in più`;

    let allocRows;
    if (!s.winners.length) {
      allocRows = `<p class="help-note" style="font-style:normal;color:var(--muted)">Tutti i premi sono già stati pagati. Il debito va al banco/organizzatore.</p>`;
    } else {
      allocRows = s.winners.map(w => {
        const existing = allocs.find(a => a.to === w.id_nome);
        const val = existing ? existing.amount : '';
        return `
          <div class="settle-alloc-row">
            <span class="alloc-name">→ ${esc(getNome(lega, w.id_nome))} (${w.posizione_finale}°)</span>
            <input type="number" value="${val}" placeholder="0" step="0.50" min="0" inputmode="decimal"
                   onchange="setAllocazione(${l.id_nome}, ${w.id_nome}, this.value)">
            <span class="alloc-eur">€</span>
          </div>
        `;
      }).join('');
      allocRows = `<div class="settle-allocations">${allocRows}</div>`;
    }

    return `
      <div class="settle-card">
        <div class="settle-head">
          <span class="settle-name">${esc(getNome(lega, l.id_nome))}${l.posizione_finale ? ' · '+l.posizione_finale+'°' : ''}</span>
          <span class="settle-amount neg">−€${euro(debito)}</span>
        </div>
        <div class="torneo-debito-detail">⚠ Non versato: ${dettagli.join(' · ')}</div>
        <div style="font-size:12px;color:var(--muted);margin:6px 0 4px;font-weight:700">A chi paga il debito:</div>
        ${allocRows}
        ${s.winners.length ? `<div class="settle-remaining ${remCls}">${remTxt}</div>` : ''}
      </div>
    `;
  }).join('');

  const allClean = !s.winners.length && !s.losers.length;

  document.getElementById('chiusura-content').innerHTML = `
    ${sommario}
    ${giaPagatiCards ? `<h3 class="settle-section-title">Premi già pagati durante il torneo</h3>${giaPagatiCards}` : ''}
    ${s.winners.length ? `<h3 class="settle-section-title">Premi ancora da pagare</h3>${winnersCards}` : ''}
    ${s.losers.length ? `<h3 class="settle-section-title">Chi deve ancora versare — assegna a chi pagare</h3>${losersCards}` : ''}
    ${allClean ? '<div class="empty"><div class="eico">✓</div><p>Tutti i conti sono saldati!</p></div>' : ''}

    <button class="btn btn-green btn-block" style="margin-top:16px" onclick="confermaChiusura()">✓ Conferma e salva</button>
    <button class="btn btn-gray btn-block"  style="margin-top:8px"  onclick="chiudiAnnulla()">← Torna al torneo</button>
    <div style="height:20px"></div>
  `;
}

function renderChiusura() {
  const lega = currentLega();
  const s = _settlement;
  if (!lega || !s) return;
  if (s.isTorneo) return renderChiusuraTorneo();
  const sa = s.sessione;

  // Sommario in alto
  const totVinc = s.winners.reduce((a, w) => a + w.netto, 0);
  const totPerd = s.losers.reduce((a, l) => a + (-l.netto), 0);
  const sommario = `
    <div class="settle-totalbar">
      <div class="stt-item">
        <div class="stt-lbl">Vincitori</div>
        <div class="stt-val pos">+€${euro(totVinc)}</div>
      </div>
      <div class="stt-item">
        <div class="stt-lbl">Perdenti</div>
        <div class="stt-val neg">−€${euro(totPerd)}</div>
      </div>
      <div class="stt-item">
        <div class="stt-lbl">Quadra?</div>
        <div class="stt-val ${Math.abs(totVinc - totPerd) < 0.01 ? 'pos' : 'neg'}">
          ${Math.abs(totVinc - totPerd) < 0.01 ? '✓' : '⚠'}
        </div>
      </div>
    </div>
  `;

  const winnersCards = s.winners.map(w => {
    // Calcola quanto sta ricevendo finora dalle allocazioni
    let ricevuto = 0;
    Object.values(s.allocazioni).forEach(al => al.forEach(a => { if (a.to === w.id_nome) ricevuto += a.amount; }));
    const restante = w.netto - ricevuto;
    return `
      <div class="settle-card winner-card">
        <div class="settle-head">
          <span class="settle-name">${esc(getNome(lega, w.id_nome))}</span>
          <span class="settle-amount pos">+€${euro(w.netto)}</span>
        </div>
        <div style="font-size:12px;color:var(--muted)">
          Assegnati €${euro(ricevuto)} su €${euro(w.netto)}
          ${Math.abs(restante) > 0.005 ? `· <span style="color:var(--red);font-weight:700">mancano €${euro(restante)}</span>` : '<span style="color:var(--green);font-weight:700"> ✓ ok</span>'}
        </div>
      </div>
    `;
  }).join('');

  const losersCards = s.losers.map(l => {
    const allocs = s.allocazioni[l.id_nome] || [];
    const debito = l.mancante;
    const allocTot = allocs.reduce((a, x) => a + x.amount, 0);
    const rem = debito - allocTot;
    const remCls = Math.abs(rem) < 0.005 ? 'ok' : 'bad';
    const remTxt = Math.abs(rem) < 0.005
      ? '✓ Allocato tutto'
      : rem > 0 ? `Mancano €${euro(rem)} da allocare` : `Hai allocato €${euro(-rem)} in più`;

    const dettaglio = [];
    if (!l.buy_in_pagato) dettaglio.push(`Buy-in €${euro(sa.buy_in)}`);
    (l.ricariche || []).forEach((r, i) => { if (!r.pagata) dettaglio.push(`Ricarica ${i+1} €${euro(r.importo)}`); });
    if (l.extra_amt > 0 && !l.extra_pagato) dettaglio.push(`Extra €${euro(l.extra_amt)}`);

    const allocRows = s.winners.map(w => {
      const existing = allocs.find(a => a.to === w.id_nome);
      const val = existing ? existing.amount : '';
      return `
        <div class="settle-alloc-row">
          <span class="alloc-name">→ ${esc(getNome(lega, w.id_nome))}</span>
          <input type="number" value="${val}" placeholder="0" step="0.50" min="0" inputmode="decimal"
                 onchange="setAllocazione(${l.id_nome}, ${w.id_nome}, this.value)">
          <span class="alloc-eur">€</span>
        </div>
      `;
    }).join('');

    return `
      <div class="settle-card">
        <div class="settle-head">
          <span class="settle-name">${esc(getNome(lega, l.id_nome))}</span>
          <span class="settle-amount neg">−€${euro(debito)}</span>
        </div>
        <div class="torneo-debito-detail">⚠ Non versato: ${dettaglio.join(' · ')}</div>
        ${s.winners.length ? `<div style="font-size:12px;color:var(--muted);margin:6px 0 4px;font-weight:700">A chi paga:</div>
        <div class="settle-allocations">${allocRows}</div>
        <div class="settle-remaining ${remCls}">${remTxt}</div>` : '<p style="font-size:12px;color:var(--muted);margin-top:6px">Nessun vincitore — versa al banco.</p>'}
      </div>
    `;
  }).join('');

  const neutriCards = s.neutri.length ? `
    <h3 class="settle-section-title">Pari (netto 0)</h3>
    ${s.neutri.map(n => `
      <div class="settle-card" style="border-left-color: var(--muted)">
        <div class="settle-head">
          <span class="settle-name">${esc(getNome(lega, n.id_nome))}</span>
          <span class="settle-amount neu">€0,00</span>
        </div>
      </div>
    `).join('')}
  ` : '';

  document.getElementById('chiusura-content').innerHTML = `
    ${sommario}
    ${s.winners.length ? `<h3 class="settle-section-title">Vincitori — ricevono</h3>${winnersCards}` : ''}
    ${s.losers.length  ? `<h3 class="settle-section-title">Perdenti — assegna i pagamenti</h3>${losersCards}` : ''}
    ${neutriCards}

    <button class="btn btn-green btn-block" style="margin-top:16px" onclick="confermaChiusura()">✓ Conferma e salva</button>
    <button class="btn btn-gray btn-block"  style="margin-top:8px"  onclick="chiudiAnnulla()">← Torna alla serata</button>
    <div style="height:20px"></div>
  `;
}

function setAllocazione(loserId, winnerId, val) {
  if (!_settlement) return;
  const v = parseFloat(String(val).replace(',', '.')) || 0;
  const allocs = _settlement.allocazioni[loserId] || [];
  const i = allocs.findIndex(a => a.to === winnerId);
  if (v <= 0) {
    if (i >= 0) allocs.splice(i, 1);
  } else {
    if (i >= 0) allocs[i].amount = Math.round(v * 100) / 100;
    else        allocs.push({ to: winnerId, amount: Math.round(v * 100) / 100 });
  }
  _settlement.allocazioni[loserId] = allocs;
  renderChiusura();
}

function chiudiAnnulla() {
  _settlement = null;
  goScreen('screen-app');
}

function confermaChiusura() {
  const lega = currentLega();
  const s = _settlement;
  if (!lega || !s) return;

  // Validazione bilanci
  let warning = '';
  s.losers.forEach(l => {
    const allocs = s.allocazioni[l.id_nome] || [];
    const tot = allocs.reduce((a, x) => a + x.amount, 0);
    const debito = s.isTorneo ? l.contributo_residuo : l.mancante;
    if (Math.abs(debito - tot) > 0.01) {
      warning += `• ${getNome(lega, l.id_nome)}: allocati €${euro(tot)} su €${euro(debito)}\n`;
    }
  });
  if (warning && !confirm('Allocazioni non bilanciate:\n\n' + warning + '\nSalvare comunque?')) return;

  // Eventuale ora fine
  const sa = s.sessione;
  const oraFine = prompt('Ora di fine (HH:MM, opzionale)', sa.ora_fine || '');
  if (oraFine !== null) sa.ora_fine = oraFine.trim();

  // Costruisci la partita salvata
  const giocatori = s.entrati.map(c => {
    const isDebtor = s.isTorneo ? (c.contributo_residuo > 0.005) : (c.mancante > 0.005);
    const pagamenti_effettuati = isDebtor ? (s.allocazioni[c.id_nome] || []).map(a => ({ to: a.to, amount: a.amount })) : [];
    const pagamenti_ricevuti = c.netto > 0.005
      ? s.losers.flatMap(l => (s.allocazioni[l.id_nome] || [])
          .filter(a => a.to === c.id_nome)
          .map(a => ({ from: l.id_nome, amount: a.amount })))
      : [];
    return {
      id_nome:          c.id_nome,
      entrate:          sa.buy_in,
      ricarica_fatta:   c.ricaricheTot || 0,
      extra:            c.extra_amt || 0,
      soldi_ricevuti:   c.ricevuti    || 0,
      fiches_finali:    c.fiches      || 0,
      netto_finale:     c.netto,
      soldi_dati:       c.netto, // legacy
      vincitore:        false,
      buy_in_pagato:    !!c.buy_in_pagato,
      extra_pagato:     !!c.extra_pagato,
      ricariche:        (c.ricariche || []).map(r => ({ importo: r.importo, pagata: !!r.pagata })),
      pagamenti_effettuati,
      pagamenti_ricevuti,
      // Torneo-specific (null/false per partite cash)
      posizione_finale: c.posizione_finale || null,
      add_on_fatto:     !!c.add_on_fatto,
      add_on_pagato:    !!c.add_on_pagato,
      premio:           c.premio || 0
    };
  });
  if (giocatori.length) {
    const hasPosizioni = giocatori.some(g => g.posizione_finale);
    if (hasPosizioni) {
      giocatori.forEach(g => { if (g.posizione_finale === 1) g.vincitore = true; });
    } else {
      const maxN = Math.max(...giocatori.map(g => g.netto_finale));
      giocatori.forEach(g => { if (g.netto_finale === maxN && maxN > 0) g.vincitore = true; });
    }
  }

  // Settlements consolidati a livello partita (per toggle pagato successivi)
  const settlements = [];
  s.losers.forEach(l => {
    (s.allocazioni[l.id_nome] || []).forEach(a => {
      if (a.amount > 0) settlements.push({
        from:   l.id_nome,
        to:     a.to,
        amount: Math.round(a.amount * 100) / 100,
        pagato: false
      });
    });
  });

  const partita = {
    id:         lega._pid++,
    data:       sa.data,
    ora_inizio: sa.ora_inizio,
    ora_fine:   sa.ora_fine,
    modalita:   sa.modalita,
    buy_in:     sa.buy_in,
    giocatori,
    settlements
  };
  lega.partite.push(partita);
  delete lega.sessioneAttiva;
  if (lega.serate_bg && lega.serate_bg.length) {
    lega.sessioneAttiva = lega.serate_bg.shift();
  }
  saveLega(lega);
  _settlement = null;
  _formRendered = false;
  _serataView = 'hub';
  goScreen('screen-app');
  renderPartitaForm();
  aggiornaFabDebiti();
  toast('✓ Serata salvata!');
}
