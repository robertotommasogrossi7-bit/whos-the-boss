import { useStore } from '../../store/useStore';

export default function PartitaOverlay() {
  const overlayOpen  = useStore(s => s.overlayOpen);
  const closeOverlay = useStore(s => s.closeOverlay);

  if (!overlayOpen) return null;

  return (
    <div className="partita-overlay">
      <div className="overlay-topbar">
        <button className="overlay-minimize" onClick={closeOverlay}>
          ‹ Minimizza
        </button>
      </div>
      <div className="overlay-body">
        {/* contenuto — step 2 */}
      </div>
    </div>
  );
}
