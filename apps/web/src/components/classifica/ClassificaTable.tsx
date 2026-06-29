import { euro } from '@whos-the-boss/core';
import { ordinaMatchInCima, rigaMatchaNome, type ClassificaU, type RigaClassificaU } from '@whos-the-boss/core';
import { Avatar } from '../ui';
import { IconCrown } from '../icons';

/* ══════════════════════════════════════════════════════
   TABELLA CLASSIFICA CONDIVISA (#4.7a)
   UN solo componente per TUTTI i contesti (Personale / lega / poker),
   colonne PARAMETRICHE sul tipo della ClassificaU (#4.6):
   - 'soldi' (poker):  # | Giocatore | Part. | Vitt. | % | Netto
   - 'punti' (giochi): # | Giocatore | % vinte | Sess.
   Solo presentazione: i dati e l'ordine arrivano già pronti dal layer-dati.
   Filtro nome (#4.6 ordinaMatchInCima): porta i match in cima SENZA nasconderli
   e SENZA falsare il numero di posizione (il # resta il rank reale per KPI).
══════════════════════════════════════════════════════ */

interface Props {
  classifica: ClassificaU;
  query?: string;
}

/** Una riga ha "giocato" qualcosa? (per stingere le righe a zero) */
function rigaHaDati(r: RigaClassificaU): boolean {
  return r.kpi.tipo === 'soldi'
    ? r.kpi.partiteGiocate > 0
    : r.kpi.stats.partiteGiocate > 0;
}

export default function ClassificaTable({ classifica, query = '' }: Props) {
  const { tipo, righe } = classifica;
  const soldi = tipo === 'soldi';

  // Rank REALE = posizione nell'ordine per KPI (prima del match-in-cima).
  const rankById = new Map<number, number>();
  righe.forEach((r, i) => rankById.set(r.idNome, i + 1));

  // Display order: match in cima (non nasconde nessuno). Query vuota → invariato.
  const ordinate = ordinaMatchInCima(righe, query);
  const haQuery  = query.trim().length > 0;

  return (
    <div className={`cla-table${soldi ? ' cla-table--soldi' : ''}`}>
      <div className="cla-thead">
        <span className="cla-th-pos">#</span>
        <span className="cla-th-nome">Giocatore</span>
        {soldi ? (
          <>
            <span className="cla-th-num">Part.</span>
            <span className="cla-th-num">Vitt.</span>
            <span className="cla-th-num">%</span>
            <span className="cla-th-num">Netto</span>
          </>
        ) : (
          <>
            <span className="cla-th-num">% vinte</span>
            <span className="cla-th-num">Sess.</span>
          </>
        )}
      </div>

      {ordinate.map(r => (
        <div
          key={r.idNome}
          className={[
            'cla-row',
            r.isLeader     ? 'cla-row--leader' : '',
            !rigaHaDati(r) ? 'cla-row--zero'   : '',
            haQuery && rigaMatchaNome(r, query) ? 'cla-row--match' : '',
          ].filter(Boolean).join(' ')}
        >
          <div className="cla-pos">{rankById.get(r.idNome)}</div>
          <div className="cla-player">
            {r.isLeader
              ? <span className="cla-crown"><IconCrown size={14} /></span>
              : <span className="cla-crown-placeholder" />}
            <Avatar nome={r.nome} size="sm" />
            <span className="cla-nome">{r.nome}</span>
          </div>

          {r.kpi.tipo === 'soldi' ? (
            <>
              <div className="cla-num">{r.kpi.partiteGiocate}</div>
              <div className="cla-num">{r.kpi.partiteVinte}</div>
              <div className="cla-num">{r.kpi.partiteGiocate > 0 ? `${r.kpi.percVittorie}%` : '—'}</div>
              <div className={`cla-num ${r.kpi.netto >= 0 ? 'pos' : 'neg'}`}>{euro(r.kpi.netto)}</div>
            </>
          ) : (
            <>
              <div className="cla-num">{r.kpi.stats.partiteGiocate > 0 ? `${r.kpi.stats.percVittorie}%` : '—'}</div>
              <div className="cla-num">{r.kpi.stats.partiteGiocate > 0 ? r.kpi.stats.sessioniVinte : '—'}</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
