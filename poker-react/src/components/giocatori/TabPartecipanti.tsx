import { useState } from 'react';
import { useStore, selectCurrentLega } from '../../store/useStore';
import { IconUser, IconTrash } from '../icons';

export default function TabPartecipanti() {
  const lega               = useStore(selectCurrentLega);
  const aggiungiGiocatore  = useStore(s => s.aggiungiGiocatore);
  const eliminaGiocatore   = useStore(s => s.eliminaGiocatore);
  const toast              = useStore(s => s.toast);
  const [nuovoNome, setNuovoNome] = useState('');

  if (!lega) return null;

  /** Quante partite ha giocato questo partecipante */
  function nPartite(idNome: number): number {
    return lega!.partite.filter(p =>
      p.giocatori.some(g => g.id_nome === idNome),
    ).length;
  }

  function aggiungi() {
    const err = aggiungiGiocatore(lega!.id, nuovoNome);
    if (err) { toast(err); return; }
    setNuovoNome('');
    toast('Giocatore aggiunto');
  }

  function elimina(idNome: number, nome: string) {
    if (!confirm(`Eliminare ${nome}?`)) return;
    const err = eliminaGiocatore(lega!.id, idNome);
    if (err) toast(err);
  }

  return (
    <div className="tab-content">

      {/* Form aggiunta */}
      <div className="card">
        <div className="card-title">Aggiungi partecipante</div>
        <div className="nuovo-part-row">
          <input
            type="text"
            placeholder="Nome partecipante"
            maxLength={25}
            autoCapitalize="words"
            value={nuovoNome}
            onChange={e => setNuovoNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && aggiungi()}
          />
          <button className="btn btn-green btn-sm" onClick={aggiungi}>+</button>
        </div>
      </div>

      {/* Lista partecipanti */}
      <div className="card">
        <div className="card-title">{lega.nomi.length} partecipanti</div>
        {lega.nomi.length === 0 ? (
          <div className="empty">
            <div className="eico"><IconUser size={46} /></div>
            <p>Nessun partecipante. Aggiungine uno!</p>
          </div>
        ) : (
          lega.nomi.map(nm => {
            const np = nPartite(nm.id);
            return (
              <div key={nm.id} className="player-row">
                <div className="pr-left">
                  <span className="pr-name">{nm.nome}</span>
                  {np > 0 && (
                    <span className="pr-games">{np} {np === 1 ? 'partita' : 'partite'}</span>
                  )}
                </div>
                <button
                  className="btn btn-sm btn-red"
                  onClick={() => elimina(nm.id, nm.nome)}
                  title="Elimina"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
