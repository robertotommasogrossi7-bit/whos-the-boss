import { useStore, selectCurrentLega } from '../../store/useStore';
import { euro } from '../../utils/format';
import { useTimer } from '../../hooks/useTimer';
import { calcolaMontepremi } from '../../utils/calc';

/* ══════════════════════════════════════════════════════
   SUB-TAB: OROLOGIO (torneo)
   Derivato da renderSubOrologio() in session-tournament.js
══════════════════════════════════════════════════════ */
export default function SubOrologio() {
  const lega               = useStore(selectCurrentLega);
  const avviaTorneo        = useStore(s => s.avviaTorneo);
  const pausaTorneo        = useStore(s => s.pausaTorneo);
  const riprendiTorneo     = useStore(s => s.riprendiTorneo);
  const avanzaLivelloManuale = useStore(s => s.avanzaLivelloManuale);
  const stopTorneo         = useStore(s => s.stopTorneo);
  const avanzaLivelloAuto  = useStore(s => s.avanzaLivelloAuto);
  const recoveryTorneo     = useStore(s => s.recoveryTorneo);

  const sess = lega?.sessioneAttiva;

  const { clockStr } = useTimer(
    sess,
    () => { if (lega) avanzaLivelloAuto(lega.id); },
    () => { if (lega) recoveryTorneo(lega.id); },
  );

  if (!lega || !sess) return null;

  const livello     = sess.livelli[sess.livello_corrente];
  const isPausa     = livello?.tipo === 'pausa';

  const gameLvlNum  = sess.livelli
    .slice(0, sess.livello_corrente + 1)
    .filter(l => l.tipo === 'gioco').length;
  const totGameLevels = sess.livelli.filter(l => l.tipo === 'gioco').length;

  let nextGioco: typeof livello | null = null;
  for (let i = sess.livello_corrente + 1; i < sess.livelli.length; i++) {
    if (sess.livelli[i]?.tipo === 'gioco') { nextGioco = sess.livelli[i] ?? null; break; }
  }

  /* ── Label e classe timer card ── */
  let statusLbl = '';
  let cardCls   = '';
  if (sess.stato === 'pre')       { statusLbl = 'PRE-TORNEO — premi START'; }
  else if (sess.stato === 'attivo') {
    if (isPausa) { statusLbl = '🍕 PAUSA DI TORNEO'; cardCls = 'break'; }
    else         { statusLbl = `LIVELLO ${gameLvlNum} di ${totGameLevels}`; }
  }
  else if (sess.stato === 'pausa')    { statusLbl = '⏸ PAUSA MANUALE'; cardCls = 'pausa'; }
  else if (sess.stato === 'concluso') { statusLbl = '⏹ TORNEO CONCLUSO'; cardCls = 'concluso'; }

  /* ── Blinds ── */
  let blindInfo: React.ReactNode = null;
  if (isPausa) {
    blindInfo = <div className="timer-blinds">🍕 Break</div>;
  } else if (livello) {
    blindInfo = (
      <div className="timer-blinds">
        {livello.sb.toLocaleString('it-IT')} / {livello.bb.toLocaleString('it-IT')}
        {livello.ante > 0 && (
          <span className="ante">Ante {livello.ante.toLocaleString('it-IT')}</span>
        )}
      </div>
    );
  }

  /* ── Prossimo livello ── */
  let nextHtml: React.ReactNode = null;
  if (nextGioco) {
    nextHtml = (
      <div className="timer-next">
        Prossimo: {nextGioco.sb.toLocaleString('it-IT')} / {nextGioco.bb.toLocaleString('it-IT')}
        {nextGioco.ante > 0 && ` · ante ${nextGioco.ante.toLocaleString('it-IT')}`}
      </div>
    );
  } else if (sess.livello_corrente >= sess.livelli.length - 1) {
    nextHtml = <div className="timer-next">Ultimo livello</div>;
  }

  /* ── Controlli ── */
  let controls: React.ReactNode = null;
  if (sess.stato === 'pre') {
    controls = (
      <button className="tc-btn primary" onClick={() => avviaTorneo(lega.id)}>▶ Avvia torneo</button>
    );
  } else if (sess.stato === 'attivo') {
    controls = (
      <>
        <button className="tc-btn" onClick={() => pausaTorneo(lega.id)}>⏸ Pausa</button>
        <button className="tc-btn" onClick={() => avanzaLivelloManuale(lega.id)}>⏭ Prossimo</button>
        <button className="tc-btn" onClick={() => stopTorneo(lega.id)}>⏹ Stop</button>
      </>
    );
  } else if (sess.stato === 'pausa') {
    controls = (
      <>
        <button className="tc-btn primary" onClick={() => riprendiTorneo(lega.id)}>▶ Riprendi</button>
        <button className="tc-btn" onClick={() => stopTorneo(lega.id)}>⏹ Stop</button>
      </>
    );
  } else if (sess.stato === 'concluso') {
    controls = (
      <span className="tc-concluso-note">Procedi alla chiusura ↓</span>
    );
  }

  /* ── Stats ── */
  const entrati = sess.giocatori.filter(g => g.entrato).length;
  const vivi    = sess.giocatori.filter(g => g.entrato && !g.eliminato).length;
  const monte   = calcolaMontepremi(sess);

  /* ── Reg banner ── */
  const lateRegOpen = gameLvlNum <= sess.late_reg.fino_a_livello;

  return (
    <>
      <div className={`timer-card${cardCls ? ' ' + cardCls : ''}`}>
        <div className="timer-level">{statusLbl}</div>
        <div className="timer-clock" id="timer-clock">{clockStr}</div>
        {blindInfo}
        {nextHtml}
        <div className="timer-controls">{controls}</div>
      </div>

      <div className={`reg-banner${lateRegOpen ? '' : ' closed'}`}>
        {lateRegOpen ? '📝' : '🔒'}
        <span className="reg-banner-text">
          {lateRegOpen
            ? `Late reg aperta (fino a fine L${sess.late_reg.fino_a_livello})`
            : 'Late reg chiusa — montepremi consolidato'}
        </span>
      </div>

      <div className="stats-mini-bar">
        <div className="smb-item">
          <div className="smb-label">Iscritti</div>
          <div className="smb-val">{entrati}</div>
        </div>
        <div className="smb-item">
          <div className="smb-label">In gioco</div>
          <div className="smb-val">{vivi}</div>
        </div>
        <div className="smb-item">
          <div className="smb-label">Montepremi</div>
          <div className="smb-val">€{euro(monte)}</div>
        </div>
      </div>
    </>
  );
}
