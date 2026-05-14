'use strict';

/* ══════════════════════════════════════════════════════
   NAVIGATION — circoli / nuova lega / lista leghe / app
══════════════════════════════════════════════════════ */
function goCircoli()    {
  if (!getUser()) return goLogin();
  const u = getUser();
  document.getElementById('circoli-saluto').textContent = 'Ciao ' + (u.username || '') + '!';
  const db = dbGet();
  const n = db.leghe.length;
  document.getElementById('circoli-cnt').textContent = n + (n === 1 ? ' lega' : ' leghe');
  goScreen('screen-circoli');
  renderSerateInCorso();
}

function renderSerateInCorso() {
  const el = document.getElementById('serate-in-corso');
  if (!el) return;
  const db = dbGet();
  const attive = db.leghe.filter(l => l.sessioneAttiva);
  if (!attive.length) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="sec-hdr" style="margin-top:8px"><h2>Serate in corso</h2></div>
    ${attive.map(l => {
      const s = l.sessioneAttiva;
      const tipo = s.modalita === 'torneo' ? '🏆 Torneo' : '💰 Cash';
      const nEnt = (s.giocatori || []).filter(g => g.entrato).length;
      return `
        <div class="serata-attiva-card" onclick="goApp(${l.id})">
          <div class="sac-dot">🔴</div>
          <div class="sac-info">
            <h3>${esc(l.nome)}</h3>
            <p>${tipo} · ${nEnt} giocatori · ${fmtData(s.data || '')}</p>
          </div>
          <div class="sac-arrow">›</div>
        </div>`;
    }).join('')}
  `;
}
function goNuovaLega()  {
  if (!getUser()) return goLogin();
  resetNuovaLegaForm();
  goScreen('screen-nuova-lega');
}
function goListaLeghe() {
  if (!getUser()) return goLogin();
  renderListaLeghe();
  goScreen('screen-lista-leghe');
}
function goApp(legaId) {
  if (!getUser()) return goLogin();
  const db = dbGet();
  db._currentLegaId = legaId;
  dbSave(db);
  const lega = currentLega();
  if (!lega) return goListaLeghe();
  document.getElementById('app-lega-nome').textContent = lega.nome;
  const np = lega.nomi.length;
  document.getElementById('app-lega-meta').textContent = np + (np === 1 ? ' partecipante' : ' partecipanti');
  if (!lega.serate_bg) lega.serate_bg = [];
  _formRendered = false;
  _serataView = 'hub';
  renderGiocatori();
  navToById('partecipanti');
  goScreen('screen-app');
  aggiornaFabDebiti();
}

/* ══════════════════════════════════════════════════════
   NUOVA LEGA — form
══════════════════════════════════════════════════════ */
function resetNuovaLegaForm() {
  _nlFoto = '';
  document.getElementById('nl-nome').value = '';
  const prev = document.getElementById('nl-foto-prev');
  prev.style.backgroundImage = '';
  prev.classList.remove('filled');
  prev.textContent = '📷';
  document.getElementById('nl-foto-input').value = '';
  const list = document.getElementById('nl-part-list');
  list.innerHTML = '';
  aggiungiCampoPartecipante();
  aggiungiCampoPartecipante();
}

function aggiungiCampoPartecipante(val) {
  const list = document.getElementById('nl-part-list');
  const wrap = document.createElement('div');
  wrap.className = 'nuovo-part-row';
  wrap.innerHTML = `
    <input type="text" placeholder="Nome partecipante" maxlength="25" autocapitalize="words">
    <button type="button" class="btn-rem" onclick="this.parentNode.remove()">✕</button>
  `;
  if (val) wrap.querySelector('input').value = val;
  list.appendChild(wrap);
}

function caricaFotoLega(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    _nlFoto = e.target.result;
    const prev = document.getElementById('nl-foto-prev');
    prev.style.backgroundImage = `url('${_nlFoto}')`;
    prev.classList.add('filled');
    prev.textContent = '';
  };
  reader.readAsDataURL(file);
}

function creaLega() {
  const nome = document.getElementById('nl-nome').value.trim();
  if (!nome) { toast('Inserisci il nome della lega'); return; }

  const inputs = document.querySelectorAll('#nl-part-list input');
  const nomiList = [];
  let nid = 1;
  inputs.forEach(inp => {
    const v = inp.value.trim();
    if (v && !nomiList.some(n => n.nome.toLowerCase() === v.toLowerCase())) {
      nomiList.push({ id: nid++, nome: v });
    }
  });

  const db = dbGet();
  const lega = {
    id: db._lid++,
    nome,
    foto: _nlFoto || '',
    nomi: nomiList,
    partite: [],
    _nid: nid,
    _pid: 1
  };
  db.leghe.push(lega);
  dbSave(db);
  toast('✓ Lega creata!');
  goApp(lega.id);
}

/* ══════════════════════════════════════════════════════
   LISTA LEGHE
══════════════════════════════════════════════════════ */
function renderListaLeghe() {
  const db  = dbGet();
  const el  = document.getElementById('lista-leghe-container');
  const usr = getUser();

  if (!db.leghe.length) {
    el.innerHTML = `
      <div class="empty">
        <div class="eico">🏆</div>
        <p>Non sei ancora in nessuna lega.<br>Creane una nuova!</p>
      </div>
      <button class="btn btn-green btn-block" onclick="goNuovaLega()" style="margin-top:14px">+ Crea la tua prima lega</button>
    `;
    return;
  }

  el.innerHTML = db.leghe.map(l => {
    const np = l.nomi.length;
    const ng = l.partite.length;
    // rendimento dell'utente attuale (matching by username case-insensitive)
    let rendimento = 0;
    let vittorie   = 0;
    if (usr && usr.username) {
      const meId = (l.nomi.find(n => n.nome.toLowerCase() === usr.username.toLowerCase()) || {}).id;
      if (meId !== undefined) {
        l.partite.forEach(p => {
          const g = p.giocatori.find(x => x.id_nome === meId);
          if (g) {
            rendimento += g.netto_finale || 0;
            if (g.vincitore) vittorie++;
          }
        });
      }
    }
    const foto = l.foto
      ? `<div class="lega-foto" style="background-image:url('${l.foto}')"></div>`
      : `<div class="lega-foto">♠</div>`;
    const preview = l.nomi.slice(0, 3).map(n => esc(n.nome)).join(', ') +
                    (l.nomi.length > 3 ? `, +${l.nomi.length - 3}` : '');
    const rendCls = rendimento > 0 ? 'pos' : rendimento < 0 ? 'neg' : 'neu';
    return `
      <div class="lega-item" onclick="goApp(${l.id})">
        <div class="lega-item-head">
          ${foto}
          <div class="lega-info">
            <div class="lega-name">${esc(l.nome)}</div>
            <div class="lega-meta">${np} partecipanti · ${preview || '—'}</div>
          </div>
          <div class="lega-arrow">›</div>
        </div>
        <div class="lega-stats">
          <div class="lega-stat">
            <div class="lst-label">Serate</div>
            <div class="lst-val">${ng}</div>
          </div>
          <div class="lega-stat">
            <div class="lst-label">Vittorie tue</div>
            <div class="lst-val">${vittorie}</div>
          </div>
          <div class="lega-stat">
            <div class="lst-label">Tuo netto</div>
            <div class="lst-val ${rendCls}">${euroSigned(rendimento)}</div>
          </div>
        </div>
      </div>
    `;
  }).join('') + `
    <button class="btn btn-outline btn-block" onclick="goNuovaLega()" style="margin-top:8px">
      + Nuova lega
    </button>
  `;
}
