import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { euroSigned } from '../../utils/format';
import type { Lega } from '../../types';

export default function ListaLeghe() {
  const navigate = useNavigate();
  const leghe    = useStore(s => s.db.leghe);
  const utente   = useStore(s => s.utente);
  const setCurrentLega = useStore(s => s.setCurrentLega);

  function vaiAllaLega(legaId: number) {
    setCurrentLega(legaId);
    navigate(`/app/${legaId}`);
  }

  function statsUtente(lega: Lega) {
    const usernameLC = utente?.username?.toLowerCase() ?? '';
    if (!usernameLC) return { rendimento: 0, vittorie: 0 };
    const meId = lega.nomi.find(n => n.nome.toLowerCase() === usernameLC)?.id;
    if (meId === undefined) return { rendimento: 0, vittorie: 0 };
    let rendimento = 0;
    let vittorie   = 0;
    lega.partite.forEach(p => {
      const g = p.giocatori.find(x => x.id_nome === meId);
      if (g) {
        rendimento += g.netto_finale ?? 0;
        if (g.vincitore) vittorie++;
      }
    });
    return { rendimento, vittorie };
  }

  if (!leghe.length) {
    return (
      <>
        <header className="app-header">
          <button className="hdr-back" onClick={() => navigate('/circoli')}>‹</button>
          <div className="hdr-center"><h1>Le tue leghe</h1></div>
          <div className="hdr-right" />
        </header>
        <div className="screen-body">
          <div className="empty">
            <div className="eico">🏆</div>
            <p>Non sei ancora in nessuna lega.<br />Creane una nuova!</p>
          </div>
          <button
            className="btn btn-green btn-block"
            onClick={() => navigate('/nuova-lega')}
          >
            + Crea la tua prima lega
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="app-header">
        <button className="hdr-back" onClick={() => navigate('/circoli')}>‹</button>
        <div className="hdr-center"><h1>Le tue leghe</h1></div>
        <div className="hdr-right" />
      </header>

      <div className="screen-body">
        {leghe.map(lega => {
          const np = lega.nomi.length;
          const ng = lega.partite.length;
          const { rendimento, vittorie } = statsUtente(lega);
          const rendCls = rendimento > 0 ? 'pos' : rendimento < 0 ? 'neg' : 'neu';
          const preview = lega.nomi.slice(0, 3).map(n => n.nome).join(', ') +
            (lega.nomi.length > 3 ? `, +${lega.nomi.length - 3}` : '');

          return (
            <div
              key={lega.id}
              className="lega-item"
              onClick={() => vaiAllaLega(lega.id)}
            >
              <div className="lega-item-head">
                <div className="lega-foto">
                  {lega.foto
                    ? <img src={lega.foto} alt={lega.nome} />
                    : '♠'}
                </div>
                <div className="lega-info">
                  <div className="lega-name">{lega.nome}</div>
                  <div className="lega-meta">
                    {np} partecipanti · {preview || '—'}
                  </div>
                </div>
                <div className="lega-arrow">›</div>
              </div>
              <div className="lega-stats">
                <div className="lega-stat">
                  <div className="lst-label">Serate</div>
                  <div className="lst-val">{ng}</div>
                </div>
                <div className="lega-stat">
                  <div className="lst-label">Vittorie tue</div>
                  <div className="lst-val">{vittorie}</div>
                </div>
                <div className="lega-stat">
                  <div className="lst-label">Tuo netto</div>
                  <div className={`lst-val ${rendCls}`}>{euroSigned(rendimento)}</div>
                </div>
              </div>
            </div>
          );
        })}

        <button
          className="btn btn-outline btn-block"
          onClick={() => navigate('/nuova-lega')}
        >
          + Nuova lega
        </button>
      </div>
    </>
  );
}
