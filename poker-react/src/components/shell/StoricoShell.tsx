import { IconHistory } from '../icons';
import { EmptyState } from '../ui';
import GameBar from './GameBar';

/* STORICO (filtrabile) — MULTIGIOCO_SPEC §5.
   In M2 è un GUSCIO: lo storico reale di sessioni/partite arriva con
   il flusso "segna partita". In cima la GameBar. */
export default function StoricoShell() {
  return (
    <>
      <GameBar />
      <div className="tab-content">
        <EmptyState
          icon={<IconHistory size={48} />}
          title="Storico in arrivo"
          hint="Qui rivedrai le sessioni e le partite giocate, con date, partecipanti ed esiti."
        />
      </div>
    </>
  );
}
