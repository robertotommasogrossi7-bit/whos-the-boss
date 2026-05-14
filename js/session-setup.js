'use strict';

/* ══════════════════════════════════════════════════════
   SETUP SERATA — form
══════════════════════════════════════════════════════ */
function renderSetupHtml(lega) {
  if (!lega.nomi.length) {
    return `
      <div class="card">
        <div class="empty">
          <div class="eico">⚠️</div>
          <p>Aggiungi prima i partecipanti dalla tab Partecipanti</p>
        </div>
      </div>`;
  }
  const pills = lega.nomi.map(n => `
    <button type="button" class="part-pill" data-id="${n.id}" onclick="toggleSetupPart(${n.id})">${esc(n.nome)}</button>
  `).join('');
  return `
    <div class="card">
      <div class="card-title">Quando</div>
      <div class="form-row">
        <label>Data</label>
        <input type="date" id="su-data" value="${oggi()}">
      </div>
      <div class="fields-2col-time">
        <div class="form-row">
          <label>Ora inizio</label>
          <input type="time" id="su-ora-in" value="21:00">
        </div>
        <div class="form-row">
          <label>Ora fine (stima)</label>
          <input type="time" id="su-ora-fi">
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Modalità</div>
      <div class="modalita-toggle" id="su-mod-tog">
        <button type="button" data-v="cash"   class="${_setupModalita==='cash'?'active':''}" onclick="setSetupModalita('cash')">💰 Cash Game</button>
        <button type="button" data-v="torneo" class="${_setupModalita==='torneo'?'active':''}" onclick="setSetupModalita('torneo')">🏆 Torneo</button>
      </div>
      <div id="modalita-config">${renderModalitaConfig()}</div>
    </div>

    <div class="card">
      <div class="card-title">Partecipanti alla serata</div>
      <div class="part-pill-grid">${pills}</div>
      <p class="help-note">Tocca per selezionare chi è presente stasera (potrai aggiungere altri durante la serata e segnare l'ingresso effettivo dopo).</p>
    </div>

    <button class="btn btn-green btn-block" onclick="avviaSessione()" style="margin-top:6px">
      ▶ Inizia serata
    </button>
    <div style="height:16px"></div>
  `;
}

function setSetupModalita(v) {
  _setupModalita = v;
  document.querySelectorAll('#su-mod-tog button').forEach(b => {
    b.classList.toggle('active', b.dataset.v === v);
  });
  const el = document.getElementById('modalita-config');
  if (el) el.innerHTML = renderModalitaConfig();
}

function toggleSetupPart(id) {
  if (_setupPartIds.has(id)) _setupPartIds.delete(id);
  else _setupPartIds.add(id);
  const el = document.querySelector(`.part-pill[data-id="${id}"]`);
  if (el) el.classList.toggle('selected', _setupPartIds.has(id));
}

function renderModalitaConfig() {
  if (_setupModalita === 'torneo') return renderTorneoConfig();
  return renderCashConfig();
}

function renderCashConfig() {
  return `
    <div class="form-row" style="margin-top:14px;margin-bottom:0">
      <label>Buy-in (€)</label>
      <input type="number" id="su-buyin" value="25" step="0.50" min="0" inputmode="decimal">
      <p class="help-note">Considerato come "soldi versati" all'ingresso di ogni giocatore in partita.</p>
    </div>
  `;
}

