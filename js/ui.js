'use strict';

/* ══════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════ */
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  if (_toastTmr) clearTimeout(_toastTmr);
  _toastTmr = setTimeout(() => el.classList.remove('show'), 2700);
}

/* ══════════════════════════════════════════════════════
   SCREEN NAVIGATION
══════════════════════════════════════════════════════ */
function goScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.body.classList.toggle('in-app', id === 'screen-app');
  window.scrollTo(0, 0);
}

/* ══════════════════════════════════════════════════════
   APP — NAV TRA TAB
══════════════════════════════════════════════════════ */
function navTo(page, btn) {
  navToById(page);
  document.querySelectorAll('#screen-app .nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}
function navToById(page) {
  document.querySelectorAll('#screen-app .page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if (page === 'partecipanti') renderGiocatori();
  if (page === 'partita')      renderPartitaForm();
  if (page === 'storico')      renderStorico();
  if (page === 'classifica')   renderClassifica();
  // reset active nav button to match (when called programmatically)
  const map = { partecipanti: 0, partita: 1, storico: 2, classifica: 3 };
  const idx = map[page];
  if (idx !== undefined) {
    const btns = document.querySelectorAll('#screen-app .nav-btn');
    btns.forEach(b => b.classList.remove('active'));
    if (btns[idx]) btns[idx].classList.add('active');
  }
}

/* Re-renderizza la tab corrente di screen-app (utile dopo cambiamenti dati fuori da screen-app) */
function refreshActiveAppTab() {
  const active = document.querySelector('#screen-app .page.active');
  if (!active) return;
  const id = active.id.replace('page-', '');
  if (id === 'partecipanti') renderGiocatori();
  if (id === 'storico')      renderStorico();
  if (id === 'classifica')   renderClassifica();
  // 'partita' non viene re-renderizzato: preserva lo stato del form/live
}
