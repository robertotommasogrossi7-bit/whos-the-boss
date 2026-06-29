import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { vociStorico } from '@whos-the-boss/core';
import { GIOCHI_PREIMPOSTATI } from '@whos-the-boss/core';
import { GameIcon } from '../icons';
import StoricoLista from '../storico/StoricoLista';
import FiltroNome from '../classifica/FiltroNome';

/* STORICO della lega (#4.7b) — sul componente condiviso StoricoLista.
   Aggiunge il SELETTORE GIOCO (Tutti / Poker / giochi con sessioni chiuse) —
   colma la lacuna (d) — e porta il poker INLINE nello storico di lega.
   "Tutti" mescola poker e giochi per data (vociStorico senza giocoId). */
export default function LegaStorico() {
  const { legaId } = useParams<{ legaId: string }>();
  const idNum      = Number(legaId);
  const lega       = useStore(s => s.db.leghe.find(l => l.id === idNum));
  const [selId, setSelId] = useState<string>(''); // '' = Tutti
  const [query, setQuery] = useState('');

  if (!lega) return <Navigate to="/leghe" replace />;

  const icona     = (id: string) => GIOCHI_PREIMPOSTATI.find(g => g.id === id)?.icona ?? 'mazzo';
  const nomeGioco = (id: string) =>
    GIOCHI_PREIMPOSTATI.find(g => g.id === id)?.nome
    ?? lega.giochi?.find(g => g.id === id)?.nome
    ?? 'Gioco';

  /* Opzioni: Tutti + Poker (se partite) + giochi con sessioni chiuse. */
  const sessChiuse = (lega.sessioniGioco ?? []).filter(s => s.stato === 'chiusa');
  const giochiIds  = [...new Set(sessChiuse.map(s => s.giocoId))].filter(id => id !== 'poker');
  const opzioni: Array<{ id: string; nome: string; icona: string | null }> = [
    { id: '', nome: 'Tutti', icona: null },
    ...(lega.partite.length > 0 ? [{ id: 'poker', nome: 'Poker', icona: icona('poker') }] : []),
    ...giochiIds.map(id => ({ id, nome: nomeGioco(id), icona: icona(id) })),
  ];

  const voci = vociStorico(lega, { giocoId: selId || undefined });

  return (
    <div className="tab-content">

      {/* Selettore gioco (solo se c'è qualcosa oltre a "Tutti") */}
      {opzioni.length > 1 && (
        <div className="cla-gioco-sel">
          {opzioni.map(o => (
            <button
              key={o.id || 'tutti'}
              className={`cla-gioco-pill${o.id === selId ? ' selected' : ''}`}
              onClick={() => { setSelId(o.id); setQuery(''); }}
            >
              {o.icona && <span className="cla-gioco-pill-ico"><GameIcon icona={o.icona} size={16} /></span>}
              {o.nome}
            </button>
          ))}
        </div>
      )}

      {voci.length > 0 && <FiltroNome value={query} onChange={setQuery} />}
      <StoricoLista lega={lega} voci={voci} query={query} />
    </div>
  );
}
