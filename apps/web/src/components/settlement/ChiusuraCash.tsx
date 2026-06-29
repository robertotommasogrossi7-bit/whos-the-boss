import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { euro, euroSigned } from '@poker/core';
import { IconCheck, IconClose, IconWarning } from '../icons';
import type { CashSettlementResult, Trasferimento } from '@poker/core';

/* ══════════════════════════════════════════════════════
   SCHERMATA TRASFERIMENTI (§7, §9, §10 SETTLEMENT_SPEC)
   "CHI DÀ CONTANTI A CHI" — solo i contanti veri (mancante').
   Lista modificabile: edit importo, aggiungi, elimina.
   Check bilanciamento per giocatore (§10) — non bloccante.
══════════════════════════════════════════════════════ */

interface Props {
  legaId:      number;
  cashResult:  CashSettlementResult;
  trasferimenti: Trasferimento[];   // computed o overrides
}

export default function ChiusuraCash({ legaId, cashResult, trasferimenti }: Props) {
  const lega              = useStore(s => s.db.leghe.find(l => l.id === legaId));
  const setTrasferimento  = useStore(s => s.setTrasferimento);
  const addTrasferimento  = useStore(s => s.addTrasferimento);
  const removeTrasferimento = useStore(s => s.removeTrasferimento);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addFrom, setAddFrom]   = useState<number | ''>('');
  const [addTo, setAddTo]       = useState<number | ''>('');
  const [addAmt, setAddAmt]     = useState('');

  if (!lega) return null;
  const nomeDi = (id: number) => lega.nomi.find(n => n.id === id)?.nome ?? '?';
  const { giocatori } = cashResult;
  const entrati = giocatori.map(g => ({ id: g.id_nome, nome: nomeDi(g.id_nome) }));

  /* Sbilancio per giocatore vs netto atteso (§10) */
  function delta(idNome: number): number {
    const g    = giocatori.find(x => x.id_nome === idNome)!;
    const paga = trasferimenti.filter(t => t.from === idNome).reduce((a, t) => a + t.importo, 0);
    const rice = trasferimenti.filter(t => t.to   === idNome).reduce((a, t) => a + t.importo, 0);
    // La posizione attesa per un giocatore senza bisogno è coperta dal piatto.
    // Sbilancio = (rice - paga) - (netto - versatoLegittimo - eccedenza)
    // semplificato: il trasferimento copre il bisogno di c
    const expected = g.mancanteP > 0.005 ? -g.mancanteP : g.bisogno;
    const actual   = rice - paga;
    return Math.round((actual - expected) * 100) / 100;
  }

  function handleAdd() {
    if (!addFrom || !addTo || addFrom === addTo) return;
    const v = parseFloat(String(addAmt).replace(',', '.'));
    if (isNaN(v) || v <= 0) return;
    addTrasferimento(legaId, { from: Number(addFrom), to: Number(addTo), importo: Math.round(v * 100) / 100 });
    setAddFrom(''); setAddTo(''); setAddAmt(''); setShowAddForm(false);
  }

  return (
    <div className="trasferimenti-view">
      <div className="settle-section-title">Chi dà contanti a chi</div>

      {trasferimenti.length === 0 ? (
        <div className="cassa-no-transfer">
          <div className="cassa-ok-icon"><IconCheck size={28} /></div>
          <p>Nessun contante da scambiare — il piatto si bilancia da solo.</p>
        </div>
      ) : (
        <div className="trasf-list">
          {trasferimenti.map((t, idx) => (
            <div key={idx} className="trasf-row">
              <span className="trasf-from">{nomeDi(t.from)}</span>
              <span className="trasf-arrow">→</span>
              <span className="trasf-to">{nomeDi(t.to)}</span>
              <span className="trasf-eur">€</span>
              <input
                type="number"
                className="trasf-input"
                min="0"
                step="0.5"
                value={t.importo}
                onChange={e => setTrasferimento(legaId, idx, Number(e.target.value))}
              />
              <button
                className="btn-icon btn-icon--del"
                onClick={() => removeTrasferimento(legaId, idx)}
                title="Elimina"
              >
                <IconClose size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Aggiungi manuale */}
      {!showAddForm ? (
        <button
          className="btn btn-outline btn-sm btn--full-mt"
          onClick={() => setShowAddForm(true)}
        >
          + Aggiungi trasferimento
        </button>
      ) : (
        <div className="trasf-add-form">
          <select value={addFrom} onChange={e => setAddFrom(Number(e.target.value) || '')}>
            <option value="">Da…</option>
            {entrati.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
          <select value={addTo} onChange={e => setAddTo(Number(e.target.value) || '')}>
            <option value="">A…</option>
            {entrati.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
          <input
            type="number"
            placeholder="€"
            min="0"
            step="0.5"
            value={addAmt}
            onChange={e => setAddAmt(e.target.value)}
          />
          <button className="btn btn-green btn-sm" onClick={handleAdd}>OK</button>
          <button className="btn btn-gray btn-sm" onClick={() => setShowAddForm(false)}><IconClose size={15} /></button>
        </div>
      )}

      {/* Check bilanciamento §10 */}
      <div className="settle-section-title settle-section-title--sub">Verifica bilanciamento</div>
      <div className="balance-check">
        {giocatori.map(g => {
          const d  = delta(g.id_nome);
          const ok = Math.abs(d) <= 0.01;
          return (
            <div key={g.id_nome} className={`balance-row ${ok ? 'ok' : 'warn'}`}>
              <span className="balance-name">{nomeDi(g.id_nome)}</span>
              <span className="balance-netto">netto {euroSigned(g.netto)}</span>
              <span className="balance-status">
                {ok
                  ? <IconCheck size={14} className="ico-inline" />
                  : <><IconWarning size={13} className="ico-inline" /> {d > 0 ? '+' : ''}{euro(Math.abs(d))}</>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
