import { useState } from 'react';
import { useStore, selectCurrentLega } from '../../store/useStore';
import { classificaPoker, type ClassificaU } from '@whos-the-boss/core';
import { IconTrophy } from '../icons';
import ClassificaTable from './ClassificaTable';
import FiltroNome from './FiltroNome';

/* CLASSIFICA POKER dedicata (#4.7a) — `/leghe/:id/poker/classifica`.
   Stesso look condiviso (ClassificaTable, tipo 'soldi'), alimentata da
   classificaPoker (#4.6) col RANGE data esistente (filtro per data poker).
   Aggiunge il filtro nome. La logica/colonne sono identiche a quelle inline
   nella lega: un solo componente, niente regressione del poker. */
export default function TabClassifica() {
  const lega              = useStore(selectCurrentLega);
  const classificaFrom    = useStore(s => s.classificaFrom);
  const classificaTo      = useStore(s => s.classificaTo);
  const setClassificaFrom = useStore(s => s.setClassificaFrom);
  const setClassificaTo   = useStore(s => s.setClassificaTo);
  const [query, setQuery] = useState('');

  if (!lega) return null;

  const righe = classificaPoker(lega.partite, lega.nomi, {
    from: classificaFrom || undefined,
    to:   classificaTo   || undefined,
  });
  const classifica: ClassificaU = { tipo: 'soldi', righe };

  function resetFiltri() {
    setClassificaFrom('');
    setClassificaTo('');
  }

  return (
    <div className="tab-content">

      {/* Barra filtro date (poker, invariata) */}
      <div className="date-filter-bar">
        <label>Dal</label>
        <input type="date" value={classificaFrom} onChange={e => setClassificaFrom(e.target.value)} />
        <label>Al</label>
        <input type="date" value={classificaTo} onChange={e => setClassificaTo(e.target.value)} />
        {(classificaFrom || classificaTo) && (
          <button className="btn-reset" onClick={resetFiltri}>Reset</button>
        )}
      </div>

      {righe.length === 0 ? (
        <div className="empty">
          <div className="eico"><IconTrophy size={46} /></div>
          <p>Nessuna partita nel periodo selezionato.</p>
        </div>
      ) : (
        <>
          <FiltroNome value={query} onChange={setQuery} />
          <ClassificaTable classifica={classifica} query={query} />
        </>
      )}

      <p className="classifica-nota">
        Classifica per netto totale.
        {(!classificaFrom && !classificaTo) && ' Tutte le partite della lega.'}
      </p>
    </div>
  );
}
