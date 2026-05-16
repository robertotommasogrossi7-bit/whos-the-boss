import { useStore, selectCurrentLega } from '../../store/useStore';
import { euro, getNome } from '../../utils/format';

/* ══════════════════════════════════════════════════════
   SUB-TAB: GIOCATORI (torneo)
   Derivato da renderSubGiocatoriTorneo() in session-tournament.js
══════════════════════════════════════════════════════ */
export default function SubGiocatoriTorneo() {
  const lega                     = useStore(selectCurrentLega);
  const toggleEntrato            = useStore(s => s.toggleEntrato);
  const toggleBuyInPagato        = useStore(s => s.toggleBuyInPagato);
  const torneoAggiungiGiocatore  = useStore(s => s.torneoAggiungiGiocatore);
  const torneoAddRebuy           = useStore(s => s.torneoAddRebuy);
  const torneoAddOn              = useStore(s => s.torneoAddOn);
  const torneoRevive             = useStore(s => s.torneoRevive);
  const torneoToggleAddOnPag     = useStore(s => s.torneoToggleAddOnPag);
  const torneoToggleRebuyPag     = useStore(s => s.torneoToggleRebuyPag);
  const torneoElimina            = useStore(s => s.torneoElimina);
  const rimuoviGiocatoreSessione = useStore(s => s.rimuoviGiocatoreSessione);
  const toast                    = useStore(s => s.toast);

  if (!lega?.sessioneAttiva) return null;
  const sess = lega.sessioneAttiva;

  const gameLvlNow = sess.livelli
    .slice(0, sess.livello_corrente + 1)
    .filter(l => l.tipo === 'gioco').length;
  const lateRegOpen    = gameLvlNow <= sess.late_reg.fino_a_livello;
  const addOnAvailable = sess.add_on?.abilitato;

  function handleAggiungi() {
    if (!lateRegOpen && sess.stato !== 'pre') {
      toast('Late reg chiusa — non puoi aggiungere altri giocatori');
      return;
    }
    const inSess = new Set(sess.giocatori.map(g => g.id_nome));
    const disponibili = lega!.nomi.filter(n => !inSess.has(n.id));
    let msg = 'Nome del giocatore da aggiungere:';
    if (disponibili.length)
      msg += '\n\nDisponibili dalla lega:\n' + disponibili.map(n => '• ' + n.nome).join('\n');
    const raw = window.prompt(msg);
    if (raw === null) return;
    torneoAggiungiGiocatore(lega!.id, raw.trim());
  }

  function handleAddRebuy(idNome: number) {
    const pagata = confirm('Ha già versato i soldi del rebuy?\n\n[OK] Sì, già versati\n[Annulla] Da pagare');
    torneoAddRebuy(lega!.id, idNome, pagata);
  }

  function handleAddOn(idNome: number) {
    const pagato = confirm("Ha già versato i soldi dell'add-on?\n\n[OK] Sì, già versati\n[Annulla] Da pagare");
    torneoAddOn(lega!.id, idNome, pagato);
  }

  const addBtn = (
    <button
      className="add-player-card"
      onClick={handleAggiungi}
      disabled={!lateRegOpen && sess.stato !== 'pre'}
    >
      <span className="api">➕</span>
      <span className="apt">
        {!lateRegOpen && sess.stato !== 'pre'
          ? 'Late reg chiusa — non puoi aggiungere'
          : 'Aggiungi giocatore al torneo'}
      </span>
    </button>
  );

  if (!sess.giocatori.length) {
    return (
      <>
        {addBtn}
        <div className="empty">
          <div className="eico">👥</div>
          <p>Nessun giocatore nel torneo</p>
        </div>
      </>
    );
  }

  // Ordina: in gioco → non ancora entrati → eliminati (per timestamp desc)
  const sorted = [...sess.giocatori].sort((a, b) => {
    if (a.entrato !== b.entrato) return a.entrato ? -1 : 1;
    if (a.eliminato !== b.eliminato) return a.eliminato ? 1 : -1;
    if (a.eliminato && b.eliminato) return (b.elim_ts_ms ?? 0) - (a.elim_ts_ms ?? 0);
    return 0;
  });

  return (
    <>
      {addBtn}
      {sorted.map(g => {
        const nome    = getNome(lega!, g.id_nome);
        const cardCls = g.eliminato ? 'busted' : (g.entrato ? 'in' : '');
        const seat    = g.seat ? `T${g.seat.tavolo}·P${g.seat.posto}` : null;

        let posBadge: React.ReactNode = null;
        if (g.posizione_finale === 1) {
          posBadge = <span className="pos">🏆 1°</span>;
        } else if (g.posizione_finale && g.eliminato) {
          posBadge = <span className="pos">#{g.posizione_finale}</span>;
        }

        let body: React.ReactNode;

        if (!g.entrato) {
          body = (
            <>
              <p className="help-note help-note--bt">Tocca "Entra" quando si siede al tavolo.</p>
              <div className="torneo-pcard-actions">
                <button className="ta-paid" onClick={() => toggleEntrato(lega!.id, g.id_nome)}>✓ Entra</button>
                <button className="ta-bust" onClick={() => {
                  if (!confirm(`Rimuovere ${nome} dal torneo?`)) return;
                  rimuoviGiocatoreSessione(lega!.id, g.id_nome);
                }}>Rimuovi</button>
              </div>
            </>
          );
        } else {
          const totVersato = (g.buy_in_pagato ? sess.buy_in : 0)
            + (g.rebuys ?? []).reduce((a, r) => a + (r.pagata ? r.importo : 0), 0)
            + (g.add_on_fatto && g.add_on_pagato ? (sess.add_on?.prezzo ?? 0) : 0);
          const totDovuto = sess.buy_in
            + (g.rebuys ?? []).reduce((a, r) => a + r.importo, 0)
            + (g.add_on_fatto ? (sess.add_on?.prezzo ?? 0) : 0);
          const mancante = totDovuto - totVersato;

          const actions = !g.eliminato ? (
            <div className="torneo-pcard-actions">
              {lateRegOpen && (
                <button className="ta-rebuy" onClick={() => handleAddRebuy(g.id_nome)}>+ Rebuy</button>
              )}
              {addOnAvailable && !g.add_on_fatto && (
                <button className="ta-addon" onClick={() => handleAddOn(g.id_nome)}>+ Add-on</button>
              )}
              <button className="ta-bust" onClick={() => {
                if (!confirm(`Eliminare ${nome}?`)) return;
                torneoElimina(lega!.id, g.id_nome);
              }}>❌ Eliminato</button>
            </div>
          ) : (
            <div className="torneo-pcard-actions">
              {lateRegOpen && (
                <button className="ta-rebuy" onClick={() => handleAddRebuy(g.id_nome)}>+ Rebuy (rientra)</button>
              )}
              <button className="ta-revive" onClick={() => torneoRevive(lega!.id, g.id_nome)}>Reintegra</button>
            </div>
          );

          body = (
            <>
              <div className="torneo-info-row">
                <span className="ti-lbl">Stato</span>
                <span className="ti-val">
                  {g.eliminato
                    ? `☠ Eliminato${g.posizione_finale ? ' · #' + g.posizione_finale : ''}`
                    : '✓ In gioco'}
                </span>
              </div>

              {/* Buy-in */}
              <div className="torneo-info-row ti-row-gray">
                <span className="ti-lbl">Buy-in · €{euro(sess.buy_in)}</span>
                <button
                  className={`pay-toggle ${g.buy_in_pagato ? 'paid' : 'unpaid'}`}
                  onClick={() => toggleBuyInPagato(lega!.id, g.id_nome)}
                >
                  {g.buy_in_pagato ? '✓ Pagato' : '✕ Non pagato'}
                </button>
              </div>

              {/* Rebuys */}
              {(g.rebuys ?? []).map((r, i) => (
                <div key={i} className="torneo-info-row ti-row-gray">
                  <span className="ti-lbl">Rebuy {i + 1} · €{euro(r.importo)}</span>
                  <button
                    className={`pay-toggle ${r.pagata ? 'paid' : 'unpaid'}`}
                    onClick={() => torneoToggleRebuyPag(lega!.id, g.id_nome, i)}
                  >
                    {r.pagata ? '✓ Pagato' : '✕ Non pagato'}
                  </button>
                </div>
              ))}

              {/* Add-on */}
              {g.add_on_fatto && (
                <div className="torneo-info-row ti-row-gold">
                  <span className="ti-lbl">Add-on · €{euro(sess.add_on?.prezzo ?? 0)}</span>
                  <button
                    className={`pay-toggle ${g.add_on_pagato ? 'paid' : 'unpaid'}`}
                    onClick={() => torneoToggleAddOnPag(lega!.id, g.id_nome)}
                  >
                    {g.add_on_pagato ? '✓ Pagato' : '✕ Non pagato'}
                  </button>
                </div>
              )}

              {/* Totale */}
              <div className="torneo-info-row ti-row-mt">
                <span className="ti-lbl">Totale versato</span>
                <span className="ti-val">€{euro(totVersato)} / €{euro(totDovuto)}</span>
              </div>

              {mancante > 0.005 && (
                <div className="mancante-btn mancante-btn--card">
                  ⚠ Mancano €{euro(mancante)} da versare
                </div>
              )}

              {actions}
            </>
          );
        }

        return (
          <div key={g.id_nome} className={`torneo-pcard${cardCls ? ' ' + cardCls : ''}`}>
            <div className="torneo-pcard-head">
              <div className="torneo-pcard-name">
                {nome}
                {seat && <span className="seat"> {seat}</span>}
                {posBadge && <> {posBadge}</>}
              </div>
            </div>
            <div className="torneo-pcard-body">{body}</div>
          </div>
        );
      })}
    </>
  );
}
