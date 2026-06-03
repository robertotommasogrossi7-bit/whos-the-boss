import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { classificaGioco, resolveGiocoLega } from '../../utils/classifiche';
import { GIOCHI_PREIMPOSTATI } from '../../utils/giochi';
import { GameIcon, IconCrown, IconTrophy } from '../icons';
import { Avatar, EmptyState } from '../ui';

/* CLASSIFICA di LEGA (M4) — scheda Classifica della sezione lega.
   Selettore gioco (solo giochi con sessioni chiuse), standings dei
   giocatori della lega (% vinte, sessioni vinte, corona al leader).
   SPEC §8 + DECISIONI 2026-06-04. Il poker è invariato (TabClassifica). */
export default function LegaClassifica() {
  const { legaId }   = useParams<{ legaId: string }>();
  const idNum        = Number(legaId);
  const lega         = useStore(s => s.db.leghe.find(l => l.id === idNum));
  const [selId, setSelId] = useState<string>('');

  if (!lega) return <Navigate to="/leghe" replace />;

  /* Giochi con almeno una sessione chiusa (no poker) */
  const sessChiuse   = (lega.sessioniGioco ?? []).filter(s => s.stato === 'chiusa');
  const giochiIds    = [...new Set(sessChiuse.map(s => s.giocoId))].filter(id => id !== 'poker');
  const giochi       = giochiIds.flatMap(id => {
    const g = resolveGiocoLega(id, lega);
    return g ? [{ id, g }] : [];
  });

  const giocoAttivoId = selId || (giochi[0]?.id ?? '');
  const giocoAttivo   = giochi.find(x => x.id === giocoAttivoId)?.g ?? null;

  const righe = giocoAttivo
    ? classificaGioco(giocoAttivo, sessChiuse.filter(s => s.giocoId === giocoAttivo.id), lega.nomi)
    : [];

  const icona = (id: string) => GIOCHI_PREIMPOSTATI.find(g => g.id === id)?.icona ?? 'mazzo';

  /* ── Nessun gioco ancora giocato ── */
  if (giochi.length === 0) {
    return (
      <div className="tab-content">
        <EmptyState
          icon={<IconTrophy size={48} />}
          title="Nessuna partita giocata"
          hint="Gioca alcune sessioni e chiudile: qui comparirà la classifica per gioco."
        />
      </div>
    );
  }

  const haPartite = righe.some(r => r.stats.partiteGiocate > 0);

  return (
    <div className="tab-content">

      {/* Selettore gioco */}
      <div className="cla-gioco-sel">
        {giochi.map(({ id, g }) => (
          <button
            key={id}
            className={`cla-gioco-pill${id === giocoAttivoId ? ' selected' : ''}`}
            onClick={() => setSelId(id)}
          >
            <span className="cla-gioco-pill-ico"><GameIcon icona={icona(id)} size={16} /></span>
            {g.nome}
          </button>
        ))}
      </div>

      {/* Standings */}
      {!haPartite ? (
        <EmptyState
          icon={<IconTrophy size={44} />}
          title={`Nessuna partita a ${giocoAttivo?.nome ?? 'questo gioco'}`}
          hint="Gioca e chiudi sessioni per vedere la classifica."
        />
      ) : (
        <div className="cla-table">
          <div className="cla-thead">
            <span className="cla-th-pos">#</span>
            <span className="cla-th-nome">Giocatore</span>
            <span className="cla-th-num">% vinte</span>
            <span className="cla-th-num">Sess.</span>
          </div>

          {righe.map((r, i) => (
            <div
              key={r.idNome}
              className={[
                'cla-row',
                r.isLeader              ? 'cla-row--leader' : '',
                r.stats.partiteGiocate === 0 ? 'cla-row--zero' : '',
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
              <div className="cla-num">
                {r.stats.partiteGiocate > 0 ? `${r.stats.percVittorie}%` : '—'}
              </div>
              <div className="cla-num">
                {r.stats.partiteGiocate > 0 ? r.stats.sessioniVinte : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
