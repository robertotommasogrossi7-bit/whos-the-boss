import { useStore, selectCurrentLega } from '../../store/useStore';
import { getNome } from '../../utils/format';

/* ══════════════════════════════════════════════════════
   SUB-TAB: GIOCATORI (cash)
   Derivato da renderSubGiocatori() in session-cash.js
══════════════════════════════════════════════════════ */
export default function SubGiocatoriCash() {
  const lega                     = useStore(selectCurrentLega);
  const toggleEntrato            = useStore(s => s.toggleEntrato);
  const setEntrata               = useStore(s => s.setEntrata);
  const toggleEntrataPagata      = useStore(s => s.toggleEntrataPagata);
  const addGiocatoreSessione     = useStore(s => s.addGiocatoreSessione);
  const rimuoviGiocatoreSessione = useStore(s => s.rimuoviGiocatoreSessione);

  if (!lega?.sessioneAttiva) return null;
  const sess = lega.sessioneAttiva;

  function handleAggiungi() {
    const inSess = new Set(sess.giocatori.map(g => g.id_nome));
    const disponibili = lega!.nomi.filter(n => !inSess.has(n.id));
    let msg = 'Nome del giocatore da aggiungere:';
    if (disponibili.length)
      msg += '\n\nDisponibili dalla lega:\n' + disponibili.map(n => '• ' + n.nome).join('\n');
    const raw = window.prompt(msg);
    if (raw === null) return;
    addGiocatoreSessione(lega!.id, raw.trim());
  }

  const addBtn = (
    <button className="add-player-card" onClick={handleAggiungi}>
      <span className="api">➕</span>
      <span className="apt">Aggiungi giocatore alla serata</span>
    </button>
  );

  if (!sess.giocatori.length) {
    return (
      <>
        {addBtn}
        <div className="empty">
          <div className="eico">👥</div>
          <p>Nessun giocatore nella serata</p>
        </div>
      </>
    );
  }

  return (
    <>
      {addBtn}
      {sess.giocatori.map(g => {
        const nome    = getNome(lega, g.id_nome);
        const entrato = g.entrato;

        return (
          <div key={g.id_nome} className={`live-card${entrato ? ' in' : ''}`}>
            <div className="lc-head">
              <div className="lc-name">{nome}</div>
              <label className="entrato-toggle">
                <input
                  type="checkbox"
                  checked={entrato}
                  onChange={() => toggleEntrato(lega!.id, g.id_nome)}
                />
                <span>{entrato ? 'Entrato' : 'Entra'}</span>
              </label>
            </div>

            <div className="lc-body">
              {entrato ? (
                /* Entrata: importo libero (default = buy-in di sessione) + toggle versata */
                <div className="status-line">
                  <span className="sl-label">Entrata (€)</span>
                  <div className="sl-actions">
                    <input
                      type="number"
                      placeholder={String(sess.buy_in)}
                      step="0.50"
                      min="0"
                      inputMode="decimal"
                      value={g.entrata || ''}
                      onChange={e => {
                        const v = parseFloat(e.target.value.replace(',', '.')) || 0;
                        setEntrata(lega!.id, g.id_nome, v);
                      }}
                    />
                    <button
                      className={`pay-toggle ${g.entrata_pagata ? 'paid' : 'unpaid'}`}
                      onClick={() => toggleEntrataPagata(lega!.id, g.id_nome)}
                    >
                      {g.entrata_pagata ? '✓ Versata' : '✕ Non versata'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="help-note help-note--bt">
                    Segna come entrato per registrare entrata, ricariche e fiches.
                  </p>
                  <button
                    className="btn btn-gray btn-sm"
                    onClick={() => {
                      if (!confirm(`Rimuovere ${nome} dalla serata?`)) return;
                      rimuoviGiocatoreSessione(lega!.id, g.id_nome);
                    }}
                  >
                    Rimuovi dalla serata
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
