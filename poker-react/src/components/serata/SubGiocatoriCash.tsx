import { useStore, selectCurrentLega } from '../../store/useStore';
import { euro } from '../../utils/format';
import { getNome } from '../../utils/format';

/* ══════════════════════════════════════════════════════
   SUB-TAB: GIOCATORI (cash)
   Derivato da renderSubGiocatori() in session-cash.js
══════════════════════════════════════════════════════ */
export default function SubGiocatoriCash() {
  const lega                     = useStore(selectCurrentLega);
  const toggleEntrato            = useStore(s => s.toggleEntrato);
  const toggleBuyInPagato        = useStore(s => s.toggleBuyInPagato);
  const setExtraAmt              = useStore(s => s.setExtraAmt);
  const toggleExtraPagato        = useStore(s => s.toggleExtraPagato);
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
                <>
                  {/* Buy-in */}
                  <div className="status-line">
                    <span className="sl-label">Buy-in €{euro(sess.buy_in)} versato?</span>
                    <button
                      className={`pay-toggle ${g.buy_in_pagato ? 'paid' : 'unpaid'}`}
                      onClick={() => toggleBuyInPagato(lega!.id, g.id_nome)}
                    >
                      {g.buy_in_pagato ? '✓ Pagato' : '✕ Non pagato'}
                    </button>
                  </div>

                  {/* Extra ingresso */}
                  <div className="status-line">
                    <span className="sl-label">Entrato con extra?</span>
                    <div className="sl-actions">
                      <input
                        type="number"
                        placeholder="€ extra"
                        step="0.50"
                        min="0"
                        inputMode="decimal"
                        value={g.extra_amt || ''}
                        onChange={e => {
                          const v = parseFloat(e.target.value.replace(',', '.')) || 0;
                          setExtraAmt(lega!.id, g.id_nome, v);
                        }}
                      />
                      {g.extra_amt > 0 && (
                        <button
                          className={`pay-toggle ${g.extra_pagato ? 'paid' : 'unpaid'}`}
                          onClick={() => toggleExtraPagato(lega!.id, g.id_nome)}
                        >
                          {g.extra_pagato ? '✓' : '✕'}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="help-note help-note--bt">
                    Segna come entrato per registrare buy-in, ricariche, soldi ricevuti e fiches.
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
