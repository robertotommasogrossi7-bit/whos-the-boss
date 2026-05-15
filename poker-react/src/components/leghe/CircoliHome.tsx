import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { fmtData } from '../../utils/format';
import type { Lega } from '../../types';

export default function CircoliHome() {
  const utente  = useStore(s => s.utente);
  const leghe   = useStore(s => s.db.leghe);
  const logout  = useStore(s => s.logout);
  const setCurrentLega = useStore(s => s.setCurrentLega);
  const navigate = useNavigate();

  const n = leghe.length;
  const legheAttive = leghe.filter((l: Lega) => l.sessioneAttiva);

  function doLogout() {
    if (!confirm('Vuoi uscire?')) return;
    logout();
    navigate('/login');
  }

  function vaiAllaLega(legaId: number) {
    setCurrentLega(legaId);
    navigate(`/app/${legaId}`);
  }

  return (
    <>
      <header className="app-header">
        <div className="hdr-back invisible">‹</div>
        <div className="hdr-center">
          <h1>♠ I tuoi circoli</h1>
          <p>Ciao {utente?.username ?? ''}!</p>
        </div>
        <div className="hdr-right">
          <button className="hdr-icon" onClick={doLogout} title="Esci">⎋</button>
        </div>
      </header>

      <div className="screen-body--wide">
        <div className="hero-card" onClick={() => navigate('/nuova-lega')}>
          <div className="h-ico">➕</div>
          <div className="h-text">
            <h3>Nuova lega</h3>
            <p>Crea un nuovo circolo, aggiungi i partecipanti e parti subito</p>
          </div>
        </div>

        <div className="hero-card gold" onClick={() => navigate('/leghe')}>
          <div className="h-ico">🏆</div>
          <div className="h-text">
            <h3>Leghe a cui sei iscritto</h3>
            <p>{n}{n === 1 ? ' lega' : ' leghe'}</p>
          </div>
        </div>

        {legheAttive.length > 0 && (
          <>
            <div className="sec-hdr">
              <h2>Serate in corso</h2>
            </div>
            {legheAttive.map(l => {
              const s = l.sessioneAttiva!;
              const tipo = s.modalita === 'torneo' ? '🏆 Torneo' : '💰 Cash';
              const nEnt = (s.giocatori ?? []).filter(g => g.entrato).length;
              return (
                <div
                  key={l.id}
                  className="serata-attiva-card"
                  onClick={() => vaiAllaLega(l.id)}
                >
                  <div className="sac-dot">🔴</div>
                  <div className="sac-info">
                    <h3>{l.nome}</h3>
                    <p>{tipo} · {nEnt} giocatori · {fmtData(s.data ?? '')}</p>
                  </div>
                  <div className="sac-arrow">›</div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
