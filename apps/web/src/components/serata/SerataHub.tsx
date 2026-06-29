import { useStore, selectCurrentLega } from '../../store/useStore';
import { fmtData, euro } from '@whos-the-boss/core';
import { IconPlus, GameIcon, IconLiveDot } from '../icons';

export default function SerataHub() {
  const lega              = useStore(selectCurrentLega);
  const setSerataView     = useStore(s => s.setSerataView);
  const setSetupModalita  = useStore(s => s.setSetupModalita);
  const clearSetupPartIds = useStore(s => s.clearSetupPartIds);
  const apriSerataAttiva  = useStore(s => s.apriSerataAttiva);
  const openOverlay       = useStore(s => s.openOverlay);

  if (!lega) return null;

  /* Tutte le sessioni visibili: attiva (bgIdx=-1) + background */
  const tutte: { s: (typeof lega)['sessioneAttiva'] & {}; bgIdx: number }[] = [];
  if (lega.sessioneAttiva) tutte.push({ s: lega.sessioneAttiva, bgIdx: -1 });
  (lega.serate_bg ?? []).forEach((s, i) => tutte.push({ s, bgIdx: i }));

  function vaiSetupSerata() {
    clearSetupPartIds();
    setSetupModalita('cash');
    setSerataView('setup');
    openOverlay();
  }

  return (
    <div className="tab-content">
      {/* Hero nuova serata */}
      <div className="hero-card" onClick={vaiSetupSerata}>
        <div className="h-ico"><IconPlus size={26} /></div>
        <div className="h-text">
          <h3>Nuova serata</h3>
          <p>Cash game o torneo</p>
        </div>
      </div>

      {tutte.length === 0 ? (
        <div className="empty">
          <div className="eico"><GameIcon icona="picche" size={48} /></div>
          <p>Nessuna serata in corso</p>
        </div>
      ) : (
        tutte.map(({ s, bgIdx }) => {
          const tipo  = s.modalita === 'torneo' ? 'Torneo' : 'Cash';
          const nEnt  = (s.giocatori ?? []).filter(g => g.entrato).length;
          const stato = s.stato === 'attivo' ? ' · In corso'
                      : s.stato === 'pausa'  ? ' · In pausa' : '';
          return (
            <div
              key={bgIdx}
              className="serata-attiva-card"
              onClick={() => apriSerataAttiva(lega.id, bgIdx)}
            >
              <div className="sac-dot"><IconLiveDot size={14} className="dot-live" /></div>
              <div className="sac-info">
                <h3>{tipo} · {fmtData(s.data ?? '')}</h3>
                <p>{nEnt} giocatori · Buy-in €{euro(s.buy_in ?? 0)}{stato}</p>
              </div>
              <div className="sac-arrow">›</div>
            </div>
          );
        })
      )}
    </div>
  );
}
