import { euro } from '../../utils/format';
import type { ClassificaU, RigaClassificaU } from '../../utils/classifiche';
import { Avatar } from '../ui';
import { IconCrown } from '../icons';

/* ══════════════════════════════════════════════════════
   TABELLA CLASSIFICA CONDIVISA (#4.7a)
   UN solo componente per TUTTI i contesti (Personale / lega / poker),
   colonne PARAMETRICHE sul tipo della ClassificaU (#4.6):
   - 'soldi' (poker):  # | Giocatore | Part. | Vitt. | % | Netto
   - 'punti' (giochi): # | Giocatore | % vinte | Sess.
   Solo presentazione: i dati e l'ordine arrivano già pronti dal layer-dati.
══════════════════════════════════════════════════════ */

interface Props {
  classifica: ClassificaU;
}

/** Una riga ha "giocato" qualcosa? (per stingere le righe a zero) */
function rigaHaDati(r: RigaClassificaU): boolean {
  return r.kpi.tipo === 'soldi'
    ? r.kpi.partiteGiocate > 0
    : r.kpi.stats.partiteGiocate > 0;
}

export default function ClassificaTable({ classifica }: Props) {
  const { tipo, righe } = classifica;
  const soldi = tipo === 'soldi';

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

      {righe.map((r, i) => (
        <div
          key={r.idNome}
          className={[
            'cla-row',
            r.isLeader     ? 'cla-row--leader' : '',
            !rigaHaDati(r) ? 'cla-row--zero'   : '',
          ].filter(Boolean).join(' ')}
        >
          <div className="cla-pos">{i + 1}</div>
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
