import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { vociStorico } from '../../utils/storico';
import { IconHistory, IconChevronRight } from '../icons';
import { EmptyState } from '../ui';
import GameBar from './GameBar';
import StoricoLista from '../storico/StoricoLista';
import FiltroNome from '../classifica/FiltroNome';

/* STORICO globale / Personale (#4.7b) — scheda "Storico" della shell.
   Filtrato dalla GameBar (giocoFiltro), sul componente condiviso StoricoLista.
   Poker INLINE (niente più EmptyState di solo-rimando): vociStorico del
   Personale per il gioco selezionato. Per il poker, link rapido alla
   schermata poker dedicata della lega Personale (il redirect "piace", (d)). */
export default function StoricoShell() {
  const giocoFiltro = useStore(s => s.giocoFiltro);
  const personale   = useStore(s => s.db.leghe.find(l => l.personale));
  const [query, setQuery] = useState('');

  if (!personale) {
    return (
      <>
        <GameBar />
        <div className="tab-content">
          <EmptyState icon={<IconHistory size={48} />} title="Storico in arrivo" />
        </div>
      </>
    );
  }

  const isPoker = giocoFiltro === 'poker';
  const voci    = vociStorico(personale, { giocoId: giocoFiltro });

  return (
    <>
      <GameBar />
      <div className="tab-content">
        {isPoker && (
          <Link to={`/leghe/${personale.id}/poker/storico`} className="cla-link-poker">
            Apri schermata Poker <IconChevronRight size={16} />
          </Link>
        )}
        {(voci.length > 0 || query.trim()) && <FiltroNome value={query} onChange={setQuery} />}
        <StoricoLista lega={personale} voci={voci} query={query} />
      </div>
    </>
  );
}
