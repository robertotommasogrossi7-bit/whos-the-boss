import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { classificaUnificata, resolveGiocoLega } from '@poker/core';
import { GIOCHI_PREIMPOSTATI } from '@poker/core';
import { GameIcon, IconTrophy, IconChevronRight } from '../icons';
import { EmptyState } from '../ui';
import ClassificaTable from '../classifica/ClassificaTable';
import FiltroNome from '../classifica/FiltroNome';

/* CLASSIFICA di LEGA (#4.7a) — scheda Classifica della sezione lega, sul
   componente condiviso ClassificaTable (#4.6 data-layer). Il selettore gioco
   ora INCLUDE il poker (se la lega ha partite): switch gioco↔poker cambia le
   colonne. Filtro nome (match in cima). Per il poker, oltre ai dati inline,
   un link rapido alla schermata poker dedicata (il redirect "piace", (d)). */
export default function LegaClassifica() {
  const { legaId } = useParams<{ legaId: string }>();
  const idNum      = Number(legaId);
  const lega       = useStore(s => s.db.leghe.find(l => l.id === idNum));
  const [selId, setSelId] = useState<string>('');
  const [query, setQuery] = useState('');

  if (!lega) return <Navigate to="/leghe" replace />;

  const icona   = (id: string) => GIOCHI_PREIMPOSTATI.find(g => g.id === id)?.icona ?? 'mazzo';
  const nomeCat = (id: string) => GIOCHI_PREIMPOSTATI.find(g => g.id === id)?.nome  ?? id;

  /* Opzioni del selettore: poker (se ci sono partite) + giochi con sessioni chiuse. */
  const sessChiuse = (lega.sessioniGioco ?? []).filter(s => s.stato === 'chiusa');
  const giochiIds  = [...new Set(sessChiuse.map(s => s.giocoId))].filter(id => id !== 'poker');
  const opzioni = [
    ...(lega.partite.length > 0 ? [{ id: 'poker', nome: nomeCat('poker') }] : []),
    ...giochiIds.flatMap(id => {
      const g = resolveGiocoLega(id, lega);
      return g ? [{ id, nome: g.nome }] : [];
    }),
  ];

  /* ── Nessun gioco né poker ── */
  if (opzioni.length === 0) {
    return (
      <div className="tab-content">
        <EmptyState
          icon={<IconTrophy size={48} />}
          title="Nessuna partita giocata"
          hint="Gioca alcune partite (o serate di poker) e chiudile: qui comparirà la classifica."
        />
      </div>
    );
  }

  const giocoAttivoId = (selId && opzioni.some(o => o.id === selId)) ? selId : opzioni[0]!.id;
  const isPoker       = giocoAttivoId === 'poker';
  const nomeAttivo    = opzioni.find(o => o.id === giocoAttivoId)?.nome ?? 'questo gioco';

  const classifica = classificaUnificata(lega, giocoAttivoId);
  const haDati = classifica.righe.some(r =>
    r.kpi.tipo === 'soldi' ? r.kpi.partiteGiocate > 0 : r.kpi.stats.partiteGiocate > 0,
  );

  return (
    <div className="tab-content">

      {/* Selettore gioco (poker incluso) */}
      <div className="cla-gioco-sel">
        {opzioni.map(o => (
          <button
            key={o.id}
            className={`cla-gioco-pill${o.id === giocoAttivoId ? ' selected' : ''}`}
            onClick={() => { setSelId(o.id); setQuery(''); }}
          >
            <span className="cla-gioco-pill-ico"><GameIcon icona={icona(o.id)} size={16} /></span>
            {o.nome}
          </button>
        ))}
      </div>

      {/* Poker: link rapido alla schermata dedicata (oltre ai dati inline) */}
      {isPoker && (
        <Link to={`/leghe/${lega.id}/poker/classifica`} className="cla-link-poker">
          Apri schermata Poker <IconChevronRight size={16} />
        </Link>
      )}

      {!haDati ? (
        <EmptyState
          icon={<IconTrophy size={44} />}
          title={`Nessuna partita a ${nomeAttivo}`}
          hint="Gioca e chiudi qualche partita per vedere la classifica."
        />
      ) : (
        <>
          <FiltroNome value={query} onChange={setQuery} />
          <ClassificaTable classifica={classifica} query={query} />
        </>
      )}
    </div>
  );
}