/* ════ TORNEO — SUGGERIMENTI STRUTTURA ════
   Riferimenti: strutture standard usate in tornei live home/casino:
   - Starting stack ≈ 100 BB iniziali (per durate medio-lunghe)
   - Durata livello: 10-25 min in base alla durata totale
   - Progressione blind: rapporto 1.5x circa, antes da livello 6-7
   - Pausa ogni 4 livelli
   - Late reg: ~30% del torneo totale
   - Add-on: stesse fiche iniziali, prezzo = buy-in/2
*/
function suggerisciTorneo(num_giocatori, durata_ore) {
  num_giocatori = Math.max(2, Math.min(200, Math.round(num_giocatori || 9)));
  durata_ore    = Math.max(1, Math.min(12, +durata_ore || 3));

  // Starting stack
  let fiche_iniziali;
  if (durata_ore < 2)        fiche_iniziali = 5000;
  else if (durata_ore < 3)   fiche_iniziali = 7500;
  else if (durata_ore < 4)   fiche_iniziali = 10000;
  else if (durata_ore < 5)   fiche_iniziali = 15000;
  else                       fiche_iniziali = 20000;

  // Durata livello
  let durata_livello;
  if (durata_ore < 2)        durata_livello = 10;
  else if (durata_ore < 3)   durata_livello = 12;
  else if (durata_ore < 4)   durata_livello = 15;
  else if (durata_ore < 5)   durata_livello = 18;
  else                       durata_livello = 20;

  // BB iniziale ≈ 1% dello starting stack
  const baseBB = roundChipVal(fiche_iniziali / 100);

  // Progressione classica: [bb_mult, ante_mult] relativi a baseBB
  const mults = [
    [1, 0], [1.5, 0], [2, 0], [3, 0], [4, 0],
    [6, 0.75], [8, 1], [10, 1.25], [12, 2], [16, 2.5],
    [20, 3], [30, 4], [40, 5], [60, 8],
    [80, 10], [100, 15], [150, 20], [200, 25]
  ];

  // Calcola quanti livelli servono (tenendo conto pause 10 min ogni 4)
  // tot = N*livello + (N/4)*10  →  N = (tot) / (livello + 2.5)
  const numLivelliNeeded = Math.ceil((durata_ore * 60) / (durata_livello + 2.5));
  const numLivelli = Math.min(mults.length, Math.max(6, numLivelliNeeded));

  const livelli = [];
  for (let i = 0; i < numLivelli; i++) {
    const bb   = roundChipVal(baseBB * mults[i][0]);
    const sb   = roundChipVal(bb / 2);
    const ante = mults[i][1] > 0 ? roundChipVal(baseBB * mults[i][1]) : 0;
    livelli.push({ tipo: 'gioco', sb, bb, ante, durata: durata_livello });
    if ((i + 1) % 4 === 0 && i < numLivelli - 1) {
      livelli.push({ tipo: 'pausa', durata: 10 });
    }
  }

  // Late reg: ~30-35% del totale, fra livello 4 e 6
  const lateRegLevel = Math.min(6, Math.max(3, Math.ceil(numLivelli * 0.3)));

  // Add-on: stesse fiche iniziali, prezzo = buy-in/2 (calcolato dopo)
  return {
    fiche_iniziali,
    num_giocatori,
    durata_ore,
    livelli,
    late_reg: { fino_a_livello: lateRegLevel },
    add_on: { abilitato: true, fiche: fiche_iniziali, prezzo: 0 /* riempito da buy-in */ }
  };
}

function roundChipVal(v) {
  v = Math.max(0, Math.round(v));
  if (v < 25)   return v === 0 ? 0 : 25;
  if (v < 100)  return Math.round(v/25)*25;
  if (v < 500)  return Math.round(v/25)*25;
  if (v < 2000) return Math.round(v/50)*50;
  if (v < 10000)return Math.round(v/100)*100;
  return Math.round(v/500)*500;
}

