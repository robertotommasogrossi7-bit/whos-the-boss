import { useStore, selectCurrentLega } from '../../store/useStore';
import { euro } from '../../utils/format';
import { getNome } from '../../utils/format';

/* ══════════════════════════════════════════════════════
   SUB-TAB: GIOCATORI (cash) — nuovo modello versato
   Il campo "versato" sostituisce i toggle buy_in_pagato /
   extra_pagato / ricarica.pagata del vecchio modello.
══════════════════════════════════════════════════════ */
export default function SubGiocatoriCash() {
  const lega                     = useStore(selectCurrentLega);
  const toggleEntrato            = useStore(s => s.toggleEntrato);
  const setEntrata               = useStore(s => s.setEntrata);
  const setVersato               = useStore(s => s.setVersato);
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
        const ricaricheTot = g.ricariche.reduce((a, r) => a + r.importo, 0);
        const entrata = g.entrata ?? sess.buy_in;
        const dovuto  = entrato ? entrata + ricaricheTot : 0;

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
                  {/* Entrata — buy-in effettivo del giocatore */}
                  <div className="lc-row">
                    <span className="lr-label">Entrata €</span>
                    <input
                      type="number"
                      value={entrata || ''}
                      placeholder={String(sess.buy_in)}
                      step="0.50"
                      min="0"
                      inputMode="decimal"
                      onInput={e => {
                        const v = parseFloat((e.target as HTMLInputElement).value.replace(',', '.')) || 0;
                        setEntrata(lega!.id, g.id_nome, v);
                      }}
                    />
                  </div>

                  {/* Dovuto breakdown */}
                  <div className="versato-dovuto-row">
                    <span className="vd-label">Dovuto</span>
                    <span className="vd-amount">€{euro(dovuto)}</span>
                  </div>
                  {ricaricheTot > 0 && (
                    <div className="versato-dovuto-row versato-dovuto-row--sub">
                      <span className="vd-label">
                        (Entrata €{euro(entrata)} + ricariche €{euro(ricaricheTot)})
                      </span>
                    </div>
                  )}

                  {/* Versato — campo libero */}
                  <div className="lc-row lc-row--mt">
                    <span className="lr-label">Versato nel piatto (€)</span>
                    <input
                      type="number"
                      value={g.versato || ''}
                      placeholder="0"
                      step="0.50"
                      min="0"
                      inputMode="decimal"
                      onInput={e => {
                        const v = parseFloat((e.target as HTMLInputElement).value.replace(',', '.')) || 0;
                        setVersato(lega!.id, g.id_nome, v);
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="help-note help-note--bt">
                    Segna come entrato per registrare versato, ricariche e fiches.
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
