import { Toast } from '@/components/ui';
import { useStore } from '@/store/useStore';

/* Toast GLOBALE — aggancia il primitivo presentazionale allo stato dello store
   (toastMsg/toastVisible, con auto-hide gia' gestito da store.toast()). Montato
   una volta nel root: rende visibili TUTTI i get().toast(...) gia' cablati nello
   store condiviso (serata, rebuy, add-on, settlement, sessioni…) — sul mobile
   finora non comparivano perche' il Toast non era montato da nessuna parte. */
export default function GlobalToast() {
  const message = useStore((s) => s.toastMsg);
  const visible = useStore((s) => s.toastVisible);
  return <Toast message={message} visible={visible} />;
}
