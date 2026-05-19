import { useState } from 'react';
import { useStore, selectCurrentLega } from '../../store/useStore';
import { oggi } from '../../utils/format';
import { suggerisciTorneo, nuovoGiocatoreSessione, creaSessione } from '../../utils/torneo';
import type { TorneoSetupConfig } from '../../utils/torneo';
import ConfigCash from './ConfigCash';
import ConfigTorneo from './ConfigTorneo';

export default function SetupForm() {
  const lega              = useStore(selectCurrentLega);
  const setupModalita     = useStore(s => s.setupModalita);
  const setupPartIds      = useStore(s => s.setupPartIds);
  const setSerataView     = useStore(s => s.setSerataView);
  const setSetupModalita  = useStore(s => s.setSetupModalita);
  const toggleSetupPartId = useStore(s => s.toggleSetupPartId);
  const avviaSessione     = useStore(s => s.avviaSessione);
  const toast             = useStore(s => s.toast);

  /* Form state locale */
  const [data,       setData]       = useState(oggi);
  const [oraInizio,  setOraInizio]  = useState('21:00');
  const [oraFine,    setOraFine]    = useState('');
  const [buyIn,      setBuyIn]      = useState(25);
  const [torneoConfig, setTorneoConfig] = useState<TorneoSetupConfig>(
    () => suggerisciTorneo(9, 3),
  );

  if (!lega) return null;

  /* Nessun partecipante registrato → blocco */
  if (!lega.nomi.length) {
    return (
      <div className="tab-content">
        <div className="card">
          <div className="empty">
            <div className="eico">⚠️</div>
            <p>Aggiungi prima i partecipanti dalla tab Partecipanti.</p>
          </div>
        </div>
      </div>
    );
  }

  function avvia() {
    if (!data)               { toast('Inserisci la data'); return; }
    if (!oraInizio)          { toast("Inserisci l'ora di inizio"); return; }
    if (setupPartIds.size < 2) { toast('Seleziona almeno 2 partecipanti'); return; }

    const giocatori = lega!.nomi
      .filter(n => setupPartIds.has(n.id))
      .map(n => nuovoGiocatoreSessione(n.id, buyIn));

    const sess = creaSessione(
      data, oraInizio, oraFine, buyIn,
      setupModalita, giocatori,
      setupModalita === 'torneo' ? torneoConfig : undefined,
    );

    avviaSessione(lega!.id, sess);
  }

  return (
    <div className="tab-content">
      {/* Bottone indietro */}
      <button
        className="btn btn-gray btn-sm btn-back-serata"
        onClick={() => setSerataView('hub')}
      >
        ‹ Indietro
      </button>

      {/* Quando */}
      <div className="card">
        <div className="card-title">Quando</div>
        <div className="form-row">
          <label>Data</label>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
          />
        </div>
        <div className="fields-2col-time">
          <div className="form-row">
            <label>Ora inizio</label>
            <input
              type="time"
              value={oraInizio}
              onChange={e => setOraInizio(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>Ora fine (stima)</label>
            <input
              type="time"
              value={oraFine}
              onChange={e => setOraFine(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Modalità + config */}
      <div className="card">
        <div className="card-title">Modalità</div>
        <div className="modalita-toggle">
          <button
            className={setupModalita === 'cash' ? 'active' : ''}
            onClick={() => setSetupModalita('cash')}
          >
            💰 Cash Game
          </button>
          <button
            className={setupModalita === 'torneo' ? 'active' : ''}
            onClick={() => setSetupModalita('torneo')}
          >
            🏆 Torneo
          </button>
        </div>

        {setupModalita === 'cash' ? (
          <ConfigCash buyIn={buyIn} onChange={setBuyIn} />
        ) : (
          <ConfigTorneo
            config={torneoConfig}
            buyIn={buyIn}
            onBuyInChange={setBuyIn}
            onChange={setTorneoConfig}
          />
        )}
      </div>

      {/* Partecipanti */}
      <div className="card">
        <div className="card-title">Partecipanti alla serata</div>
        <div className="part-pill-grid">
          {lega.nomi.map(n => (
            <button
              key={n.id}
              className={`part-pill${setupPartIds.has(n.id) ? ' selected' : ''}`}
              onClick={() => toggleSetupPartId(n.id)}
            >
              {n.nome}
            </button>
          ))}
        </div>
        <p className="help-note">
          Tocca per selezionare chi è presente stasera (potrai aggiungere altri durante la serata).
        </p>
      </div>

      <button className="btn btn-green btn-block" onClick={avvia}>
        ▶ Inizia serata
      </button>
    </div>
  );
}
