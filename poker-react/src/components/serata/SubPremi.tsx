import { useStore, selectCurrentLega } from '../../store/useStore';
import { euro } from '../../utils/format';
import {
  calcolaMontepremi,
  calcolaMontepremiIncassato,
  calcolaPremiPagati,
  calcolaPremi,
} from '../../utils/calc';

/* ══════════════════════════════════════════════════════
   SUB-TAB: PREMI (torneo)
   Derivato da renderSubPremi() in session-premi.js
══════════════════════════════════════════════════════ */
const MEDALS = ['🥇', '🥈', '🥉'];

export default function SubPremi() {
  const lega = useStore(selectCurrentLega);
  if (!lega?.sessioneAttiva) return null;
  const sess = lega.sessioneAttiva;

  const monte     = calcolaMontepremi(sess);
  const incassato = calcolaMontepremiIncassato(sess);
  const giaPagato = calcolaPremiPagati(sess);
  const residuo   = Math.max(0, Math.round((monte - giaPagato) * 100) / 100);
  const nonPagato = Math.round((monte - incassato) * 100) / 100;
  const entrati   = sess.giocatori.filter(g => g.entrato).length;

  const premi = sess.premi_consolidati ? sess.premi : calcolaPremi(monte, entrati);

  /* ── Banner pool ── */
  const banner = sess.premi_consolidati ? (
    <div className="pool-banner locked">
      <div className="pb-lbl">Montepremi consolidato</div>
      <div className="pb-val">€{euro(monte)}</div>
      <div className="pb-sub">🔒 Late reg chiusa</div>
    </div>
  ) : (
    <div className="pool-banner">
      <div className="pb-lbl">Montepremi (include non pagati)</div>
      <div className="pb-val">€{euro(monte)}</div>
      <div className="pb-sub">Si consolida a fine late reg · Chi non paga creerà un debito</div>
    </div>
  );

  /* ── Stats cassa ── */
  const poolStateBar = (
    <div className="stats-mini-bar smb--mb">
      <div className="smb-item">
        <div className="smb-label">Incassato</div>
        <div className="smb-val pos">€{euro(incassato)}</div>
      </div>
      <div className="smb-item">
        <div className="smb-label">Pagato a vinc.</div>
        <div className="smb-val">€{euro(giaPagato)}</div>
      </div>
      <div className="smb-item">
        <div className="smb-label">{nonPagato > 0.005 ? '⚠ Da incassare' : 'Residuo monte'}</div>
        <div className={`smb-val${nonPagato > 0.005 ? ' neg' : ''}`}>
          €{euro(nonPagato > 0.005 ? nonPagato : residuo)}
        </div>
      </div>
    </div>
  );

  if (!premi.length || !entrati) {
    return (
      <>
        {banner}
        {poolStateBar}
        <div className="empty">
          <div className="eico">💰</div>
          <p>Aggiungi giocatori entrati per vedere la struttura premi</p>
        </div>
      </>
    );
  }

  const payoutNote = entrati <= 4  ? 'winner takes all'
                   : entrati <= 9  ? 'top 2 paid'
                   : entrati <= 15 ? 'top 3 paid'
                   : entrati <= 27 ? 'top 4 paid'
                   :                 'top 6 paid';

  return (
    <>
      {banner}
      {poolStateBar}

      <div className="card card--flush">
        <div className="prize-row head">
          <div />
          <div>Posizione</div>
          <div>%</div>
          <div>Premio</div>
        </div>
        {premi.map((p, i) => {
          const cls = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
          return (
            <div key={p.posizione} className={`prize-row${cls ? ' ' + cls : ''}`}>
              <div className="prize-medal">{MEDALS[i] ?? `${i + 1}°`}</div>
              <div><strong>{p.posizione}° posto</strong></div>
              <div className="prize-perc">{p.percentuale}%</div>
              <div className="prize-amount">€{euro(p.importo)}</div>
            </div>
          );
        })}
      </div>

      <p className="classifica-nota">
        Struttura standard per {entrati} iscritti: <b>{payoutNote}</b>.
      </p>
    </>
  );
}
