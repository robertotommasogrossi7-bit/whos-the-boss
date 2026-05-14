'use strict';

/* ══════════════════════════════════════════════════════
   TAB 1 – PARTECIPANTI
══════════════════════════════════════════════════════ */
function renderGiocatori() {
  const lega = currentLega();
  if (!lega) return;
  document.getElementById('cnt-giocatori').textContent =
    lega.nomi.length + (lega.nomi.length === 1 ? ' iscritto' : ' iscritti');
  document.getElementById('app-lega-meta').textContent =
    lega.nomi.length + (lega.nomi.length === 1 ? ' partecipante' : ' partecipanti');

  const el = document.getElementById('lista-giocatori');
  if (!lega.nomi.length) {
    el.innerHTML = '<div class="empty"><div class="eico">👥</div><p>Nessun partecipante aggiunto</p></div>';
    return;
  }

  el.innerHTML = lega.nomi.map(n => {
    const ng = lega.partite.filter(p => p.giocatori.some(g => g.id_nome === n.id)).length;
    return `
      <div class="player-row">
        <div class="pr-left">
          <span class="pr-games">${ng}</span>
          <span class="pr-name">${esc(n.nome)}</span>
        </div>
        <button class="btn btn-red btn-sm" onclick="eliminaGiocatore(${n.id})">✕</button>
      </div>`;
  }).join('');
}

function aggiungiGiocatore() {
  const inp = document.getElementById('inp-nome');
  const nome = inp.value.trim();
  if (!nome) { toast('Inserisci un nome'); return; }
  const lega = currentLega();
  if (!lega) return;
  if (lega.nomi.some(n => n.nome.toLowerCase() === nome.toLowerCase())) {
    toast('Partecipante già presente'); return;
  }
  lega.nomi.push({ id: lega._nid++, nome });
  saveLega(lega);
  _formRendered = false;
  inp.value = '';
  renderGiocatori();
  toast('✓ ' + nome + ' aggiunto!');
}

function eliminaGiocatore(id) {
  const lega = currentLega();
  if (!lega) return;
  if (lega.partite.some(p => p.giocatori.some(g => g.id_nome === id))) {
    toast('Impossibile: ha partite registrate'); return;
  }
  const n = lega.nomi.find(n => n.id === id);
  if (!confirm(`Eliminare "${n?.nome}"?`)) return;
  lega.nomi = lega.nomi.filter(n => n.id !== id);
  saveLega(lega);
  _formRendered = false;
  renderGiocatori();
  toast('Partecipante eliminato');
}
