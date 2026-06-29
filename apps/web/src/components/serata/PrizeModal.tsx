import { useStore, selectCurrentLega } from '../../store/useStore';
import { euro, getNome } from '@whos-the-boss/core';
import { IconTrophy, IconCoins } from '../icons';

/* ══════════════════════════════════════════════════════
   MODALE PREMIO — eliminazione in zona premi
   Derivato da showPrizeModal/confirmaPremio in session-premi.js
══════════════════════════════════════════════════════ */
export default function PrizeModal() {
  const lega              = useStore(selectCurrentLega);
  const pendingPrizeNome  = useStore(s => s.pendingPrizeNome);
  const confirmaPremio    = useStore(s => s.confirmaPremio);

  if (!lega?.sessioneAttiva || pendingPrizeNome == null) return null;

  const sess   = lega.sessioneAttiva;
  const nome   = getNome(lega, pendingPrizeNome);
  const g      = sess.giocatori.find(x => x.id_nome === pendingPrizeNome);
  const pos    = g?.posizione_finale ?? 0;
  const premio = sess.premi[pos - 1];

  if (!premio) return null;

  const title = pos === 1 ? 'Vincitore!' : 'In the money!';

  return (
    <div className="prize-modal-overlay">
      <div className="prize-modal-inner">
        <div className="prize-modal-emoji">
          {pos === 1 ? <IconTrophy size={50} /> : <IconCoins size={50} />}
        </div>
        <div className="prize-modal-title">{title}</div>
        <div className="prize-modal-pos">{pos}° posto</div>
        <div className="prize-modal-name">{nome}</div>
        <div className="prize-modal-amt">€{euro(premio.importo)}</div>

        <div className="prize-modal-btns">
          <button
            className="btn btn-green"
            onClick={() => confirmaPremio(lega.id, true)}
          >
            Pagato subito
          </button>
          <button
            className="btn btn-gray"
            onClick={() => confirmaPremio(lega.id, false)}
          >
            Da pagare
          </button>
        </div>
      </div>
    </div>
  );
}
