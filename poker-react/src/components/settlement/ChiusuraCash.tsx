import { useStore } from '../../store/useStore';
import type { SettlementState } from '../../types';
import { euro } from '../../utils/format';

/* ══════════════════════════════════════════════════════
   CHIUSURA CASH — contenuto settlement cash game
   Derivato da renderSettlementHtml() in session-cash.js
══════════════════════════════════════════════════════ */

interface Props { legaId: number; }

export default function ChiusuraCash({ legaId }: Props) {
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

  return (
    <div>
      {/* ── Riepilogo ── */}
      <div className="settle-totalbar">
        <div className="stt-item">
          <div className="stt-lbl">Giocatori</div>
          <div className="stt-val">{settlement.entrati.length}</div>
        </div>
        <div className="stt-item">
          <div className="stt-lbl">Da pagare</div>
          <div className="stt-val">{settlement.losers.length}</div>
        </div>
        <div className="stt-item">
          <div className="stt-lbl">Da ricevere</div>
          <div className="stt-val">{settlement.winners.length}</div>
        </div>
      </div>

      {/* ── Da pagare (debitori) ── */}
      {settlement.losers.length > 0 && (
        <>
          <div className="settle-section-title">Da pagare</div>
          {settlement.losers.map(loser => {
            const allocs   = settlement.allocazioni[loser.id_nome] ?? [];
            const allocato = Math.round(allocs.reduce((a, x) => a + x.amount, 0) * 100) / 100;
            const residuo  = Math.round((loser.mancante - allocato) * 100) / 100;
            return (
              <div key={loser.id_nome} className="settle-card">
                <div className="settle-head">
                  <span className="settle-name">{nomeDi(loser.id_nome)}</span>
                  <span className="settle-amount neg">−€{euro(loser.mancante)}</span>
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
                      ? '✓ Bilanciato'
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

      {/* ── Da ricevere (creditori) ── */}
      {settlement.winners.length > 0 && (
        <>
          <div className="settle-section-title">Da ricevere</div>
          {settlement.winners.map(w => {
            const allocato = winnerAllocato(w.id_nome);
            return (
              <div key={w.id_nome} className="settle-card winner-card">
                <div className="settle-head">
                  <span className="settle-name">{nomeDi(w.id_nome)}</span>
                  <span className="settle-amount pos">+€{euro(w.netto)}</span>
                </div>
                <div className="settle-info-txt">
                  Riceve: €{euro(allocato)} / €{euro(w.netto)}
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
