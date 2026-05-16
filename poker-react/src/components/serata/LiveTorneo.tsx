import { useStore, selectCurrentLega } from '../../store/useStore';
import { fmtData, euro } from '../../utils/format';
import SubOrologio          from './SubOrologio';
import SubGiocatoriTorneo   from './SubGiocatoriTorneo';
import SubPremi             from './SubPremi';
import PrizeModal           from './PrizeModal';

/* ══════════════════════════════════════════════════════
   LIVE VIEW — TORNEO
   Derivato da renderLiveTorneoHtml() in session-tournament.js
══════════════════════════════════════════════════════ */
export default function LiveTorneo() {
  const lega            = useStore(selectCurrentLega);
  const liveSubTab      = useStore(s => s.liveSubTab);
  const setLiveSubTab   = useStore(s => s.setLiveSubTab);
  const setSerataView   = useStore(s => s.setSerataView);
  const annullaSessione = useStore(s => s.annullaSessione);

  if (!lega?.sessioneAttiva) return null;
  const sess = lega.sessioneAttiva;

  // Forza sub-tab valido per torneo
  const subTab: 'orologio' | 'giocatori' | 'premi' =
    (liveSubTab === 'orologio' || liveSubTab === 'giocatori' || liveSubTab === 'premi')
      ? liveSubTab
      : 'orologio';

  const meta = [
    sess.ora_inizio    ? `Inizio ${sess.ora_inizio}` : '',
    sess.buy_in        ? `Buy-in €${euro(sess.buy_in)}` : '',
    sess.fiche_iniziali ? `${sess.fiche_iniziali.toLocaleString('it-IT')} fiche` : '',
  ].filter(Boolean).join(' · ');

  const vivi       = sess.giocatori.filter(g => g.entrato && !g.eliminato).length;
  const totEntrati = sess.giocatori.filter(g => g.entrato).length;
  const totGioc    = sess.giocatori.length;

  return (
    <div className="tab-content">
      {/* Back button */}
      <button
        className="btn btn-gray btn-sm btn-back-serata"
        onClick={() => setSerataView('hub')}
      >
        ‹ Tutte le serate
      </button>

      {/* Header sommario */}
      <div className="live-summary">
        <div className="ls-row1">
          <span className="ls-data">{fmtData(sess.data)}</span>
          <span className="ls-mod">🏆 Torneo</span>
        </div>
        <div className="ls-meta">{meta || '—'}</div>
      </div>

      {/* Sub-tabs */}
      <div className="live-subtabs">
        <button
          className={`live-subtab${subTab === 'orologio' ? ' active' : ''}`}
          onClick={() => setLiveSubTab('orologio')}
        >
          🕐 Orologio
        </button>
        <button
          className={`live-subtab${subTab === 'giocatori' ? ' active' : ''}`}
          onClick={() => setLiveSubTab('giocatori')}
        >
          👥 Player{' '}
          <span className="count">{vivi}/{totEntrati || totGioc}</span>
        </button>
        <button
          className={`live-subtab${subTab === 'premi' ? ' active' : ''}`}
          onClick={() => setLiveSubTab('premi')}
        >
          💰 Premi
        </button>
      </div>

      {/* Contenuto sub-tab */}
      {subTab === 'orologio'  && <SubOrologio />}
      {subTab === 'giocatori' && <SubGiocatoriTorneo />}
      {subTab === 'premi'     && <SubPremi />}

      {/* Bottom bar */}
      <div className="session-end-bar">
        <button
          className="btn btn-green btn-block"
          onClick={() => { window.alert('Chiusura serata — disponibile nella Fase 6'); }}
        >
          ✓ Chiudi serata
        </button>
        <button
          className="btn btn-gray btn-block"
          onClick={() => annullaSessione(lega.id)}
        >
          ✕ Annulla torneo
        </button>
      </div>
      <div className="spacer-16" />

      {/* Modale premio */}
      <PrizeModal />
    </div>
  );
}
