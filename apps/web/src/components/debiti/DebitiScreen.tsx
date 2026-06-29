import { useNavigate } from 'react-router-dom';
import { useStore, selectCurrentLega } from '../../store/useStore';
import { getNome, euro, fmtData } from '@whos-the-boss/core';
import { IconCoins, IconCheck } from '../icons';
import type { Settlement } from '@whos-the-boss/core';

interface DebitoItem {
  partitaId: number;
  partitaData: string;
  idx: number;
  settlement: Settlement;
}

export default function DebitiScreen() {
  const navigate         = useNavigate();
  const lega             = useStore(selectCurrentLega);
  const saldaDebito  = useStore(s => s.saldaDebito);
  const saldaTuttiDi = useStore(s => s.saldaTuttiDi);
  const toast        = useStore(s => s.toast);

  function doSaldaDebito(partitaId: number, idx: number) {
    saldaDebito(lega!.id, partitaId, idx);
    toast('Pagamento registrato');
  }

  function doSaldaTutti(debtorId: number) {
    const n = saldaTuttiDi(lega!.id, debtorId);
    toast(`${n} pagament${n === 1 ? 'o' : 'i'} registrat${n === 1 ? 'o' : 'i'}`);
  }

  function doSaldaTuttiDebiti() {
    if (!confirm('Saldare TUTTI i debiti aperti della lega? L\'operazione non è reversibile.')) return;
    const n = saldaTuttiDi(lega!.id);
    toast(`${n} debiti saldati`);
  }

  if (!lega) {
    return (
      <>
        <header className="app-header">
          <button className="hdr-back" onClick={() => navigate(-1)}>‹</button>
          <div className="hdr-center"><h1>Debiti</h1></div>
          <div className="hdr-right" />
        </header>
        <div className="screen-body">
          <div className="empty">
            <div className="eico"><IconCoins size={46} /></div>
            <p>Seleziona una lega per vedere i debiti.</p>
          </div>
        </div>
      </>
    );
  }

  /* Raggruppa i debiti aperti per debitore */
  const byDebtor = new Map<number, DebitoItem[]>();
  for (const partita of lega.partite) {
    partita.settlements.forEach((s, idx) => {
      if (s.pagato) return;
      const list = byDebtor.get(s.from) ?? [];
      list.push({ partitaId: partita.id, partitaData: partita.data, idx, settlement: s });
      byDebtor.set(s.from, list);
    });
  }

  const debtorIds = [...byDebtor.keys()];

  return (
    <>
      <header className="app-header">
        <button className="hdr-back" onClick={() => navigate(-1)}>‹</button>
        <div className="hdr-center">
          <h1>Debiti aperti</h1>
          <p>{lega.nome}</p>
        </div>
        <div className="hdr-right" />
      </header>

      <div className="screen-body">
        {/* Pulsante globale "Salda tutti i debiti" */}
        {debtorIds.length > 0 && (
          <div className="debiti-salda-all-row">
            <button
              className="btn btn-green btn-block"
              onClick={doSaldaTuttiDebiti}
            >
              Salda tutti i debiti della lega
            </button>
          </div>
        )}

        {debtorIds.length === 0 ? (
          <div className="empty">
            <div className="eico"><IconCheck size={46} /></div>
            <p>Nessun debito aperto!</p>
          </div>
        ) : (
          debtorIds.map(debtorId => {
            const debiti  = byDebtor.get(debtorId) ?? [];
            const totale  = debiti.reduce((acc, d) => acc + d.settlement.amount, 0);

            return (
              <div key={debtorId} className="debt-card">
                {/* Intestazione debitore */}
                <div className="debt-header">
                  <span className="debt-name">{getNome(lega, debtorId)}</span>
                  <span className="debt-total">{euro(totale)}</span>
                </div>

                {/* Lista singoli debiti */}
                {debiti.map(d => (
                  <div key={`${d.partitaId}-${d.idx}`} className="debt-item">
                    <div className="debt-info">
                      <div className="debt-arrow">
                        deve a <strong>{getNome(lega, d.settlement.to)}</strong>
                      </div>
                      <div className="debt-meta">{fmtData(d.partitaData)}</div>
                    </div>
                    <span className="debt-amount">{euro(d.settlement.amount)}</span>
                    <button
                      className="btn btn-sm btn-green"
                      onClick={() => doSaldaDebito(d.partitaId, d.idx)}
                    >
                      Salda
                    </button>
                  </div>
                ))}

                {/* Salda tutti del debitore */}
                <div className="debt-salda-row">
                  <button
                    className="btn btn-green btn-block"
                    onClick={() => doSaldaTutti(debtorId)}
                  >
                    Salda tutti ({euro(totale)})
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
