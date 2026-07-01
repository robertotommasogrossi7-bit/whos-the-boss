import { useState } from 'react';
import { useStore, selectCurrentLega } from '../../store/useStore';
import { èSeiTuRecord } from '@whos-the-boss/core';
import { IconUser, IconTrash, IconEdit, IconCheck, IconClose } from '../icons';

export default function TabPartecipanti() {
  const lega               = useStore(selectCurrentLega);
  const utente             = useStore(s => s.utente);
  const aggiungiGiocatore  = useStore(s => s.aggiungiGiocatore);
  const eliminaGiocatore   = useStore(s => s.eliminaGiocatore);
  const rinominaGiocatore  = useStore(s => s.rinominaGiocatore);
  const toast              = useStore(s => s.toast);
  const [nuovoNome, setNuovoNome] = useState('');
  const [editId, setEditId]       = useState<number | null>(null);
  const [editVal, setEditVal]     = useState('');

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

  function apriEdit(idNome: number, nome: string) {
    setEditId(idNome);
    setEditVal(nome);
  }
  function annullaEdit() {
    setEditId(null);
    setEditVal('');
  }
  function confermaEdit(idNome: number) {
    const err = rinominaGiocatore(lega!.id, idNome, editVal);
    if (err) { toast(err); return; }
    annullaEdit();
    toast('Soprannome aggiornato');
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
            const np       = nPartite(nm.id);
            const seiTu    = èSeiTuRecord(nm, utente?.id);
            const bloccato = lega.personale && seiTu; // tu nel Personale: non rimovibile
            const inEdit   = editId === nm.id;

            if (inEdit) {
              return (
                <div key={nm.id} className="player-row">
                  <div className="pr-edit">
                    <input
                      className="pr-edit-input"
                      type="text"
                      maxLength={25}
                      autoCapitalize="words"
                      autoFocus
                      placeholder="Soprannome"
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confermaEdit(nm.id);
                        else if (e.key === 'Escape') annullaEdit();
                      }}
                    />
                    <button className="pr-edit-ok" onClick={() => confermaEdit(nm.id)} title="Salva soprannome">
                      <IconCheck size={16} />
                    </button>
                    <button className="pr-edit-cancel" onClick={annullaEdit} title="Annulla">
                      <IconClose size={16} />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={nm.id} className="player-row">
                <div className="pr-left">
                  <span className="pr-name">{nm.nome}</span>
                  {seiTu && <span className="badge-sei-tu">sei tu</span>}
                  {np > 0 && (
                    <span className="pr-games">{np} {np === 1 ? 'partita' : 'partite'}</span>
                  )}
                </div>
                <div className="pr-actions">
                  {/* Soprannome: cosmetico, id stabile. NON sul "sei tu" (nome account-level). */}
                  {!seiTu && (
                    <button className="pr-edit-btn" onClick={() => apriEdit(nm.id, nm.nome)} title="Soprannome">
                      <IconEdit size={16} />
                    </button>
                  )}
                  {!bloccato && (
                    <button
                      className="btn btn-sm btn-red"
                      onClick={() => elimina(nm.id, nm.nome)}
                      title="Elimina"
                    >
                      <IconTrash size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
