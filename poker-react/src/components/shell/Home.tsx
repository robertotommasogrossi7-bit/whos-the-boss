import { GameIcon } from '../icons';
import { EmptyState } from '../ui';

/* HOME — "Segna partita" (ambito Personale). MULTIGIOCO_SPEC §5.
   In M2 è un GUSCIO: il flusso vero (crea sessione, segna partite)
   arriva in M3. La GameBar viene aggiunta in M2b. */
export default function Home() {
  return (
    <div className="tab-content">
      <EmptyState
        icon={<GameIcon icona="mazzo" size={48} />}
        title="Segna le tue partite"
        hint="Qui aprirai una sessione e segnerai le partite con i tuoi amici. In arrivo nel prossimo aggiornamento."
      />
    </div>
  );
}
