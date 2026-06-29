import { useState } from 'react';
import { Sheet, Button } from '../ui';
import { IconCheck } from '../icons';
import type { EsitoPartitaInput } from '@whos-the-boss/core';

/* Sheet "Esito partita" (M3, SPEC §6/B2). Montato = aperto: lo stato si
   resetta a ogni apertura. Partecipanti (override sui giocatori della
   sessione), vincitori (multi-selezione), pareggio, nomeLibero opzionale. */
interface Props {
  partecipantiSessione: number[];
  nome: (id: number) => string;
  bloccati?: number[]; // #4.5: id "sei tu" non deselezionabili dai partecipanti
  onClose: () => void;
  onConfirm: (esito: EsitoPartitaInput) => void;
}

export default function SheetEsitoPartita({ partecipantiSessione, nome, bloccati = [], onClose, onConfirm }: Props) {
  const [parts, setParts]           = useState<number[]>(partecipantiSessione);
  const [winners, setWinners]       = useState<number[]>([]);
  const [pareggio, setPareggio]     = useState(false);
  const [nomeLibero, setNomeLibero] = useState('');

  function togglePart(id: number) {
    if (bloccati.includes(id)) return; // #4.5: "sei tu" sempre fra i partecipanti
    setParts(prev => {
      const has = prev.includes(id);
      if (has) setWinners(w => w.filter(x => x !== id)); // chi non gioca non può vincere
      return has ? prev.filter(x => x !== id) : [...prev, id];
    });
  }

  function toggleWinner(id: number) {
    if (pareggio) return;
    setWinners(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  function togglePareggio() {
    setPareggio(p => {
      if (!p) setWinners([]);
      return !p;
    });
  }

  const puoSalvare = parts.length > 0 && (pareggio || winners.length > 0);

  function salva() {
    if (!puoSalvare) return;
    onConfirm({
      vincitori: pareggio ? [] : winners,
      pareggio,
      partecipanti: parts,           // lo store normalizza l'override
      nomeLibero: nomeLibero.trim() || undefined,
    });
  }

  return (
    <Sheet open onClose={onClose} title="Esito partita">
      <div className="esito-sec">
        <div className="esito-label">Chi ha giocato</div>
        <div className="pick-grid">
          {partecipantiSessione.map(id => {
            const bloccato = bloccati.includes(id);
            return (
              <button
                key={id}
                className={`pick-chip${parts.includes(id) ? ' selected' : ''}${bloccato ? ' pick-chip--locked' : ''}`}
                onClick={() => togglePart(id)}
                disabled={bloccato}
                title={bloccato ? 'Sei tu — sempre fra i partecipanti' : undefined}
              >
                {nome(id)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="esito-sec">
        <div className="esito-label">Vincitori</div>
        {pareggio ? (
          <p className="esito-hint">Pareggio: nessun vincitore.</p>
        ) : parts.length === 0 ? (
          <p className="esito-hint">Seleziona prima chi ha giocato.</p>
        ) : (
          <div className="pick-grid">
            {parts.map(id => (
              <button
                key={id}
                className={`pick-chip pick-chip--win${winners.includes(id) ? ' selected' : ''}`}
                onClick={() => toggleWinner(id)}
              >
                {nome(id)}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className={`esito-pareggio${pareggio ? ' on' : ''}`} onClick={togglePareggio}>
        <span className="ep-box">{pareggio && <IconCheck size={16} />}</span>
        Pareggio
      </button>

      <div className="esito-sec">
        <div className="esito-label">Nome libero (opzionale)</div>
        <input
          className="esito-input"
          type="text"
          placeholder="es. una partita di un altro gioco"
          maxLength={40}
          value={nomeLibero}
          onChange={e => setNomeLibero(e.target.value)}
        />
      </div>

      <div className="esito-actions">
        <Button variant="ghost" onClick={onClose}>Annulla</Button>
        <Button onClick={salva} disabled={!puoSalvare}>Salva esito</Button>
      </div>
    </Sheet>
  );
}
