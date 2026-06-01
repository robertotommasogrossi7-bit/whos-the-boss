import { IconTrophy } from '../icons';
import { EmptyState } from '../ui';
import GameBar from './GameBar';

/* CLASSIFICA (globale, filtrabile) — MULTIGIOCO_SPEC §5/§8.
   In M2 è un GUSCIO: le classifiche reali (per gioco/ambito/persona)
   arrivano in M4. In cima la GameBar. */
export default function ClassificaShell() {
  return (
    <>
      <GameBar />
      <div className="tab-content">
        <EmptyState
          icon={<IconTrophy size={48} />}
          title="Classifiche in arrivo"
          hint="Qui vedrai chi vince, per gioco e per ambito (Personale / Lega / Generale). Arriva con le classifiche multigioco."
        />
      </div>
    </>
  );
}
