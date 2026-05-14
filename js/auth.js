'use strict';

/* ══════════════════════════════════════════════════════
   AUTH (mock — nessun salvataggio reale dei dati utente)
══════════════════════════════════════════════════════ */

function getUser()  { try { return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null'); } catch (_) { return null; } }
function setUser(u) { sessionStorage.setItem(USER_KEY, JSON.stringify(u)); }
function delUser()  { sessionStorage.removeItem(USER_KEY); }

function switchLoginTab(which) {
  document.getElementById('ltab-login').classList.toggle('active', which === 'login');
  document.getElementById('ltab-reg').classList.toggle('active',   which === 'reg');
  document.getElementById('login-form-login').style.display = which === 'login' ? '' : 'none';
  document.getElementById('login-form-reg').style.display   = which === 'reg'   ? '' : 'none';
}

function doLogin() {
  const user = document.getElementById('li-user').value.trim();
  const pwd  = document.getElementById('li-pwd').value;
  if (!user || !pwd) { toast('Inserisci username e password'); return; }
  setUser({ username: user });
  toast('✓ Accesso effettuato!');
  goCircoli();
}

function doRegister() {
  const user = document.getElementById('rg-user').value.trim();
  const mail = document.getElementById('rg-mail').value.trim();
  const pwd  = document.getElementById('rg-pwd').value;
  if (!user || !mail || !pwd) { toast('Compila tutti i campi'); return; }
  if (pwd.length < 6)         { toast('Password almeno 6 caratteri'); return; }
  setUser({ username: user, email: mail });
  toast('✓ Account creato!');
  goCircoli();
}

function doLogout() {
  if (!confirm('Vuoi uscire?')) return;
  delUser();
  goLogin();
}

function goLogin() { goScreen('screen-login'); }

/* ══════════════════════════════════════════════════════
   INIT (DOMContentLoaded)
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Enter key per login
  document.getElementById('li-pwd').addEventListener('keypress', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('rg-pwd').addEventListener('keypress', e => {
    if (e.key === 'Enter') doRegister();
  });
  document.getElementById('inp-nome').addEventListener('keypress', e => {
    if (e.key === 'Enter') aggiungiGiocatore();
  });

  // Se già loggato, salta al circoli
  if (getUser()) goCircoli();
  else goLogin();
});
