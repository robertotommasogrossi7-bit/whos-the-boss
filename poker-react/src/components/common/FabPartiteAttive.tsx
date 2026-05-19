import { useState } from 'react';
import { useStore, selectCurrentLega } from '../../store/useStore';
import { fmtData, euro } from '../../utils/format';

interface Props { legaId: number; }

export default function FabPartiteAttive({ legaId }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);

  const lega             = useStore(selectCurrentLega);
  const overlayOpen      = useStore(s => s.overlayOpen);
  const apriSerataAttiva = useStore(s => s.apriSerataAttiva);

  /* Nascosto quando l'overlay è già aperto */
  if (overlayOpen || !lega) return null;

  const partite: { bgIdx: number; s: NonNullable<typeof lega.sessioneAttiva> }[] = [];
  if (lega.sessioneAttiva) partite.push({ bgIdx: -1, s: lega.sessioneAttiva });
  (lega.serate_bg ?? []).forEach((s, i) => partite.push({ bgIdx: i, s }));

  if (partite.length === 0) return null;

  function scegli(bgIdx: number) {
    apriSerataAttiva(legaId, bgIdx);
    setPanelOpen(false);
  }

  return (
    <>
      {panelOpen && (
        <div className="fab-partite-panel">
          <div className="fab-partite-panel-title">Partite in corso</div>
          {partite.map(({ bgIdx, s }) => {
            const tipo   = s.modalita === 'torneo' ? '🏆' : '💰';
            const stato  = s.stato === 'attivo' ? '▶' : s.stato === 'pausa' ? '⏸' : '';
            const nEnt   = (s.giocatori ?? []).filter(g => g.entrato).length;
            return (
              <button
                key={bgIdx}
                className="fab-partite-item"
                onClick={() => scegli(bgIdx)}
              >
                <span className="fab-partite-ico">{tipo}</span>
                <div className="fab-partite-info">
                  <div className="fab-partite-row1">
                    {s.modalita === 'torneo' ? 'Torneo' : 'Cash'} · {fmtData(s.data ?? '')}
                    {stato && <span className="fab-partite-stato"> {stato}</span>}
                  </div>
                  <div className="fab-partite-row2">
                    {nEnt} giocatori · €{euro(s.buy_in ?? 0)}
                  </div>
                </div>
                <span className="fab-partite-arrow">›</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        className="fab-partite"
        onClick={() => setPanelOpen(p => !p)}
        title={`${partite.length} partite attive`}
      >
        🃏
        <span className="fab-count">{partite.length}</span>
      </button>
    </>
  );
}
