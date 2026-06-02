import { useStore, selectCurrentLega } from '../../store/useStore';
import { fmtData, euro, getNome } from '../../utils/format';
import { IconHistory, IconTrash, IconTrophy, IconCrown, IconChevronUp, IconChevronDown } from '../icons';

export default function TabStorico() {
  const lega                = useStore(selectCurrentLega);
  const storicoFrom         = useStore(s => s.storicoFrom);
  const storicoTo           = useStore(s => s.storicoTo);
  const storicoOpen         = useStore(s => s.storicoOpen);
  const setStoricoFrom      = useStore(s => s.setStoricoFrom);
  const setStoricoTo        = useStore(s => s.setStoricoTo);
  const toggleStoricoOpen   = useStore(s => s.toggleStoricoOpen);
  const eliminaPartita      = useStore(s => s.eliminaPartita);
  const toggleSettlementPaid = useStore(s => s.toggleSettlementPaid);
  const toast               = useStore(s => s.toast);

  if (!lega) return null;

  /* Filtra per data e ordina dalla più recente */
  const partite = lega.partite
    .filter(p => {
      if (storicoFrom && p.data < storicoFrom) return false;
      if (storicoTo   && p.data > storicoTo)   return false;
      return true;
    })
    .slice()
    .sort((a, b) => b.data.localeCompare(a.data));

  function doEliminaPartita(pid: number) {
    if (!confirm('Eliminare questa partita? L\'operazione è irreversibile.')) return;
    eliminaPartita(lega!.id, pid);
    toast('Partita eliminata');
  }

  function resetFiltri() {
    setStoricoFrom('');
    setStoricoTo('');
  }

  return (
    <div className="tab-content">

      {/* Barra filtro date */}
      <div className="date-filter-bar">
        <label>Dal</label>
        <input
          type="date"
          value={storicoFrom}
          onChange={e => setStoricoFrom(e.target.value)}
        />
        <label>Al</label>
        <input
          type="date"
          value={storicoTo}
          onChange={e => setStoricoTo(e.target.value)}
        />
        {(storicoFrom || storicoTo) && (
          <button className="btn-reset" onClick={resetFiltri}>Reset</button>
        )}
      </div>

      {partite.length === 0 ? (
        <div className="empty">
          <div className="eico"><IconHistory size={46} /></div>
          <p>Nessuna partita nel periodo selezionato.</p>
        </div>
      ) : (
        partite.map(partita => {
          const isOpen = storicoOpen.has(partita.id);
          /* Ranking: ordina per netto decrescente */
          const ranking = partita.giocatori
            .slice()
            .sort((a, b) => b.netto_finale - a.netto_finale);

          const tipo = partita.modalita === 'torneo' ? 'Torneo' : 'Cash';
          const vincitore = partita.giocatori.find(g => g.vincitore);
          const vincitoreNome = vincitore ? getNome(lega, vincitore.id_nome) : null;

          /* Classe CSS per riga ranking */
          function rankClass(i: number): string {
            if (i === 0) return 'rank-1';
            if (i === 1) return 'rank-2';
            if (i === 2) return 'rank-3';
            return '';
          }

          return (
            <div key={partita.id} className="game-card">

              {/* Intestazione (clickabile per espandere) */}
              <div
                className="game-card-head"
                onClick={() => toggleStoricoOpen(partita.id)}
              >
                <div>
                  <div className="game-card-date">{tipo} · {fmtData(partita.data)}</div>
                  <div className="game-card-date-sub">
                    {partita.giocatori.length} giocatori · {partita.ora_inizio}–{partita.ora_fine}
                  </div>
                </div>
                <div className="game-card-actions">
                  <button
                    className="ic-btn"
                    title="Elimina partita"
                    onClick={e => { e.stopPropagation(); doEliminaPartita(partita.id); }}
                  >
                    <IconTrash size={15} />
                  </button>
                  <span className="storico-toggle">
                    {isOpen ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
                  </span>
                </div>
              </div>

              {/* Barra vincitore */}
              {vincitoreNome && (
                <div className="game-winner-bar">
                  <IconTrophy size={14} className="ico-inline" /> Vincitore: {vincitoreNome}
                </div>
              )}

              {/* Corpo espandibile */}
              {isOpen && (
                <>
                  {/* Tabella ranking */}
                  <div className="tbl-wrap">
                    <table className="ranking-tbl">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Giocatore</th>
                          <th>Buy-in</th>
                          <th>Netto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranking.map((g, i) => (
                          <tr key={g.id_nome} className={rankClass(i)}>
                            <td>
                              <span className="rank-pos">{i + 1}</span>
                            </td>
                            <td>
                              <span className={vincitore?.id_nome === g.id_nome ? 'name-with-crown' : ''}>
                                {getNome(lega, g.id_nome)}
                                {vincitore?.id_nome === g.id_nome && <span className="crown"><IconCrown size={15} className="ico-inline" /></span>}
                              </span>
                            </td>
                            <td>{euro(g.entrate)}</td>
                            <td className={g.netto_finale >= 0 ? 'pos' : 'neg'}>
                              {euro(g.netto_finale)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pillole pagamenti / settlement */}
                  {partita.settlements.length > 0 && (
                    <div className="pay-cell-wrap">
                      <div className="pay-cell">
                        {partita.settlements.map((s, idx) => (
                          <button
                            key={idx}
                            className={`pay-pill debt${s.pagato ? ' paid' : ''}`}
                            onClick={() => toggleSettlementPaid(lega!.id, partita.id, idx)}
                          >
                            {getNome(lega, s.from)} → {getNome(lega, s.to)} {euro(s.amount)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
