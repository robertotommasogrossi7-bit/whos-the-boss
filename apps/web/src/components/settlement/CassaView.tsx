import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { euro } from '@poker/core';
import { IconCheck, IconWarning, IconChevronUp, IconChevronDown } from '../icons';
import type { CashSettlementResult } from '@poker/core';

/* ══════════════════════════════════════════════════════
   SCHERMATA CASSA (§6 SETTLEMENT_SPEC)
   Mostra:
   - Totale nel piatto vs totale dovuto + indicatore quadratura
   - Pulsante "Di chi sono i soldi" → breakdown a scomparsa
══════════════════════════════════════════════════════ */

interface Props {
  legaId:   number;
  cashResult: CashSettlementResult;
}

export default function CassaView({ legaId, cashResult }: Props) {
  const lega = useStore(s => s.db.leghe.find(l => l.id === legaId));
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!lega) return null;

  const nomeDi = (id: number) => lega.nomi.find(n => n.id === id)?.nome ?? '?';

  const { piatto, giocatori } = cashResult;
  const diff  = Math.round((piatto.totaleVersato - piatto.totaleDovuto) * 100) / 100;
  const quadra = Math.abs(diff) <= 0.01;
  const sbilancioFiche = Math.abs(giocatori.reduce((a, g) => a + g.netto, 0));

  return (
    <div className="cassa-view">
      <div className="settle-section-title">Il Piatto (Cassa)</div>

      {/* Totali */}
      <div className="cassa-totals">
        <div className="cassa-row">
          <span className="cassa-lbl">Totale nel piatto</span>
          <span className="cassa-val">€{euro(piatto.totaleVersato)}</span>
        </div>
        <div className="cassa-row">
          <span className="cassa-lbl">Totale dovuto</span>
          <span className="cassa-val">€{euro(piatto.totaleDovuto)}</span>
        </div>

        {/* Indicatore quadratura */}
        <div className={`cassa-quadratura ${quadra ? 'ok' : 'warn'}`}>
          {quadra
            ? <><IconCheck size={13} className="ico-inline" /> Cassa quadra</>
            : diff > 0
              ? <><IconWarning size={13} className="ico-inline" /> Eccedenza in cassa: +€{euro(Math.abs(diff))}</>
              : <><IconWarning size={13} className="ico-inline" /> Cassa scoperta: −€{euro(Math.abs(diff))}</>
          }
        </div>

        {/* Sbilancio fiche globale */}
        {sbilancioFiche > 0.01 && (
          <div className="cassa-quadratura warn">
            <IconWarning size={13} className="ico-inline" /> Le fiche non quadrano (sbilancio €{euro(sbilancioFiche)}) — contarle di nuovo
          </div>
        )}
      </div>

      {/* Breakdown "Di chi sono i soldi" */}
      <button
        className="btn btn-outline btn-sm btn--full-mt"
        onClick={() => setShowBreakdown(v => !v)}
      >
        {showBreakdown
          ? <><IconChevronUp size={14} className="ico-inline" /> Nascondi</>
          : <><IconChevronDown size={14} className="ico-inline" /> Di chi sono i soldi</>}
      </button>

      {showBreakdown && (
        <div className="cassa-breakdown">
          {piatto.breakdown.map(b => (
            <div key={b.id_nome} className="cassa-breakdown-row">
              <span className="cassa-bd-name">{nomeDi(b.id_nome)}</span>
              <span className="cassa-bd-versato">
                versato €{euro(b.versato)}
                {b.eccedenza > 0.005 && (
                  <span className="cassa-eccedenza"> (eccedenza €{euro(b.eccedenza)} → restituita)</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
