import { useState } from 'react';
import { useStore, selectCurrentLega } from '../../store/useStore';
import { vociStorico } from '../../utils/storico';
import StoricoLista from './StoricoLista';
import FiltroNome from '../classifica/FiltroNome';

/* STORICO POKER dedicato (#4.7b) — `/leghe/:id/poker/storico`.
   Stesse card di prima (StoricoLista, kind 'poker') alimentate da
   vociStorico col giocoId 'poker' e il RANGE data esistente. Mantiene il
   filtro per data e aggiunge il filtro nome (secco). Niente regressione. */
export default function TabStorico() {
  const lega           = useStore(selectCurrentLega);
  const storicoFrom    = useStore(s => s.storicoFrom);
  const storicoTo      = useStore(s => s.storicoTo);
  const setStoricoFrom = useStore(s => s.setStoricoFrom);
  const setStoricoTo   = useStore(s => s.setStoricoTo);
  const [query, setQuery] = useState('');

  if (!lega) return null;

  const voci = vociStorico(lega, {
    giocoId: 'poker',
    range: { from: storicoFrom || undefined, to: storicoTo || undefined },
  });

  function resetFiltri() {
    setStoricoFrom('');
    setStoricoTo('');
  }

  return (
    <div className="tab-content">

      {/* Barra filtro date (poker, invariata) */}
      <div className="date-filter-bar">
        <label>Dal</label>
        <input type="date" value={storicoFrom} onChange={e => setStoricoFrom(e.target.value)} />
        <label>Al</label>
        <input type="date" value={storicoTo} onChange={e => setStoricoTo(e.target.value)} />
        {(storicoFrom || storicoTo) && (
          <button className="btn-reset" onClick={resetFiltri}>Reset</button>
        )}
      </div>

      {voci.length > 0 && <FiltroNome value={query} onChange={setQuery} />}
      <StoricoLista lega={lega} voci={voci} query={query} />
    </div>
  );
}
