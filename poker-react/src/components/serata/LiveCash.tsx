import { useStore, selectCurrentLega } from '../../store/useStore';
import { fmtData, euro } from '../../utils/format';
import SubGiocatoriCash from './SubGiocatoriCash';
import SubAttivi        from './SubAttivi';

/* ══════════════════════════════════════════════════════
   LIVE VIEW — CASH GAME
   Derivato da renderLiveHtml() + renderLiveTorneoHtml() in session-cash.js
══════════════════════════════════════════════════════ */
export default function LiveCash() {
  const lega            = useStore(selectCurrentLega);
  const liveSubTab      = useStore(s => s.liveSubTab);
  const setLiveSubTab   = useStore(s => s.setLiveSubTab);
  const annullaSessione = useStore(s => s.annullaSessione);
  const apriChiusura    = useStore(s => s.apriChiusura);

  if (!lega?.sessioneAttiva) return null;
  const sess = lega.sessioneAttiva;

  const meta = [
    sess.ora_inizio ? `Inizio ${sess.ora_inizio}` : '',
    sess.ora_fine   ? `Fine ${sess.ora_fine}`     : '',
    sess.buy_in     ? `Buy-in €${euro(sess.buy_in)}` : '',
  ].filter(Boolean).join(' · ');

  const tot    = sess.giocatori.length;
  const attivi = sess.giocatori.filter(g => g.entrato).length;

  const subTab = liveSubTab === 'attivi' ? 'attivi' : 'giocatori';

  return (
    <div className="tab-content">
      {/* Header sommario */}
      <div className="live-summary">
        <div className="ls-row1">
          <span className="ls-data">{fmtData(sess.data)}</span>
          <span className="ls-mod">💰 Cash Game</span>
        </div>
        <div className="ls-meta">{meta || '—'}</div>
      </div>

      {/* Sub-tabs */}
      <div className="live-subtabs">
        <button
          className={`live-subtab${subTab === 'giocatori' ? ' active' : ''}`}
          onClick={() => setLiveSubTab('giocatori')}
        >
          👥 Giocatori <span className="count">{tot}</span>
        </button>
        <button
          className={`live-subtab${subTab === 'attivi' ? ' active' : ''}`}
          onClick={() => setLiveSubTab('attivi')}
        >
          ♠ Attivi <span className="count">{attivi}</span>
        </button>
      </div>

      {/* Contenuto sub-tab */}
      {subTab === 'giocatori' ? <SubGiocatoriCash /> : <SubAttivi />}

      {/* Bottom bar */}
      <div className="session-end-bar">
        <button
          className="btn btn-green btn-block"
          onClick={() => apriChiusura(lega.id)}
        >
          ✓ Chiudi serata
        </button>
        <button
          className="btn btn-gray btn-block"
          onClick={() => annullaSessione(lega.id)}
        >
          ✕ Annulla serata
        </button>
      </div>
      <div className="spacer-16" />
    </div>
  );
}
