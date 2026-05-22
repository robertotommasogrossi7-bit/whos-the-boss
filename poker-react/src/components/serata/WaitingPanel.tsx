import { useStore, selectCurrentLega } from '../../store/useStore';
import { fmtData, fmtRelativeData, euro } from '../../utils/format';

/* ══════════════════════════════════════════════════════
   WAITING PANEL — serata programmata (stato 'pre')
   Mostrato da LiveView quando la sessione non è ancora avviata.
══════════════════════════════════════════════════════ */
export default function WaitingPanel() {
  const lega            = useStore(selectCurrentLega);
  const iniziaOra       = useStore(s => s.iniziaOra);
  const modificaSetup   = useStore(s => s.modificaSetup);
  const annullaSessione = useStore(s => s.annullaSessione);

  const sess = lega?.sessioneAttiva;
  if (!lega || !sess) return null;

  const isTorneo = sess.modalita === 'torneo';
  const nGioc    = (sess.giocatori ?? []).length;
  const nLivelli = (sess.livelli ?? []).filter(l => l.tipo === 'gioco').length;

  return (
    <div className="tab-content">
      <div className="card">
        <div className="card-title">🕐 Serata programmata</div>
        <p className="settle-info-txt">
          {isTorneo ? '🏆 Torneo' : '💰 Cash'} · inizia {fmtRelativeData(sess.data)} alle {sess.ora_inizio || '—'}
        </p>
        <p className="settle-info-txt">
          Data: {fmtData(sess.data)} · Buy-in: €{euro(sess.buy_in)} · Partecipanti: {nGioc}
        </p>
        {isTorneo && (
          <p className="settle-info-txt">
            Fiche: {sess.fiche_iniziali} · Livelli: {nLivelli} · Durata stimata: {sess.durata_ore}h
          </p>
        )}
        <p className="help-note">
          La serata è in attesa. "Inizia ora" la avvia e registra l'ora corrente come inizio.
        </p>
      </div>

      <button className="btn btn-green btn-block" onClick={() => iniziaOra(lega.id)}>
        ▶ Inizia ora
      </button>
      <button className="btn btn-gray btn-block" onClick={() => modificaSetup(lega.id)}>
        ✎ Modifica impostazioni
      </button>
      <button className="btn btn-gray btn-block" onClick={() => annullaSessione(lega.id)}>
        🗑 Annulla serata
      </button>
    </div>
  );
}
