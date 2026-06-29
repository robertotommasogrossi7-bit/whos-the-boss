import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { GIOCHI_PREIMPOSTATI } from '@whos-the-boss/core';
import { GameIcon, IconChevronDown } from '../icons';
import { Sheet } from '../ui';

/* GAMEBAR (DESIGN_SPEC §5) — filtro gioco persistente in cima a
   Home/Classifica/Storico. Mostra il gioco selezionato (icona+nome in
   accento); tap → elenco dal catalogo. Al cambio gioco lo store aggiorna
   `giocoFiltro` e ShellLayout ri-tema l'app. Predispone le impostazioni
   "nascondi barra" e "gioco fisso" (TAVOLO_LIVE_SPEC §7), minimali. */
export default function GameBar() {
  const giocoFiltro       = useStore(s => s.giocoFiltro);
  const setGiocoFiltro    = useStore(s => s.setGiocoFiltro);
  const gameBarVisible    = useStore(s => s.gameBarVisible);
  const setGameBarVisible = useStore(s => s.setGameBarVisible);
  const gameBarPinned     = useStore(s => s.gameBarPinned);
  const setGameBarPinned  = useStore(s => s.setGameBarPinned);
  const [open, setOpen] = useState(false);

  const gioco = GIOCHI_PREIMPOSTATI.find(g => g.id === giocoFiltro);
  const icona = gioco?.icona ?? 'mazzo';
  const nome  = gioco?.nome  ?? 'Gioco';

  if (!gameBarVisible) {
    return (
      <button className="gamebar-show" onClick={() => setGameBarVisible(true)}>
        Mostra barra giochi
      </button>
    );
  }

  function scegli(id: string) {
    setGiocoFiltro(id);
    setOpen(false);
  }

  return (
    <>
      <div className="gamebar">
        <button
          className="gamebar-current"
          onClick={() => { if (!gameBarPinned) setOpen(true); }}
          disabled={gameBarPinned}
        >
          <span className="gamebar-ico"><GameIcon icona={icona} size={22} /></span>
          <span className="gamebar-nome">{nome}</span>
          {gameBarPinned
            ? <span className="gamebar-pin">fisso</span>
            : <IconChevronDown size={18} />}
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Scegli gioco">
        <div className="gamebar-list">
          {GIOCHI_PREIMPOSTATI.map(g => (
            <button
              key={g.id}
              className={`gamebar-item${g.id === giocoFiltro ? ' selected' : ''}`}
              onClick={() => scegli(g.id)}
            >
              <span className="gamebar-item-ico"><GameIcon icona={g.icona} size={24} /></span>
              <span className="gamebar-item-nome">{g.nome}</span>
            </button>
          ))}
        </div>

        <div className="gamebar-settings">
          <button className="gamebar-setting" onClick={() => setGameBarPinned(!gameBarPinned)}>
            {gameBarPinned ? 'Sblocca gioco' : 'Fissa questo gioco'}
          </button>
          <button
            className="gamebar-setting"
            onClick={() => { setGameBarVisible(false); setOpen(false); }}
          >
            Nascondi barra
          </button>
        </div>
      </Sheet>
    </>
  );
}