function renderTorneoConfig() {
  if (!_setupTorneo) _setupTorneo = suggerisciTorneo(18, 3);
  const t = _setupTorneo;

  // Durata totale stimata
  let totalMin = 0;
  t.livelli.forEach(l => totalMin += l.durata);

  // Durata late reg in minuti (somma fino a fino_a_livello compreso)
  let lateRegMin = 0, gc = 0;
  for (const l of t.livelli) {
    lateRegMin += l.durata;
    if (l.tipo === 'gioco') {
      gc++;
      if (gc >= t.late_reg.fino_a_livello) break;
    }
  }

  const numTavoli = Math.ceil(t.num_giocatori / 9);
  const buyIn = numVal('su-buyin') || 25;
  const totGameLevels = t.livelli.filter(l => l.tipo === 'gioco').length;

  // Costruisci righe livelli
  let gameLvlIdx = 0;
  const blindsRows = t.livelli.map((l, i) => {
    if (l.tipo === 'pausa') {
      return `
        <div class="blinds-row pausa">
          <div class="lvl-num">⏸</div>
          <div style="grid-column:2 / span 3;font-weight:700">PAUSA</div>
          <div><input type="number" value="${l.durata}" min="1" onchange="setLivelloDurata(${i}, this.value)"></div>
          <div><button class="lvl-del" onclick="rimuoviLivello(${i})">✕</button></div>
        </div>
      `;
    }
    gameLvlIdx++;
    const isLate = gameLvlIdx <= t.late_reg.fino_a_livello;
    return `
      <div class="blinds-row ${isLate ? 'late' : ''}">
        <div class="lvl-num">L${gameLvlIdx}</div>
        <div><input type="number" value="${l.sb}" min="0" onchange="setLivelloSB(${i}, this.value)"></div>
        <div><input type="number" value="${l.bb}" min="0" onchange="setLivelloBB(${i}, this.value)"></div>
        <div><input type="number" value="${l.ante}" min="0" onchange="setLivelloAnte(${i}, this.value)"></div>
        <div><button class="lvl-del" onclick="rimuoviLivello(${i})">✕</button></div>
      </div>
    `;
  }).join('');

  return `
    <div class="torneo-setup-grid" style="margin-top:14px">
      <div class="form-row" style="margin-bottom:0">
        <label>Buy-in (€)</label>
        <input type="number" id="su-buyin" value="${buyIn}" step="0.50" min="0" inputmode="decimal" onchange="onBuyInChange()">
      </div>
      <div class="form-row" style="margin-bottom:0">
        <label>Giocatori previsti</label>
        <input type="number" id="su-num-gioc" value="${t.num_giocatori}" min="2" max="200" inputmode="numeric" onchange="setTorneoNumGiocatori(this.value)">
      </div>
    </div>
    <div class="torneo-setup-grid" style="margin-top:6px">
      <div class="form-row" style="margin-bottom:0">
        <label>Durata stimata (ore)</label>
        <input type="number" id="su-durata" value="${t.durata_ore}" step="0.5" min="1" max="12" inputmode="decimal" onchange="setTorneoDurata(this.value)">
      </div>
      <div class="form-row" style="margin-bottom:0">
        <label>Fiche iniziali</label>
        <input type="number" id="su-fiche" value="${t.fiche_iniziali}" step="500" min="500" inputmode="numeric" onchange="setTorneoFiche(this.value)">
      </div>
    </div>

    <div style="margin-top:8px">
      <span class="torneo-info-pill">🪑 ${numTavoli} ${numTavoli===1?'tavolo':'tavoli'} (max ${numTavoli*9})</span>
      <span class="torneo-info-pill">⏱ ~${Math.floor(totalMin/60)}h${(totalMin%60)?' '+(totalMin%60)+'m':''}</span>
      <span class="torneo-info-pill">📝 Late reg ${lateRegMin}min</span>
    </div>

    <button class="btn btn-outline btn-block" style="margin-top:10px" onclick="rigeneraStrutturaTorneo()">
      ⚙ Suggerisci struttura automatica
    </button>

    <div class="sec-title">Struttura livelli</div>
    <p class="help-note" style="margin:0 0 6px">Bordo giallo = registrazione tardiva ancora aperta.</p>
    <div class="blinds-list-card">
      <div class="blinds-row head">
        <div>#</div><div>SB</div><div>BB</div><div>Ante</div><div>Min</div><div></div>
      </div>
      ${blindsRows}
    </div>
    <div style="display:flex;gap:6px;margin-top:6px">
      <button class="btn btn-outline btn-sm" style="flex:1" onclick="aggiungiLivelloGioco()">+ Livello</button>
      <button class="btn btn-outline btn-sm" style="flex:1" onclick="aggiungiLivelloPausa()">+ Pausa</button>
    </div>

    <div class="sec-title">Iscrizione tardiva</div>
    <div class="form-row" style="margin-bottom:0">
      <label>Chiude dopo il livello</label>
      <input type="number" id="su-late-lvl" value="${t.late_reg.fino_a_livello}" min="1" max="${totGameLevels}" inputmode="numeric" onchange="setLateRegLivello(this.value)">
      <p class="help-note">Dopo questo livello la registrazione chiude e il montepremi si consolida.</p>
    </div>

    <div class="sec-title">Add-on</div>
    <div class="status-line">
      <span class="sl-label">Add-on disponibile?</span>
      <button class="pay-toggle ${t.add_on.abilitato ? 'paid' : 'unpaid'}" onclick="toggleAddOn()">
        ${t.add_on.abilitato ? '✓ Sì' : '✕ No'}
      </button>
    </div>
    ${t.add_on.abilitato ? `
      <div class="torneo-setup-grid" style="margin-top:6px">
        <div class="form-row" style="margin-bottom:0">
          <label>Fiche add-on</label>
          <input type="number" value="${t.add_on.fiche}" step="500" min="500" inputmode="numeric" onchange="setAddOnFiche(this.value)">
        </div>
        <div class="form-row" style="margin-bottom:0">
          <label>Prezzo (€)</label>
          <input type="number" value="${t.add_on.prezzo || ''}" step="0.50" min="0" placeholder="${euro(buyIn/2)}" inputmode="decimal" onchange="setAddOnPrezzo(this.value)">
        </div>
      </div>
      <p class="help-note">Disponibile subito dopo la chiusura della late reg.</p>
    ` : ''}
  `;
}

