import { useStore } from '../../store/useStore';
import { euro, getNome } from '../../utils/format';
import { computeLive } from '../../hooks/useComputeLive';
import type { Lega, Sessione } from '../../types';

interface Props {
  lega: Lega;
  sess: Sessione;
  onRimuovi?: (idNome: number) => void;
}

export default function TavoloView({ lega, sess, onRimuovi }: Props) {
  const toggleEntrato = useStore(s => s.toggleEntrato);
  const isCash = sess.modalita === 'cash';

  const { arr: liveArr } = computeLive(isCash ? sess : undefined);
  const liveMap = new Map(liveArr.map(g => [g.id_nome, g]));

  const entrati    = sess.giocatori.filter(g => g.entrato && g.seat);
  const daEntrare  = sess.giocatori.filter(g => !g.entrato);

  // Raggruppa per tavolo
  const tavoliMap = new Map<number, typeof entrati>();
  for (const g of entrati) {
    const t = g.seat!.tavolo;
    if (!tavoliMap.has(t)) tavoliMap.set(t, []);
    tavoliMap.get(t)!.push(g);
  }
  const tavoliNums = [...tavoliMap.keys()].sort((a, b) => a - b);

  return (
    <div className="tavolo-view">

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
                  Tavolo {tNum} — {gioc.length}/{9}
                </div>

                {Array.from({ length: 9 }, (_, i) => {
                  const posto = i + 1;
                  const g = gioc.find(x => x.seat?.posto === posto);

                  if (!g) {
                    return (
                      <div key={posto} className="seat-row">
                        <span className="seat-num">{posto}</span>
                        <span className="seat-empty">libero</span>
                      </div>
                    );
                  }

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
                    <div key={posto} className={`seat-row${mancante > 0.005 ? ' seat-row--debt' : ''}`}>
                      <span className="seat-num">{posto}</span>
                      <div className="seat-info">
                        <span className="seat-name">{nome}</span>
                        <span className="seat-money">
                          €{euro(dovuto)}
                          {versato > 0 && ` · vers. €${euro(versato)}`}
                          {mancante > 0.005 && <span className="seat-debt"> ⚠ −€{euro(mancante)}</span>}
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

      {/* ── Entrati senza seat (edge case, sessioni precedenti a T2) ── */}
      {sess.giocatori.filter(g => g.entrato && !g.seat).map(g => (
        <div key={g.id_nome} className="da-entrare">
          <div className="da-entrare-row">
            <span className="de-name">{getNome(lega, g.id_nome)}</span>
            <span className="seat-empty">nessun posto</span>
          </div>
        </div>
      ))}
    </div>
  );
}
