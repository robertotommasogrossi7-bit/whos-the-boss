import { useStore, selectCurrentLega } from '../../store/useStore';
import { euro, euroSigned, getNome } from '../../utils/format';
import { useComputeLive } from '../../hooks/useComputeLive';

/* ══════════════════════════════════════════════════════
   SUB-TAB: ATTIVI (cash) — nuovo modello versato
   Mostra per ogni giocatore entrato:
   - dovuto breakdown (buy-in + ricariche)
   - campo versato modificabile
   - mancante calcolato
   - fiches finali
   - netto = fiche - dovuto
══════════════════════════════════════════════════════ */
export default function SubAttivi() {
  const lega               = useStore(selectCurrentLega);
  const aggiungiRicarica   = useStore(s => s.aggiungiRicarica);
  const modificaRicarica   = useStore(s => s.modificaRicarica);
  const setVersato         = useStore(s => s.setVersato);
  const aggiornaFiches     = useStore(s => s.aggiornaFiches);
  const toast              = useStore(s => s.toast);

  const sessAttiva = lega?.sessioneAttiva;
  const { arr, leaderId } = useComputeLive(sessAttiva);

  if (!lega || !sessAttiva) return null;
  const sess = sessAttiva;

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
    aggiungiRicarica(lega!.id, idNome, v, false);
  }

  function handleModificaRicarica(idNome: number, idx: number, curImporto: number) {
    const raw = window.prompt(`Modifica importo (€${euro(curImporto)}). Scrivi 0 per eliminare.`, String(curImporto));
    if (raw === null) return;
    const v = parseFloat(raw.replace(',', '.'));
    if (isNaN(v) || v < 0) { toast('Importo non valido'); return; }
    modificaRicarica(lega!.id, idNome, idx, v);
  }

  return (
    <>
      {attivi.map(c => {
        const isWinner  = c.id_nome === leaderId;
        const nettoCls  = c.netto > 0 ? 'pos' : c.netto < 0 ? 'neg' : 'neu';
        const nettoLbl  = c.netto > 0 ? 'Vince' : c.netto < 0 ? 'Perde' : '—';
        const nome      = getNome(lega!, c.id_nome);
        const mancante  = c.mancante;

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
              {/* Dovuto */}
              <div className="versato-dovuto-row">
                <span className="vd-label">
                  Dovuto (€{euro(sess.buy_in)} buy-in
                  {c.ricaricheTot > 0 ? ` + €${euro(c.ricaricheTot)} ricariche` : ''})
                </span>
                <span className="vd-amount">€{euro(c.dovuto)}</span>
              </div>

              {/* Ricariche */}
              {c.ricariche.length > 0 && (
                <div className="ricariche-list">
                  {c.ricariche.map((r, i) => (
                    <div key={i} className="ricariche-item">
                      <span className="ri-amt">Ricarica {i + 1}: €{euro(r.importo)}</span>
                      <button
                        className="btn-edit"
                        onClick={() => handleModificaRicarica(c.id_nome, i, r.importo)}
                      >
                        ✎
                      </button>
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

              {/* Versato */}
              <div className="lc-row lc-row--mt">
                <span className="lr-label">Versato nel piatto (€)</span>
                <input
                  type="number"
                  value={c.versato || ''}
                  placeholder="0"
                  step="0.50"
                  min="0"
                  inputMode="decimal"
                  onInput={e => {
                    const v = parseFloat((e.target as HTMLInputElement).value.replace(',', '.')) || 0;
                    setVersato(lega!.id, c.id_nome, v);
                  }}
                />
              </div>

              {/* Mancante */}
              {mancante > 0.005 && (
                <div className="mancante-badge">
                  ⚠ Mancano €{euro(mancante)} da versare
                </div>
              )}

              {/* Fiches finali */}
              <div className="lc-row">
                <span className="lr-label">Fiches finali (€)</span>
                <input
                  type="number"
                  value={c.fiches || ''}
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
            </div>
          </div>
        );
      })}
    </>
  );
}