function refreshTorneoConfig() {
  const el = document.getElementById('modalita-config');
  if (el) el.innerHTML = renderModalitaConfig();
}

function onBuyInChange() {
  // Aggiorna prezzo add-on default se torneo
  if (_setupModalita === 'torneo' && _setupTorneo && _setupTorneo.add_on) {
    if (!_setupTorneo.add_on.prezzo) refreshTorneoConfig();
  }
}

function setTorneoNumGiocatori(v) {
  if (!_setupTorneo) return;
  _setupTorneo.num_giocatori = Math.max(2, Math.min(200, parseInt(v) || 2));
  refreshTorneoConfig();
}
function setTorneoDurata(v) {
  if (!_setupTorneo) return;
  _setupTorneo.durata_ore = Math.max(1, Math.min(12, parseFloat(v) || 3));
  refreshTorneoConfig();
}
function setTorneoFiche(v) {
  if (!_setupTorneo) return;
  _setupTorneo.fiche_iniziali = Math.max(500, parseInt(v) || 10000);
  refreshTorneoConfig();
}
function rigeneraStrutturaTorneo() {
  if (!_setupTorneo) return;
  if (!confirm('Rigenerare la struttura automatica? Le modifiche manuali ai livelli andranno perse.')) return;
  const { num_giocatori, durata_ore } = _setupTorneo;
  _setupTorneo = suggerisciTorneo(num_giocatori, durata_ore);
  refreshTorneoConfig();
  toast('✓ Struttura rigenerata');
}
function setLivelloSB(i, v) {
  if (!_setupTorneo || !_setupTorneo.livelli[i]) return;
  _setupTorneo.livelli[i].sb = Math.max(0, parseInt(v) || 0);
}
function setLivelloBB(i, v) {
  if (!_setupTorneo || !_setupTorneo.livelli[i]) return;
  _setupTorneo.livelli[i].bb = Math.max(0, parseInt(v) || 0);
}
function setLivelloAnte(i, v) {
  if (!_setupTorneo || !_setupTorneo.livelli[i]) return;
  _setupTorneo.livelli[i].ante = Math.max(0, parseInt(v) || 0);
}
function setLivelloDurata(i, v) {
  if (!_setupTorneo || !_setupTorneo.livelli[i]) return;
  _setupTorneo.livelli[i].durata = Math.max(1, parseInt(v) || 15);
  refreshTorneoConfig();
}
function rimuoviLivello(i) {
  if (!_setupTorneo) return;
  _setupTorneo.livelli.splice(i, 1);
  refreshTorneoConfig();
}
function aggiungiLivelloGioco() {
  if (!_setupTorneo) return;
  const last = [..._setupTorneo.livelli].reverse().find(l => l.tipo === 'gioco') || { sb: 25, bb: 50, ante: 0, durata: 15 };
  _setupTorneo.livelli.push({ tipo: 'gioco', sb: last.sb*2, bb: last.bb*2, ante: last.ante, durata: last.durata });
  refreshTorneoConfig();
}
function aggiungiLivelloPausa() {
  if (!_setupTorneo) return;
  _setupTorneo.livelli.push({ tipo: 'pausa', durata: 10 });
  refreshTorneoConfig();
}
function setLateRegLivello(v) {
  if (!_setupTorneo) return;
  const max = _setupTorneo.livelli.filter(l => l.tipo === 'gioco').length;
  _setupTorneo.late_reg.fino_a_livello = Math.max(1, Math.min(max, parseInt(v) || 1));
  refreshTorneoConfig();
}
function toggleAddOn() {
  if (!_setupTorneo) return;
  _setupTorneo.add_on.abilitato = !_setupTorneo.add_on.abilitato;
  refreshTorneoConfig();
}
function setAddOnFiche(v) {
  if (!_setupTorneo) return;
  _setupTorneo.add_on.fiche = Math.max(0, parseInt(v) || 0);
}
function setAddOnPrezzo(v) {
  if (!_setupTorneo) return;
  _setupTorneo.add_on.prezzo = Math.max(0, parseFloat(v) || 0);
}

