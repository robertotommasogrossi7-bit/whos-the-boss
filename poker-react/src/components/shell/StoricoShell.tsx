import { useStore } from '../../store/useStore';
import { IconHistory } from '../icons';
import { EmptyState } from '../ui';
import StoricoSessioni from '../gioco/StoricoSessioni';
import GameBar from './GameBar';

/* STORICO (ambito Personale, filtrato dalla GameBar) — MULTIGIOCO_SPEC §5.
   Mostra le sessioni concluse del gioco selezionato sui guest del Personale.
   I filtri per ambito (Lega/Generale) arrivano in M4; il poker ha il suo. */
export default function StoricoShell() {
  const giocoFiltro = useStore(s => s.giocoFiltro);
  const personale   = useStore(s => s.db.leghe.find(l => l.personale));

  return (
    <>
      <GameBar />
      {giocoFiltro === 'poker' ? (
        <div className="tab-content">
          <EmptyState
            icon={<IconHistory size={48} />}
            title="Storico del poker"
            hint="Lo storico delle serate di poker è nella sua schermata dedicata."
          />
        </div>
      ) : personale ? (
        <StoricoSessioni legaId={personale.id} giocoId={giocoFiltro} />
      ) : (
        <div className="tab-content">
          <EmptyState icon={<IconHistory size={48} />} title="Storico in arrivo" />
        </div>
      )}
    </>
  );
}
