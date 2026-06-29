import { suggerisciTorneo } from '@poker/core';
import type { TorneoSetupConfig } from '@poker/core';
import type { Livello } from '@poker/core';
import { euro } from '@poker/core';
import { IconSettings, IconPause, IconClose } from '../icons';

interface Props {
  config:        TorneoSetupConfig;
  buyIn:         number;
  onBuyInChange: (v: number) => void;
  onChange:      (cfg: TorneoSetupConfig) => void;
}

export default function ConfigTorneo({ config, buyIn, onBuyInChange, onChange }: Props) {

  /* ── Valori derivati per le info-pill ── */
  const totalMin   = config.livelli.reduce((acc, l) => acc + l.durata, 0);
  const numTavoli  = Math.ceil(config.num_giocatori / 9);
  const totGame    = config.livelli.filter(l => l.tipo === 'gioco').length;

  let lateRegMin = 0, gc = 0;
  for (const l of config.livelli) {
    lateRegMin += l.durata;
    if (l.tipo === 'gioco') {
      gc++;
      if (gc >= config.late_reg.fino_a_livello) break;
    }
  }

  /* ── Helpers ── */
  function updLivello(i: number, patch: Partial<Livello>) {
    onChange({
      ...config,
      livelli: config.livelli.map((l, idx) => idx === i ? { ...l, ...patch } : l),
    });
  }

  function rimuoviLivello(i: number) {
    onChange({ ...config, livelli: config.livelli.filter((_, idx) => idx !== i) });
  }

  function aggiungiLivelloGioco() {
    const last = [...config.livelli].reverse().find(l => l.tipo === 'gioco')
      ?? { sb: 25, bb: 50, ante: 0, durata: 15 };
    onChange({
      ...config,
      livelli: [...config.livelli, {
        tipo: 'gioco',
        sb:   last.sb * 2,
        bb:   last.bb * 2,
        ante: last.ante,
        durata: last.durata,
      }],
    });
  }

  function aggiungiPausa() {
    onChange({
      ...config,
      livelli: [...config.livelli, { tipo: 'pausa', sb: 0, bb: 0, ante: 0, durata: 10 }],
    });
  }

  function rigeneraStruttura() {
    if (!confirm('Rigenerare la struttura automatica? Le modifiche manuali ai livelli andranno perse.')) return;
    onChange(suggerisciTorneo(config.num_giocatori, config.durata_ore));
  }

  /* Contatore livelli di gioco per le righe */
  let gameLvlCounter = 0;

  return (
    <>
      {/* Grid parametri principali */}
      <div className="torneo-setup-grid form-row--top">
        <div className="form-row form-row--compact">
          <label>Buy-in (€)</label>
          <input
            type="number"
            value={buyIn}
            step={0.5}
            min={0}
            inputMode="decimal"
            onChange={e => onBuyInChange(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="form-row form-row--compact">
          <label>Giocatori previsti</label>
          <input
            type="number"
            value={config.num_giocatori}
            min={2}
            max={200}
            inputMode="numeric"
            onChange={e => onChange({
              ...config,
              num_giocatori: Math.max(2, Math.min(200, parseInt(e.target.value) || 2)),
            })}
          />
        </div>
      </div>

      <div className="torneo-setup-grid">
        <div className="form-row form-row--compact">
          <label>Durata stimata (ore)</label>
          <input
            type="number"
            value={config.durata_ore}
            step={0.5}
            min={1}
            max={12}
            inputMode="decimal"
            onChange={e => onChange({
              ...config,
              durata_ore: Math.max(1, Math.min(12, parseFloat(e.target.value) || 3)),
            })}
          />
        </div>
        <div className="form-row form-row--compact">
          <label>Fiche iniziali</label>
          <input
            type="number"
            value={config.fiche_iniziali}
            step={500}
            min={500}
            inputMode="numeric"
            onChange={e => onChange({
              ...config,
              fiche_iniziali: Math.max(500, parseInt(e.target.value) || 10_000),
            })}
          />
        </div>
      </div>

      {/* Info pill */}
      <div>
        <span className="torneo-info-pill">
          {numTavoli} {numTavoli === 1 ? 'tavolo' : 'tavoli'} (max {numTavoli * 9})
        </span>
        <span className="torneo-info-pill">
          ~{Math.floor(totalMin / 60)}h{totalMin % 60 ? ` ${totalMin % 60}m` : ''}
        </span>
        <span className="torneo-info-pill">
          Late reg {lateRegMin}min
        </span>
      </div>

      <button className="btn btn-outline btn-block btn-sm" onClick={rigeneraStruttura}>
        <IconSettings size={15} className="ico-inline" /> Suggerisci struttura automatica
      </button>

      {/* Struttura livelli */}
      <div className="sec-title">Struttura livelli</div>
      <p className="help-note">Bordo giallo = registrazione tardiva ancora aperta.</p>

      <div className="blinds-list-card">
        {/* Header */}
        <div className="blinds-row head">
          <div>#</div>
          <div>SB</div>
          <div>BB</div>
          <div>Ante</div>
          <div>Min</div>
          <div />
        </div>

        {/* Righe livelli */}
        {config.livelli.map((l, i) => {
          if (l.tipo === 'pausa') {
            return (
              <div key={i} className="blinds-row pausa">
                <div className="lvl-num"><IconPause size={14} /></div>
                <div className="blinds-pausa-label">PAUSA</div>
                <div>
                  <input
                    type="number"
                    value={l.durata}
                    min={1}
                    onChange={e => updLivello(i, { durata: Math.max(1, parseInt(e.target.value) || 10) })}
                  />
                </div>
                <div>
                  <button className="lvl-del" onClick={() => rimuoviLivello(i)}><IconClose size={13} /></button>
                </div>
              </div>
            );
          }
          gameLvlCounter++;
          const gIdx   = gameLvlCounter;
          const isLate = gIdx <= config.late_reg.fino_a_livello;
          return (
            <div key={i} className={`blinds-row${isLate ? ' late' : ''}`}>
              <div className="lvl-num">L{gIdx}</div>
              <div>
                <input type="number" value={l.sb} min={0}
                  onChange={e => updLivello(i, { sb: Math.max(0, parseInt(e.target.value) || 0) })}
                />
              </div>
              <div>
                <input type="number" value={l.bb} min={0}
                  onChange={e => updLivello(i, { bb: Math.max(0, parseInt(e.target.value) || 0) })}
                />
              </div>
              <div>
                <input type="number" value={l.ante} min={0}
                  onChange={e => updLivello(i, { ante: Math.max(0, parseInt(e.target.value) || 0) })}
                />
              </div>
              <div>
                <button className="lvl-del" onClick={() => rimuoviLivello(i)}><IconClose size={13} /></button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="torneo-btn-row">
        <button className="btn btn-outline btn-sm" onClick={aggiungiLivelloGioco}>+ Livello</button>
        <button className="btn btn-outline btn-sm" onClick={aggiungiPausa}>+ Pausa</button>
      </div>

      {/* Iscrizione tardiva */}
      <div className="sec-title">Iscrizione tardiva</div>
      <div className="form-row form-row--compact">
        <label>Chiude dopo il livello</label>
        <input
          type="number"
          value={config.late_reg.fino_a_livello}
          min={1}
          max={totGame}
          inputMode="numeric"
          onChange={e => onChange({
            ...config,
            late_reg: {
              fino_a_livello: Math.max(1, Math.min(totGame, parseInt(e.target.value) || 1)),
            },
          })}
        />
        <p className="help-note">
          Dopo questo livello la registrazione chiude e il montepremi si consolida.
        </p>
      </div>

      {/* Add-on */}
      <div className="sec-title">Add-on</div>
      <div className="status-line">
        <span className="sl-label">Add-on disponibile?</span>
        <button
          className={`pay-toggle ${config.add_on.abilitato ? 'paid' : 'unpaid'}`}
          onClick={() => onChange({
            ...config,
            add_on: { ...config.add_on, abilitato: !config.add_on.abilitato },
          })}
        >
          {config.add_on.abilitato ? 'Sì' : 'No'}
        </button>
      </div>

      {config.add_on.abilitato && (
        <div className="torneo-setup-grid">
          <div className="form-row form-row--compact">
            <label>Fiche add-on</label>
            <input
              type="number"
              value={config.add_on.fiche}
              step={500}
              min={0}
              inputMode="numeric"
              onChange={e => onChange({
                ...config,
                add_on: { ...config.add_on, fiche: Math.max(0, parseInt(e.target.value) || 0) },
              })}
            />
          </div>
          <div className="form-row form-row--compact">
            <label>Prezzo (€)</label>
            <input
              type="number"
              value={config.add_on.prezzo || ''}
              step={0.5}
              min={0}
              placeholder={euro(buyIn / 2)}
              inputMode="decimal"
              onChange={e => onChange({
                ...config,
                add_on: { ...config.add_on, prezzo: Math.max(0, parseFloat(e.target.value) || 0) },
              })}
            />
          </div>
        </div>
      )}
      {config.add_on.abilitato && (
        <p className="help-note">Disponibile subito dopo la chiusura della late reg.</p>
      )}
    </>
  );
}
