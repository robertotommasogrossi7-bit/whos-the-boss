import { useStore, selectCurrentLega } from '../../store/useStore';
import { euro, getNome } from '@poker/core';
import { IconPlus, IconUsers } from '../icons';
import TavoloView from './TavoloView';

/* ══════════════════════════════════════════════════════
   SUB-TAB: GIOCATORI (cash) — nuovo modello versato
   T2: TavoloView in cima + cards solo per entrati.
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

  const entrati = sess.giocatori.filter(g => g.entrato);

  return (
    <>
      {/* Tavolo interattivo + sezione "da far entrare" */}
      <TavoloView
        lega={lega}
        sess={sess}
        onRimuovi={(id) => rimuoviGiocatoreSessione(lega!.id, id)}
      />

      {/* Bottone aggiungi giocatore alla serata */}
      <button className="add-player-card" onClick={handleAggiungi}>
        <span className="api"><IconPlus size={22} /></span>
        <span className="apt">Aggiungi giocatore alla serata</span>
      </button>

      {/* Cards solo per i giocatori entrati (controlli entrata/versato) */}
      {entrati.length === 0 && sess.giocatori.length === 0 && (
        <div className="empty">
          <div className="eico"><IconUsers size={46} /></div>
          <p>Nessun giocatore nella serata</p>
        </div>
      )}

      {entrati.map(g => {
        const nome         = getNome(lega, g.id_nome);
        const ricaricheTot = g.ricariche.reduce((a, r) => a + r.importo, 0);
        const entrata      = g.entrata ?? sess.buy_in;
        const dovuto       = entrata + ricaricheTot;

        return (
          <div key={g.id_nome} className="live-card in">
            <div className="lc-head">
              <div className="lc-name">
                {nome}
                {g.seat && (
                  <span className="seat"> T{g.seat.tavolo}·P{g.seat.posto}</span>
                )}
              </div>
              <button
                className="btn btn-gray btn-sm"
                onClick={() => {
                  if (!confirm(`Far uscire ${nome} dal tavolo?`)) return;
                  toggleEntrato(lega!.id, g.id_nome);
                }}
              >
                Esci
              </button>
            </div>

            <div className="lc-body">
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
            </div>
          </div>
        );
      })}
    </>
  );
}
