import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { migrateLega } from '../../utils/migrations';
import { IconUsers, IconClose } from '../icons';
import type { Lega } from '../../types';

export default function NuovaLega() {
  const navigate = useNavigate();
  const toast    = useStore(s => s.toast);
  const dbLid    = useStore(s => s.db._lid);
  const addLega  = useStore(s => s.addLega);
  const setCurrentLega = useStore(s => s.setCurrentLega);

  const [foto, setFoto] = useState('');
  const [nome, setNome] = useState('');
  const [partecipanti, setPartecipanti] = useState<string[]>(['', '']);

  const fotoInputRef = useRef<HTMLInputElement>(null);

  function caricaFoto(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setFoto(e.target?.result as string ?? '');
    reader.readAsDataURL(file);
  }

  function aggiungiCampo() {
    setPartecipanti(prev => [...prev, '']);
  }

  function rimuoviCampo(idx: number) {
    setPartecipanti(prev => prev.filter((_, i) => i !== idx));
  }

  function aggiornaCampo(idx: number, val: string) {
    setPartecipanti(prev => prev.map((v, i) => i === idx ? val : v));
  }

  function creaLega() {
    const nomeTrimmed = nome.trim();
    if (!nomeTrimmed) { toast('Inserisci il nome della lega'); return; }

    const nomiList: Lega['nomi'] = [];
    let nid = 1;
    partecipanti.forEach(p => {
      const v = p.trim();
      if (v && !nomiList.some(n => n.nome.toLowerCase() === v.toLowerCase())) {
        nomiList.push({ id: nid++, nome: v });
      }
    });

    const nuovaLega: Lega = {
      id: dbLid,
      nome: nomeTrimmed,
      foto: foto || '',
      nomi: nomiList,
      partite: [],
      sessioneAttiva: undefined,
      serate_bg: [],
      _nid: nid,
      _pid: 1,
    };
    // Inizializza subito i campi multigioco (sessioniGioco/_sgid/personale),
    // così la lega è pronta senza aspettare la migrazione al prossimo avvio.
    migrateLega(nuovaLega);

    addLega(nuovaLega);
    setCurrentLega(nuovaLega.id);
    toast('Lega creata!');
    navigate(`/leghe/${nuovaLega.id}`);
  }

  return (
    <>
      <header className="app-header">
        <button className="hdr-back" onClick={() => navigate('/leghe')}>‹</button>
        <div className="hdr-center"><h1>Nuova lega</h1></div>
        <div className="hdr-right" />
      </header>

      <div className="screen-body">
        <div className="card">
          <div className="card-title">Foto del circolo</div>
          <div className="photo-picker">
            <div
              className={`photo-preview${foto ? ' filled' : ''}`}
              onClick={() => fotoInputRef.current?.click()}
            >
              {foto ? <img src={foto} alt="foto lega" /> : <IconUsers size={38} />}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fotoInputRef}
              onChange={caricaFoto}
            />
            <span className="photo-hint">Tocca per scegliere una foto (opzionale)</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Nome della lega</div>
          <div className="form-row">
            <input
              type="text"
              placeholder="es. Lega del Mercoledì"
              maxLength={40}
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-title">Partecipanti</div>
          {partecipanti.map((val, idx) => (
            <div className="nuovo-part-row" key={idx}>
              <input
                type="text"
                placeholder="Nome partecipante"
                maxLength={25}
                autoCapitalize="words"
                value={val}
                onChange={e => aggiornaCampo(idx, e.target.value)}
              />
              <button
                type="button"
                className="btn-rem"
                onClick={() => rimuoviCampo(idx)}
              >
                <IconClose size={16} />
              </button>
            </div>
          ))}
          <button
            className="btn btn-outline btn-block"
            onClick={aggiungiCampo}
          >
            + Aggiungi partecipante
          </button>
        </div>

        <button className="btn btn-green btn-block" onClick={creaLega}>
          Crea lega
        </button>
      </div>
    </>
  );
}
