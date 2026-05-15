import { useStore, selectCurrentLega } from '../../store/useStore';
import { euro, getNome } from '../../utils/format';

interface StatGiocatore {
  idNome: number;
  partite: number;
  vittorie: number;
  totaleNetto: number;
}

export default function TabClassifica() {
  const lega             = useStore(selectCurrentLega);
  const classificaFrom   = useStore(s => s.classificaFrom);
  const classificaTo     = useStore(s => s.classificaTo);
  const setClassificaFrom = useStore(s => s.setClassificaFrom);
  const setClassificaTo   = useStore(s => s.setClassificaTo);

  if (!lega) return null;

  /* Partite nel range */
  const partiteFiltrate = lega.partite.filter(p => {
    if (classificaFrom && p.data < classificaFrom) return false;
    if (classificaTo   && p.data > classificaTo)   return false;
    return true;
  });

  /* Aggregazione per giocatore */
  const statsMap = new Map<number, StatGiocatore>();
  for (const p of partiteFiltrate) {
    for (const g of p.giocatori) {
      const prev = statsMap.get(g.id_nome) ?? {
        idNome: g.id_nome,
        partite: 0,
        vittorie: 0,
        totaleNetto: 0,
      };
      statsMap.set(g.id_nome, {
        ...prev,
        partite:     prev.partite + 1,
        vittorie:    prev.vittorie + (g.vincitore ? 1 : 0),
        totaleNetto: prev.totaleNetto + g.netto_finale,
      });
    }
  }

  const stats = [...statsMap.values()].sort((a, b) => b.totaleNetto - a.totaleNetto);
  const medaglie = ['🥇', '🥈', '🥉'];

  function resetFiltri() {
    setClassificaFrom('');
    setClassificaTo('');
  }

  return (
    <div className="tab-content">

      {/* Barra filtro date */}
      <div className="date-filter-bar">
        <label>Dal</label>
        <input
          type="date"
          value={classificaFrom}
          onChange={e => setClassificaFrom(e.target.value)}
        />
        <label>Al</label>
        <input
          type="date"
          value={classificaTo}
          onChange={e => setClassificaTo(e.target.value)}
        />
        {(classificaFrom || classificaTo) && (
          <button className="btn-reset" onClick={resetFiltri}>✕ Reset</button>
        )}
      </div>

      {stats.length === 0 ? (
        <div className="empty">
          <div className="eico">🏆</div>
          <p>Nessuna partita nel periodo selezionato.</p>
        </div>
      ) : (
        <div className="card card--flush">
          <div className="tbl-wrap">
            <table className="ranking-tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Giocatore</th>
                  <th>Partite</th>
                  <th>Vitt.</th>
                  <th>Netto</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={s.idNome} className={i < 3 ? `rank-${i + 1}` : ''}>
                    <td>
                      <span className="rank-medal">
                        {medaglie[i] ?? String(i + 1)}
                      </span>
                    </td>
                    <td>{getNome(lega, s.idNome)}</td>
                    <td>{s.partite}</td>
                    <td>{s.vittorie}</td>
                    <td className={s.totaleNetto >= 0 ? 'pos' : 'neg'}>
                      {euro(s.totaleNetto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="classifica-nota">
        Classifica per netto totale.
        {(!classificaFrom && !classificaTo) && ' Tutte le partite della lega.'}
      </p>
    </div>
  );
}
