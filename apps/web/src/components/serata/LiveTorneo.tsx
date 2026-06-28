import { useStore, selectCurrentLega } from '../../store/useStore';
import { fmtData, euro } from '../../utils/format';
import { useTimer } from '../../hooks/useTimer';
import { IconTrophy, IconClock, IconUsers, IconCoins } from '../icons';
import SubOrologio          from './SubOrologio';
import SubGiocatoriTorneo   from './SubGiocatoriTorneo';
import SubPremi             from './SubPremi';
import PrizeModal           from './PrizeModal';

/* ══════════════════════════════════════════════════════
   LIVE VIEW — TORNEO
   Derivato da renderLiveTorneoHtml() in session-tournament.js
══════════════════════════════════════════════════════ */
export default function LiveTorneo() {
  const lega                  = useStore(selectCurrentLega);
  const liveSubTab            = useStore(s => s.liveSubTab);
  const setLiveSubTab         = useStore(s => s.setLiveSubTab);
  const annullaSessione       = useStore(s => s.annullaSessione);
  const avanzaLivelloAuto     = useStore(s => s.avanzaLivelloAuto);
  const recoveryTorneo        = useStore(s => s.recoveryTorneo);
  const apriChiusuraTorneo    = useStore(s => s.apriChiusuraTorneo);

  const sess = lega?.sessioneAttiva;

  /* Timer gestito qui (non in SubOrologio): così gira su tutti i sub-tab —
     il clock avanza e i livelli si auto-consolidano anche da Player/Premi. */
  const { clockStr } = useTimer(
    sess,
    () => { if (lega) avanzaLivelloAuto(lega.id); },
    () => { if (lega) recoveryTorneo(lega.id); },
  );

  if (!lega || !sess) return null;

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
      {/* Header sommario */}
      <div className="live-summary">
        <div className="ls-row1">
          <span className="ls-data">{fmtData(sess.data)}</span>
          <span className="ls-mod"><IconTrophy size={14} className="ico-inline" /> Torneo</span>
        </div>
        <div className="ls-meta">{meta || '—'}</div>
      </div>

      {/* Sub-tabs */}
      <div className="live-subtabs">
        <button
          className={`live-subtab${subTab === 'orologio' ? ' active' : ''}`}
          onClick={() => setLiveSubTab('orologio')}
        >
          <IconClock size={16} className="ico-inline" /> Orologio
        </button>
        <button
          className={`live-subtab${subTab === 'giocatori' ? ' active' : ''}`}
          onClick={() => setLiveSubTab('giocatori')}
        >
          <IconUsers size={16} className="ico-inline" /> Player{' '}
          <span className="count">{vivi}/{totEntrati || totGioc}</span>
        </button>
        <button
          className={`live-subtab${subTab === 'premi' ? ' active' : ''}`}
          onClick={() => setLiveSubTab('premi')}
        >
          <IconCoins size={16} className="ico-inline" /> Premi
        </button>
      </div>

      {/* Contenuto sub-tab */}
      {subTab === 'orologio'  && <SubOrologio clockStr={clockStr} />}
      {subTab === 'giocatori' && <SubGiocatoriTorneo />}
      {subTab === 'premi'     && <SubPremi />}

      {/* Bottom bar */}
      <div className="session-end-bar">
        <button
          className="btn btn-green btn-block"
          onClick={() => apriChiusuraTorneo(lega.id)}
        >
          Chiudi serata
        </button>
        <button
          className="btn btn-gray btn-block"
          onClick={() => annullaSessione(lega.id)}
        >
          Annulla torneo
        </button>
      </div>
      <div className="spacer-16" />

      {/* Modale premio */}
      <PrizeModal />
    </div>
  );
}
