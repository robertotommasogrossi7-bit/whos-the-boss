import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { euro, getNome } from '../../utils/format';
import { computeLive } from '../../hooks/useComputeLive';
import type { Lega, Sessione, GiocatoreSessione } from '../../types';

interface Props {
  lega: Lega;
  sess: Sessione;
  onRimuovi?: (idNome: number) => void;
}

export default function TavoloView({ lega, sess, onRimuovi }: Props) {
  const toggleEntrato       = useStore(s => s.toggleEntrato);
  const spostaGiocatore     = useStore(s => s.spostaGiocatore);
  const riequilibraSeat     = useStore(s => s.riequilibraSeat);
  const aggiungiEFaiEntrare = useStore(s => s.aggiungiEFaiEntrare);

  const [spostaId, setSpostaId]   = useState<number | null>(null);
  const [nomeNuovo, setNomeNuovo] = useState('');

  const isCash = sess.modalita === 'cash';
  const { arr: liveArr } = computeLive(isCash ? sess : undefined);
  const liveMap = new Map(liveArr.map(g => [g.id_nome, g]));

  const entrati   = sess.giocatori.filter(g => g.entrato && g.seat);
  const daEntrare = sess.giocatori.filter(g => !g.entrato);

  // Raggruppa per tavolo
  const tavoliMap = new Map<number, GiocatoreSessione[]>();
  for (const g of entrati) {
    const t = g.seat!.tavolo;
    if (!tavoliMap.has(t)) tavoliMap.set(t, []);
    tavoliMap.get(t)!.push(g);
  }
  const tavoliNums = [...tavoliMap.keys()].sort((a, b) => a - b);

  // Segnale riequilibrio: tavolo con ≤3 giocatori
  const needsRebalance = tavoliNums.length > 1
    && tavoliNums.some(t => (tavoliMap.get(t) ?? []).length <= 3);

  // Clic su un posto: selezione, swap o spostamento
  function handlePostoClick(tavolo: number, posto: number, occupante: GiocatoreSessione | undefined) {
    if (spostaId === null) {
      if (occupante) setSpostaId(occupante.id_nome);
    } else {
      if (occupante?.id_nome === spostaId) {
        setSpostaId(null); // annulla
      } else {
        spostaGiocatore(lega.id, spostaId, tavolo, posto);
        setSpostaId(null);
      }
    }
  }

  function handleRiequilibra() {
    if (!confirm(
      'Riequilibrare i tavoli?\n\nVerranno spostati il minimo indispensabile di giocatori.',
    )) return;
    riequilibraSeat(lega.id);
    setSpostaId(null);
  }

  function handleAggiungi() {
    const n = nomeNuovo.trim();
    if (!n) return;
    aggiungiEFaiEntrare(lega.id, n);
    setNomeNuovo('');
  }

  const spostaName = spostaId !== null ? getNome(lega, spostaId) : '';

  return (
    <div className="tavolo-view">

      {/* ── Banner sposta mode ── */}
      {spostaId !== null && (
        <div className="sposta-banner">
          <span>Sposta <strong>{spostaName}</strong> — tocca il posto di destinazione</span>
          <button className="btn btn-gray btn-sm" onClick={() => setSpostaId(null)}>
            Annulla
          </button>
        </div>
      )}

      {/* ── Griglia tavoli ── */}
      {tavoliNums.length > 0 && (
        <div className="seat-grid">
          {tavoliNums.map(tNum => {
            const gioc = [...(tavoliMap.get(tNum) ?? [])].sort(
              (a, b) => (a.seat?.posto ?? 0) - (b.seat?.posto ?? 0),
            );

            return (
              <div key={tNum} className="seat-table">
                <div className="seat-table-title">
                  Tavolo {tNum} — {gioc.length}/9
                  {gioc.length <= 3 && tavoliNums.length > 1 && (
                    <span className="seat-table-warn"> ⚠ pochi giocatori</span>
                  )}
                </div>

                {Array.from({ length: 9 }, (_, i) => {
                  const posto = i + 1;
                  const g = gioc.find(x => x.seat?.posto === posto);
                  const isMoving = g?.id_nome === spostaId;
                  const isTarget = spostaId !== null && !isMoving;

                  const rowClass = [
                    'seat-row',
                    isMoving ? 'seat-row--moving' : '',
                    isTarget ? 'seat-row--target' : '',
                  ].filter(Boolean).join(' ');

                  if (!g) {
                    return (
                      <div
                        key={posto}
                        className={rowClass}
                        onClick={() => handlePostoClick(tNum, posto, undefined)}
                        style={{ cursor: spostaId !== null ? 'pointer' : 'default' }}
                      >
                        <span className="seat-num">{posto}</span>
                        <span className="seat-empty">
                          {isTarget ? '→ sposta qui' : 'libero'}
                        </span>
                      </div>
                    );
                  }

                  // Occupied seat
                  const nome = getNome(lega, g.id_nome);
                  let dovuto: number, versato: number;
                  if (isCash) {
                    const live = liveMap.get(g.id_nome);
                    dovuto  = live?.dovuto  ?? 0;
                    versato = live?.versato ?? 0;
                  } else {
                    dovuto  = sess.buy_in
                      + (g.rebuys ?? []).reduce((a, r) => a + r.importo, 0)
                      + (g.add_on_fatto && sess.add_on ? sess.add_on.prezzo : 0);
                    versato = (g.buy_in_pagato ? sess.buy_in : 0)
                      + (g.rebuys ?? []).reduce((a, r) => a + (r.pagata ? r.importo : 0), 0)
                      + (g.add_on_fatto && g.add_on_pagato && sess.add_on ? sess.add_on.prezzo : 0);
                  }
                  const mancante = Math.max(0, dovuto - versato);

                  return (
                    <div
                      key={posto}
                      className={`${rowClass}${mancante > 0.005 ? ' seat-row--debt' : ''}`}
                      onClick={() => handlePostoClick(tNum, posto, g)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="seat-num">{posto}</span>
                      <div className="seat-info">
                        <span className="seat-name">
                          {isTarget ? '⇄ ' : ''}{nome}
                        </span>
                        <span className="seat-money">
                          €{euro(dovuto)}
                          {versato > 0 && ` · vers. €${euro(versato)}`}
                          {mancante > 0.005 && (
                            <span className="seat-debt"> ⚠ −€{euro(mancante)}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Azioni tavolo: riequilibra ── */}
      {tavoliNums.length > 0 && (
        <div className="tavolo-actions">
          <button
            className={`btn btn-sm btn-block ${needsRebalance ? 'btn-gold' : 'btn-gray'}`}
            onClick={handleRiequilibra}
          >
            {needsRebalance ? '⚠ Riequilibra tavoli' : '↺ Riequilibra tavoli'}
          </button>
        </div>
      )}

      {/* ── Da far entrare ── */}
      {daEntrare.length > 0 && (
        <div className="da-entrare">
          <div className="da-entrare-title">In attesa di entrare ({daEntrare.length})</div>
          {daEntrare.map(g => {
            const nome = getNome(lega, g.id_nome);
            return (
              <div key={g.id_nome} className="da-entrare-row">
                <span className="de-name">{nome}</span>
                <button
                  className="btn btn-green btn-sm"
                  onClick={() => toggleEntrato(lega.id, g.id_nome)}
                >
                  Entra
                </button>
                {onRimuovi && (
                  <button
                    className="btn btn-gray btn-sm"
                    onClick={() => {
                      if (!confirm(`Rimuovere ${nome} dalla serata?`)) return;
                      onRimuovi(g.id_nome);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Aggiungi giocatore in corsa ── */}
      <div className="da-entrare">
        <div className="da-entrare-title">Aggiungi giocatore in corsa</div>
        <div className="de-add-row">
          <input
            type="text"
            className="de-add-input"
            placeholder="Nome giocatore…"
            value={nomeNuovo}
            onChange={e => setNomeNuovo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAggiungi(); }}
          />
          <button
            className="btn btn-green btn-sm"
            disabled={!nomeNuovo.trim()}
            onClick={handleAggiungi}
          >
            Siedi
          </button>
        </div>
      </div>

      {/* ── Entrati senza seat (sessioni precedenti a T2) ── */}
      {sess.giocatori.filter(g => g.entrato && !g.seat).map(g => (
        <div key={g.id_nome} className="da-entrare">
          <div className="da-entrare-row">
            <span className="de-name">{getNome(lega, g.id_nome)}</span>
            <span className="seat-empty">nessun posto assegnato</span>
          </div>
        </div>
      ))}
    </div>
  );
}
