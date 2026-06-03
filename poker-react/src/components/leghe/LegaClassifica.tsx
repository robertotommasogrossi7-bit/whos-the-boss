import { IconTrophy } from '../icons';
import { EmptyState } from '../ui';

/* CLASSIFICA della lega (M3) — GUSCIO: le classifiche reali (per gioco e
   per ambito) arrivano in M4. Tenuta come scheda per completare la nav. */
export default function LegaClassifica() {
  return (
    <div className="tab-content">
      <EmptyState
        icon={<IconTrophy size={48} />}
        title="Classifica di lega in arrivo"
        hint="Qui vedrai chi guida la lega, per gioco. Arriva con le classifiche multigioco."
      />
    </div>
  );
}
