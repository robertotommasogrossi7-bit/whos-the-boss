import { useState } from 'react';
import { useStore, selectCurrentLega } from '../../store/useStore';
import { oggi } from '../../utils/format';
import { suggerisciTorneo, nuovoGiocatoreSessione, creaSessione } from '../../utils/torneo';
import type { TorneoSetupConfig } from '../../utils/torneo';
import ConfigCash from './ConfigCash';
import ConfigTorneo from './ConfigTorneo';
import { IconWarning, IconCoins, IconTrophy } from '../icons';

export default function SetupForm() {
  const lega              = useStore(selectCurrentLega);
  const setupModalita     = useStore(s => s.setupModalita);
  const setupPartIds      = useStore(s => s.setupPartIds);
  const setSetupModalita  = useStore(s => s.setSetupModalita);
  const toggleSetupPartId = useStore(s => s.toggleSetupPartId);
  const avviaSessione       = useStore(s => s.avviaSessione);
  const aggiornaSetupSerata = useStore(s => s.aggiornaSetupSerata);
  const setupEditing        = useStore(s => s.setupEditing);
  const closeOverlay        = useStore(s => s.closeOverlay);
  const toast               = useStore(s => s.toast);

  /* In modalità modifica precompila dalla sessione 'pre' esistente */
  const sessE = setupEditing ? lega?.sessioneAttiva : undefined;

  /* Form state locale */
  const [data,       setData]       = useState(() => sessE?.data ?? oggi());
  const [oraInizio,  setOraInizio]  = useState(() => sessE?.ora_inizio ?? '21:00');
  const [oraFine,    setOraFine]    = useState(() => sessE?.ora_fine ?? '');
  const [buyIn,      setBuyIn]      = useState(() => sessE?.buy_in ?? 25);
  const [torneoConfig, setTorneoConfig] = useState<TorneoSetupConfig>(() =>
    sessE && sessE.modalita === 'torneo'
      ? {
          fiche_iniziali: sessE.fiche_iniziali,
          num_giocatori:  sessE.num_giocatori_target,
          durata_ore:     sessE.durata_ore,
          livelli:        sessE.livelli,
          late_reg:       sessE.late_reg,
          add_on:         sessE.add_on,
        }
      : suggerisciTorneo(9, 3),
  );

  if (!lega) return null;

  /* Nessun partecipante registrato → blocco */
  if (!lega.nomi.length) {
    return (
      <div className="tab-content">
        <div className="card">
          <div className="empty">
            <div className="eico"><IconWarning size={46} /></div>
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
      .map(n => nuovoGiocatoreSessione(n.id));

    const sess = creaSessione(
      data, oraInizio, oraFine, buyIn,
      setupModalita, giocatori,
      setupModalita === 'torneo' ? torneoConfig : undefined,
    );

    if (setupEditing) aggiornaSetupSerata(lega!.id, sess);
    else avviaSessione(lega!.id, sess);
  }

  return (
    <div className="tab-content">
      {/* Bottone indietro: minimizza l'overlay */}
      <button
        className="btn btn-gray btn-sm btn-back-serata"
        onClick={closeOverlay}
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
            <IconCoins size={15} className="ico-inline" /> Cash Game
          </button>
          <button
            className={setupModalita === 'torneo' ? 'active' : ''}
            onClick={() => setSetupModalita('torneo')}
          >
            <IconTrophy size={15} className="ico-inline" /> Torneo
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
        {setupEditing ? 'Salva modifiche' : 'Crea serata'}
      </button>
    </div>
  );
}
