import { IconTrophy } from '../icons';
import { EmptyState } from '../ui';

/* CLASSIFICA (globale, filtrabile) — MULTIGIOCO_SPEC §5/§8.
   In M2 è un GUSCIO: le classifiche reali (per gioco/ambito/persona)
   arrivano in M4. La GameBar viene aggiunta in M2b. */
export default function ClassificaShell() {
  return (
    <div className="tab-content">
      <EmptyState
        icon={<IconTrophy size={48} />}
        title="Classifiche in arrivo"
        hint="Qui vedrai chi vince, per gioco e per ambito (Personale / Lega / Generale). Arriva con le classifiche multigioco."
      />
    </div>
  );
}
