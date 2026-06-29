import { useStore } from '../../store/useStore';
import type { SettlementState } from '@whos-the-boss/core';
import { euro } from '@whos-the-boss/core';
import { IconCheck } from '../icons';

/* ══════════════════════════════════════════════════════
   CHIUSURA TORNEO — contenuto settlement torneo
   Derivato da renderSettlementTorneoHtml() in session-tournament.js
══════════════════════════════════════════════════════ */

interface Props { legaId: number; }

export default function ChiusuraTorneo({ legaId }: Props) {
  const settlement     = useStore(s => s.settlement) as SettlementState;
  const lega           = useStore(s => s.db.leghe.find(l => l.id === legaId));
  const setAllocazione = useStore(s => s.setAllocazione);

  if (!lega || !settlement) return null;

  const nomeDi = (id: number) => lega.nomi.find(n => n.id === id)?.nome ?? '?';

  const winnerAllocato = (winnerId: number) =>
    Math.round(
      Object.values(settlement.allocazioni)
        .flatMap(a => a)
        .filter(a => a.to === winnerId)
        .reduce((acc, a) => acc + a.amount, 0)
      * 100
    ) / 100;

  const sortedByPos = [...settlement.entrati].sort((a, b) =>
    (a.posizione_finale ?? 999) - (b.posizione_finale ?? 999)
  );

  const montepremi = settlement.sessione.premi?.reduce((s, p) => s + p.importo, 0) ?? 0;

  return (
    <div>
      {/* ── Riepilogo ── */}
      <div className="settle-totalbar">
        <div className="stt-item">
          <div className="stt-lbl">Giocatori</div>
          <div className="stt-val">{settlement.entrati.length}</div>
        </div>
        <div className="stt-item">
          <div className="stt-lbl">Montepremi</div>
          <div className="stt-val">€{euro(montepremi)}</div>
        </div>
        <div className="stt-item">
          <div className="stt-lbl">Da saldare</div>
          <div className="stt-val">{settlement.losers.length}</div>
        </div>
      </div>

      {/* ── Classifica finale ── */}
      <div className="settle-section-title">Classifica finale</div>
      <div className="card">
        {sortedByPos.map(p => {
          const pos    = p.posizione_finale;
          const premio = settlement.sessione.premi?.find(x => x.posizione === pos);
          return (
            <div key={p.id_nome} className="settle-rank-row">
              <span className="settle-rank-pos">{pos ?? '—'}</span>
              <span className="settle-rank-nome">{nomeDi(p.id_nome)}</span>
              {premio && <span className="settle-amount pos">€{euro(premio.importo)}</span>}
            </div>
          );
        })}
      </div>

      {/* ── Contributi da versare (losers = debitori buy-in/rebuy/addon) ── */}
      {settlement.losers.length > 0 && (
        <>
          <div className="settle-section-title">Contributi da versare</div>
          {settlement.losers.map(loser => {
            const allocs   = settlement.allocazioni[loser.id_nome] ?? [];
            const allocato = Math.round(allocs.reduce((a, x) => a + x.amount, 0) * 100) / 100;
            const residuo  = Math.round((loser.contributo_residuo - allocato) * 100) / 100;
            return (
              <div key={loser.id_nome} className="settle-card">
                <div className="settle-head">
                  <span className="settle-name">{nomeDi(loser.id_nome)}</span>
                  <span className="settle-amount neg">−€{euro(loser.contributo_residuo)}</span>
                </div>
                <div className="settle-info-txt">
                  Dovuto €{euro(loser.contributo_dovuto)} · Pagato €{euro(loser.contributo_pagato)}
                </div>
                <div className="settle-allocations">
                  {settlement.winners.map(w => {
                    const alloc = allocs.find(a => a.to === w.id_nome);
                    return (
                      <div key={w.id_nome} className="settle-alloc-row">
                        <span className="alloc-name">→ {nomeDi(w.id_nome)}</span>
                        <span className="alloc-eur">€</span>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={alloc?.amount ?? 0}
                          onChange={e =>
                            setAllocazione(legaId, loser.id_nome, w.id_nome, Number(e.target.value))
                          }
                        />
                      </div>
                    );
                  })}
                  <div className={`settle-remaining ${Math.abs(residuo) < 0.01 ? 'ok' : 'bad'}`}>
                    {Math.abs(residuo) < 0.01
                      ? <><IconCheck size={13} className="ico-inline" /> Bilanciato</>
                      : residuo > 0
                        ? `Residuo: −€${euro(residuo)}`
                        : `Eccesso: +€${euro(Math.abs(residuo))}`
                    }
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── Premi da ricevere (winners = chi ha premi ancora da incassare) ── */}
      {settlement.winners.length > 0 && (
        <>
          <div className="settle-section-title">Premi da ricevere</div>
          {settlement.winners.map(w => {
            const allocato = winnerAllocato(w.id_nome);
            return (
              <div key={w.id_nome} className="settle-card winner-card">
                <div className="settle-head">
                  <span className="settle-name">{nomeDi(w.id_nome)}</span>
                  <span className="settle-amount pos">€{euro(w.premio_dovuto)}</span>
                </div>
                <div className="settle-info-txt">
                  {w.prize_pagato
                    ? <><IconCheck size={13} className="ico-inline" /> Già ricevuto</>
                    : `Da ricevere €${euro(w.premio_residuo)} · Allocato €${euro(allocato)}`
                  }
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── In pari ── */}
      {settlement.neutri.length > 0 && (
        <>
          <div className="settle-section-title">In pari</div>
          {settlement.neutri.map(n => (
            <div key={n.id_nome} className="settle-card settle-card--neutro">
              <div className="settle-head">
                <span className="settle-name">{nomeDi(n.id_nome)}</span>
                <span className="settle-amount">—</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
