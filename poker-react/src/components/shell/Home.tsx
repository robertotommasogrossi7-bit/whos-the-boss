import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { GameIcon } from '../icons';
import { Button, EmptyState } from '../ui';
import GameBar from './GameBar';
import SchermataGioco from '../gioco/SchermataGioco';

/* HOME — "Segna partita" (ambito Personale). MULTIGIOCO_SPEC §5.
   In cima la GameBar (ri-tema l'app). Il gioco selezionato apre il flusso
   comune "segna partita" sui guest del Personale; il poker rimanda alla sua
   schermata dedicata. */
export default function Home() {
  const giocoFiltro = useStore(s => s.giocoFiltro);
  const personale   = useStore(s => s.db.leghe.find(l => l.personale));
  const navigate    = useNavigate();

  return (
    <>
      <GameBar />
      {giocoFiltro === 'poker' ? (
        <div className="tab-content">
          <EmptyState
            icon={<GameIcon icona="picche" size={48} />}
            title="Poker"
            hint="Il poker ha la sua schermata dedicata, con soldi, timer e settlement."
            action={personale
              ? <Button onClick={() => navigate(`/leghe/${personale.id}/poker`)}>Apri il Poker</Button>
              : undefined}
          />
        </div>
      ) : personale ? (
        <SchermataGioco legaId={personale.id} giocoId={giocoFiltro} />
      ) : (
        <div className="tab-content">
          <EmptyState title="Un attimo…" hint="Sto preparando il tuo spazio personale." />
        </div>
      )}
    </>
  );
}
