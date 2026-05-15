import { useStore } from '../../store/useStore';

export default function Toast() {
  const toastMsg     = useStore(s => s.toastMsg);
  const toastVisible = useStore(s => s.toastVisible);

  return (
    <div className={`toast${toastVisible ? ' show' : ''}`}>
      {toastMsg}
    </div>
  );
}
