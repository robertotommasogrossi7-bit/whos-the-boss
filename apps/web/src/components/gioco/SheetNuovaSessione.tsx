import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { oggi, nowHHMM } from '@poker/core';
import { normalizzaNome } from '@poker/core';
import { idBloccatiInclusi } from '@poker/core';
import { Sheet, Button } from '../ui';
import { IconPlus } from '../icons';
import type { Lega } from '@poker/core';

/* Sheet "Nuova sessione" (M3, SPEC §6/B1). Scelta partecipanti (dai nomi
   della lega / guest del Personale, aggiungibili al volo) + data. Se la data
   è oggi avvia subito (stato 'attiva'); se è futura la programma (stato 'pre'). */
interface Props {
  lega: Lega;
  giocoId: string;
  onClose: () => void;
  onCreated: (sessId: number) => void;
}

export default function SheetNuovaSessione({ lega, giocoId, onClose, onCreated }: Props) {
  const creaSessioneGioco  = useStore(s => s.creaSessioneGioco);
  const avviaSessioneGioco = useStore(s => s.avviaSessioneGioco);
  const aggiungiGiocatore  = useStore(s => s.aggiungiGiocatore);
  const utente             = useStore(s => s.utente);
  const toast              = useStore(s => s.toast);

  const [selected, setSelected] = useState<number[]>(lega.nomi.map(n => n.id));
  const [newName, setNewName]   = useState('');
  const [data, setData]         = useState(oggi());

  // #4.5: nel Personale l'id "sei tu" è incluso e non deselezionabile.
  const bloccati = idBloccatiInclusi(lega, utente?.username);

  function toggle(id: number) {
    if (bloccati.includes(id)) return; // "sei tu" non deselezionabile
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  function aggiungiGuest() {
    const n = newName.trim();
    if (!n) return;
    const err = aggiungiGiocatore(lega.id, n);
    if (err) { toast(err); return; }
    // Rilegge la lega aggiornata per selezionare il nuovo id
    const fresh = useStore.getState().db.leghe.find(l => l.id === lega.id);
    const nuovo = fresh?.nomi.find(x => normalizzaNome(x.nome) === normalizzaNome(n));
    if (nuovo) setSelected(prev => (prev.includes(nuovo.id) ? prev : [...prev, nuovo.id]));
    setNewName('');
  }

  const isOggi = data === oggi();

  function submit() {
    if (selected.length === 0) { toast('Scegli almeno un partecipante'); return; }
    const id = creaSessioneGioco(lega.id, giocoId, selected, data, nowHHMM());
    if (id == null) return;
    if (isOggi) avviaSessioneGioco(lega.id, id);
    onCreated(id);
  }

  return (
    <Sheet open onClose={onClose} title="Nuova sessione">
      <div className="esito-sec">
        <div className="esito-label">Partecipanti</div>
        {lega.nomi.length === 0 ? (
          <p className="esito-hint">Aggiungi i giocatori qui sotto.</p>
        ) : (
          <div className="pick-grid">
            {lega.nomi.map(n => {
              const bloccato = bloccati.includes(n.id);
              return (
                <button
                  key={n.id}
                  className={`pick-chip${selected.includes(n.id) ? ' selected' : ''}${bloccato ? ' pick-chip--locked' : ''}`}
                  onClick={() => toggle(n.id)}
                  disabled={bloccato}
                  title={bloccato ? 'Sei tu — sempre incluso nel Personale' : undefined}
                >
                  {n.nome}
                </button>
              );
            })}
          </div>
        )}
        <div className="hub-add-row nuova-add">
          <input
            type="text"
            placeholder={lega.personale ? 'Aggiungi un amico' : 'Aggiungi giocatore'}
            maxLength={25}
            autoCapitalize="words"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && aggiungiGuest()}
          />
          <Button onClick={aggiungiGuest} aria-label="Aggiungi giocatore"><IconPlus size={18} /></Button>
        </div>
      </div>

      <div className="esito-sec">
        <div className="esito-label">Data</div>
        <input
          className="esito-input"
          type="date"
          value={data}
          onChange={e => setData(e.target.value)}
        />
      </div>

      <div className="esito-actions">
        <Button variant="ghost" onClick={onClose}>Annulla</Button>
        <Button onClick={submit} disabled={selected.length === 0}>
          {isOggi ? 'Avvia sessione' : 'Programma'}
        </Button>
      </div>
    </Sheet>
  );
}
