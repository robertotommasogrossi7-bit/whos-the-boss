import { IconHistory } from '../icons';
import { EmptyState } from '../ui';

/* STORICO (filtrabile) — MULTIGIOCO_SPEC §5.
   In M2 è un GUSCIO: lo storico reale di sessioni/partite arriva con
   il flusso "segna partita". La GameBar viene aggiunta in M2b. */
export default function StoricoShell() {
  return (
    <div className="tab-content">
      <EmptyState
        icon={<IconHistory size={48} />}
        title="Storico in arrivo"
        hint="Qui rivedrai le sessioni e le partite giocate, con date, partecipanti ed esiti."
      />
    </div>
  );
}
