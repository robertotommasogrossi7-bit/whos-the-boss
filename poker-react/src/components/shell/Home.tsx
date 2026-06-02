import { GameIcon } from '../icons';
import { EmptyState } from '../ui';
import GameBar from './GameBar';

/* HOME — "Segna partita" (ambito Personale). MULTIGIOCO_SPEC §5.
   In M2 è un GUSCIO: il flusso vero (crea sessione, segna partite)
   arriva in M3. In cima la GameBar (ri-tema l'app). */
export default function Home() {
  return (
    <>
      <GameBar />
      <div className="tab-content">
        <EmptyState
          icon={<GameIcon icona="mazzo" size={48} />}
          title="Segna le tue partite"
          hint="Qui aprirai una sessione e segnerai le partite con i tuoi amici. In arrivo nel prossimo aggiornamento."
        />
      </div>
    </>
  );
}
