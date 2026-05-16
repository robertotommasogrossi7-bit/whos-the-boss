import { useStore, selectCurrentLega } from '../../store/useStore';
import { euro, euroSigned, getNome } from '../../utils/format';
import { useComputeLive } from '../../hooks/useComputeLive';

/* ══════════════════════════════════════════════════════
   SUB-TAB: ATTIVI (cash)
   Derivato da renderSubAttivi() in session-cash.js
══════════════════════════════════════════════════════ */
export default function SubAttivi() {
  const lega                 = useStore(selectCurrentLega);
  const toggleBuyInPagato    = useStore(s => s.toggleBuyInPagato);
  const toggleExtraPagato    = useStore(s => s.toggleExtraPagato);
  const toggleRicaricaPagata = useStore(s => s.toggleRicaricaPagata);
  const aggiungiRicarica     = useStore(s => s.aggiungiRicarica);
  const modificaRicarica     = useStore(s => s.modificaRicarica);
  const setSoldiRicevuti     = useStore(s => s.setSoldiRicevuti);
  const aggiornaFiches       = useStore(s => s.aggiornaFiches);
  const toast                = useStore(s => s.toast);

  if (!lega?.sessioneAttiva) return null;
  const sess = lega.sessioneAttiva;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { arr, leaderId } = useComputeLive(sess);
  const attivi = arr.filter(c => c.entrato);

  if (!attivi.length) {
    return (
      <div className="empty">
        <div className="eico">♠</div>
        <p>
          Nessuno è ancora entrato.<br />
          Vai sulla tab <b>Giocatori</b> per segnare gli ingressi.
        </p>
      </div>
    );
  }

  function handleAggiungiRicarica(idNome: number) {
    const raw = window.prompt('Importo ricarica (€)');
    if (raw === null) return;
    const v = parseFloat(raw.replace(',', '.'));
    if (isNaN(v) || v <= 0) { toast('Importo non valido'); return; }
    const pagata = confirm('Ha già versato i soldi?\n\n[OK] Sì, già versati\n[Annulla] Da pagare ancora');
    aggiungiRicarica(lega!.id, idNome, v, pagata);
  }

  function handleModificaRicarica(idNome: number, idx: number, curImporto: number) {
    const raw = window.prompt(`Modifica importo (€${euro(curImporto)}). Scrivi 0 per eliminare.`, String(curImporto));
    if (raw === null) return;
    const v = parseFloat(raw.replace(',', '.'));
    if (isNaN(v) || v < 0) { toast('Importo non valido'); return; }
    modificaRicarica(lega!.id, idNome, idx, v);
  }

  function handleMancante(idNome: number) {
    const c = attivi.find(x => x.id_nome === idNome);
    if (!c) return;
    if (c.mancante <= 0) { toast('✓ Tutto versato!'); return; }
    let det = `${getNome(lega!, idNome)} deve ancora versare €${euro(c.mancante)}\n\nDettaglio:`;
    if (!c.buy_in_pagato) det += `\n• Buy-in: €${euro(sess.buy_in)}`;
    if (c.extra_amt > 0 && !c.extra_pagato) det += `\n• Extra ingresso: €${euro(c.extra_amt)}`;
    c.ricariche.forEach((r, i) => {
      if (!r.pagata) det += `\n• Ricarica ${i + 1}: €${euro(r.importo)}`;
    });
    window.alert(det);
  }

  return (
    <>
      {attivi.map(c => {
        const isWinner  = c.id_nome === leaderId;
        const nettoCls  = c.netto > 0 ? 'pos' : c.netto < 0 ? 'neg' : 'neu';
        const nettoLbl  = c.netto > 0 ? 'Riceve' : c.netto < 0 ? 'Deve dare' : '—';
        const nome      = getNome(lega!, c.id_nome);

        return (
          <div
            key={c.id_nome}
            className={`live-card in${isWinner ? ' winner' : ''}`}
            data-id={c.id_nome}
          >
            <div className="lc-head">
              <div className="lc-name">
                {nome}
                {isWinner && <span className="crown">👑</span>}
              </div>
            </div>

            <div className="lc-body">
              {/* Buy-in */}
              <div className="status-line">
                <span className="sl-label">Buy-in €{euro(sess.buy_in)}</span>
                <button
                  className={`pay-toggle ${c.buy_in_pagato ? 'paid' : 'unpaid'}`}
                  onClick={() => toggleBuyInPagato(lega!.id, c.id_nome)}
                >
                  {c.buy_in_pagato ? '✓ Pagato' : '✕ Non pagato'}
                </button>
              </div>

              {/* Extra */}
              {c.extra_amt > 0 && (
                <div className="status-line">
                  <span className="sl-label">Extra ingresso €{euro(c.extra_amt)}</span>
                  <button
                    className={`pay-toggle ${c.extra_pagato ? 'paid' : 'unpaid'}`}
                    onClick={() => toggleExtraPagato(lega!.id, c.id_nome)}
                  >
                    {c.extra_pagato ? '✓ Pagato' : '✕ Non pagato'}
                  </button>
                </div>
              )}

              {/* Ricariche */}
              {c.ricariche.length > 0 && (
                <div className="ricariche-list">
                  {c.ricariche.map((r, i) => (
                    <div key={i} className="ricariche-item">
                      <span className="ri-amt">€{euro(r.importo)}</span>
                      <div className="ri-actions">
                        <button
                          className={`pay-toggle ${r.pagata ? 'paid' : 'unpaid'}`}
                          onClick={() => toggleRicaricaPagata(lega!.id, c.id_nome, i)}
                        >
                          {r.pagata ? '✓ Pagata' : '✕ Non pagata'}
                        </button>
                        <button
                          className="btn-edit"
                          onClick={() => handleModificaRicarica(c.id_nome, i, r.importo)}
                        >
                          ✎
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn btn-outline btn-sm btn--full-mt"
                onClick={() => handleAggiungiRicarica(c.id_nome)}
              >
                +€ Aggiungi ricarica
              </button>

              {/* Soldi ricevuti */}
              <div className="lc-row lc-row--mt">
                <span className="lr-label">Soldi ricevuti in mano</span>
                <input
                  type="number"
                  value={c.soldi_ricevuti || ''}
                  placeholder="0"
                  step="0.50"
                  min="0"
                  inputMode="decimal"
                  onInput={e => {
                    const v = parseFloat((e.target as HTMLInputElement).value.replace(',', '.')) || 0;
                    setSoldiRicevuti(lega!.id, c.id_nome, v);
                  }}
                />
              </div>

              {/* Fiches finali */}
              <div className="lc-row">
                <span className="lr-label">Fiches finali (€)</span>
                <input
                  type="number"
                  value={c.fiches_finali || ''}
                  placeholder="0"
                  step="0.50"
                  min="0"
                  inputMode="decimal"
                  onInput={e => {
                    const v = parseFloat((e.target as HTMLInputElement).value.replace(',', '.')) || 0;
                    aggiornaFiches(lega!.id, c.id_nome, v);
                  }}
                />
              </div>

              {/* Netto */}
              <div className="netto-block">
                <span className={`netto-big ${nettoCls}`}>{euroSigned(c.netto)}</span>
                <div className="netto-label">{nettoLbl}</div>
              </div>

              {/* Mancante */}
              <button
                className={`mancante-btn${c.mancante === 0 ? ' zero' : ''}`}
                onClick={() => handleMancante(c.id_nome)}
              >
                {c.mancante > 0
                  ? `⚠ Mancano €${euro(c.mancante)} da versare`
                  : '✓ Tutto versato'}
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
