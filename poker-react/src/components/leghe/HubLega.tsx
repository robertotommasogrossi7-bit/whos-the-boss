import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { GIOCHI_PREIMPOSTATI } from '../../utils/giochi';
import { IconChevronLeft, GameIcon, IconTrash, IconPlus, IconTrophy } from '../icons';
import { Button, EmptyState } from '../ui';

/* HUB DI LEGA (/leghe/:legaId) — MULTIGIOCO_SPEC §5/§10.
   Griglia giochi (catalogo + eventuali lega.giochi) + classifica di lega
   (placeholder → M4) + giocatori della lega (la rubrica si gestisce qui).
   NIENTE GameBar dentro la lega: il gioco si sceglie dalla griglia.
   Il poker entra nell'app dedicata; gli altri giochi arrivano in M3. */
export default function HubLega() {
  const { legaId } = useParams<{ legaId: string }>();
  const navigate = useNavigate();
  const leghe            = useStore(s => s.db.leghe);
  const setCurrentLega   = useStore(s => s.setCurrentLega);
  const aggiungiGiocatore = useStore(s => s.aggiungiGiocatore);
  const eliminaGiocatore  = useStore(s => s.eliminaGiocatore);
  const toast            = useStore(s => s.toast);

  const [nuovoNome, setNuovoNome] = useState('');

  const idNum = Number(legaId);
  const lega = leghe.find(l => l.id === idNum) ?? null;

  useEffect(() => {
    if (!isNaN(idNum) && idNum > 0) setCurrentLega(idNum);
  }, [idNum, setCurrentLega]);

  if (!lega) return <Navigate to="/leghe" replace />;

  function entraGioco(id: string) {
    if (id === 'poker') { navigate(`/leghe/${idNum}/poker`); return; }
    toast('Questo gioco arriva col flusso "segna partita"');
  }

  function aggiungi() {
    const err = aggiungiGiocatore(idNum, nuovoNome);
    if (err) { toast(err); return; }
    setNuovoNome('');
    toast('Giocatore aggiunto');
  }

  function elimina(nomeId: number, nome: string) {
    if (!confirm(`Eliminare ${nome}?`)) return;
    const err = eliminaGiocatore(idNum, nomeId);
    if (err) toast(err);
  }

  return (
    <>
      <header className="app-header">
        <button className="hdr-back" onClick={() => navigate('/leghe')}>
          <IconChevronLeft size={20} />
        </button>
        <div className="hdr-center">
          <h1>{lega.nome}</h1>
          <p>{lega.nomi.length} giocatori</p>
        </div>
        <div className="hdr-right" />
      </header>

      <div className="tab-content">
        {/* Griglia giochi */}
        <div className="sec-hdr"><h2>Giochi</h2></div>
        <div className="game-grid">
          {GIOCHI_PREIMPOSTATI.map(g => {
            const isPoker = g.id === 'poker';
            const cls = `game-tile ${isPoker ? 'game-tile--poker' : 'game-tile--soon'}`;
            return (
              <button key={g.id} className={cls} onClick={() => entraGioco(g.id)}>
                <span className="game-tile-ico"><GameIcon icona={g.icona} size={34} /></span>
                <span className="game-tile-nome">{g.nome}</span>
                {!isPoker && <span className="game-tile-soon">presto</span>}
              </button>
            );
          })}
        </div>

        {/* Classifica di lega (placeholder → M4) */}
        <div className="sec-hdr"><h2>Classifica</h2></div>
        <EmptyState
          icon={<IconTrophy size={40} />}
          title="Classifica di lega in arrivo"
          hint="Le classifiche per gioco e ambito arrivano con le statistiche multigioco."
        />

        {/* Giocatori della lega (rubrica) */}
        <div className="sec-hdr"><h2>Giocatori</h2></div>
        <div className="hub-add-row">
          <input
            type="text"
            placeholder="Nome giocatore"
            maxLength={25}
            autoCapitalize="words"
            value={nuovoNome}
            onChange={e => setNuovoNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && aggiungi()}
          />
          <Button onClick={aggiungi} aria-label="Aggiungi giocatore"><IconPlus size={18} /></Button>
        </div>

        {lega.nomi.length === 0 ? (
          <p className="help-note">Nessun giocatore. Aggiungine uno qui sopra.</p>
        ) : (
          lega.nomi.map(nm => (
            <div key={nm.id} className="player-row">
              <div className="pr-left">
                <span className="pr-name">{nm.nome}</span>
              </div>
              <button
                className="btn btn-sm btn-red"
                onClick={() => elimina(nm.id, nm.nome)}
                title="Elimina"
              >
                <IconTrash size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