function avviaSessione() {
  const lega = currentLega();
  if (!lega) return;
  const data = document.getElementById('su-data').value;
  const oraI = document.getElementById('su-ora-in').value;
  const oraF = document.getElementById('su-ora-fi').value;
  const buyin = numVal('su-buyin');
  if (!data)  { toast('Inserisci la data'); return; }
  if (!oraI)  { toast('Inserisci l\'ora di inizio'); return; }
  if (_setupPartIds.size < 2) { toast('Seleziona almeno 2 partecipanti'); return; }

  const sess = {
    data,
    ora_inizio: oraI,
    ora_fine:   oraF || '',
    modalita:   _setupModalita,
    buy_in:     buyin,
    giocatori:  lega.nomi
                  .filter(n => _setupPartIds.has(n.id))
                  .map(n => nuovoGiocatoreSessione(n.id))
  };

  if (_setupModalita === 'torneo' && _setupTorneo) {
    sess.fiche_iniziali       = _setupTorneo.fiche_iniziali;
    sess.num_giocatori_target = _setupTorneo.num_giocatori;
    sess.num_tavoli           = Math.ceil(_setupTorneo.num_giocatori / 9);
    sess.durata_ore           = _setupTorneo.durata_ore;
    sess.livelli              = JSON.parse(JSON.stringify(_setupTorneo.livelli));
    sess.late_reg             = JSON.parse(JSON.stringify(_setupTorneo.late_reg));
    sess.add_on               = JSON.parse(JSON.stringify(_setupTorneo.add_on));
    if (!sess.add_on.prezzo) sess.add_on.prezzo = Math.round(buyin / 2 * 100) / 100;
    sess.stato                = 'pre';   // pre | attivo | pausa | concluso
    sess.livello_corrente     = 0;
    sess.inizio_livello_ms    = null;
    sess.trascorso_ms         = 0;
    sess.premi_consolidati    = false;
    sess.premi                = [];
    // Assegnazione posti casuali iniziale
    assegnaPostiCasuali(sess);
  }

  if (lega.sessioneAttiva) {
    if (!lega.serate_bg) lega.serate_bg = [];
    lega.serate_bg.push(lega.sessioneAttiva);
  }
  lega.sessioneAttiva = sess;
  _liveSubTab = (_setupModalita === 'torneo') ? 'orologio' : 'giocatori';
  _serataView = 'live';
  saveLega(lega);
  renderPartitaForm();
  toast('▶ Serata iniziata!');
}

function nuovoGiocatoreSessione(id_nome) {
  return {
    id_nome,
    entrato:         false,
    buy_in_pagato:   false,
    extra_amt:       0,
    extra_pagato:    true,
    ricariche:       [],   // [{ importo, pagata }]
    soldi_ricevuti:  0,
    fiches_finali:   0,
    // Campi torneo (usati solo se modalita='torneo')
    seat:            null, // { tavolo, posto }
    rebuys:          [],   // [{ importo, pagata }] — un rebuy in torneo = stesso prezzo del buy-in
    add_on_fatto:    false,
    add_on_pagato:   false,
    eliminato:       false,
    posizione_finale:null,
    elim_ts_ms:      null,
    prize_pagato:    false  // torneo: premio già consegnato al giocatore
  };
}

function assegnaPostiCasuali(sess) {
  const num_tavoli = sess.num_tavoli || Math.ceil((sess.num_giocatori_target || 9) / 9);
  const seats = [];
  for (let t = 1; t <= num_tavoli; t++) {
    for (let p = 1; p <= 9; p++) seats.push({ tavolo: t, posto: p });
  }
  // Shuffle seats
  for (let i = seats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seats[i], seats[j]] = [seats[j], seats[i]];
  }
  sess.giocatori.forEach((g, i) => {
    g.seat = seats[i] || null;
  });
}
