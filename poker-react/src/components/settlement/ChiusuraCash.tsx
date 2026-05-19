import { useStore } from '../../store/useStore';
import { round2, type Trasferimento } from '../../utils/settlement';
import { euro, euroSigned } from '../../utils/format';

/* ══════════════════════════════════════════════════════
   CHIUSURA CASH — trasferimenti finali del cash game
   Implementa SETTLEMENT_SPEC §8 (override manuale) e §9 (check).
══════════════════════════════════════════════════════ */

interface Props { legaId: number; }

export default function ChiusuraCash({ legaId }: Props) {
  const settlement           = useStore(s => s.settlement);
  const lega                 = useStore(s => s.db.leghe.find(l => l.id === legaId));
  const setTrasferimentiCash = useStore(s => s.setTrasferimentiCash);

  if (!lega || !settlement || settlement.isTorneo) return null;

  const { giocatori, trasferimenti, sbilancio } = settlement;
  const nomeDi = (id: number) => lega.nomi.find(n => n.id === id)?.nome ?? '?';

  /* Posizione risultante di un giocatore dai trasferimenti attuali (§9) */
  const risultanteDi = (id: number) => {
    let r = 0;
    trasferimenti.forEach(t => {
      if (t.to === id)   r += t.importo;
      if (t.from === id) r -= t.importo;
    });
    return round2(r);
  };

  const aggiorna = (next: Trasferimento[]) => setTrasferimentiCash(legaId, next);

  const setRiga = (i: number, patch: Partial<Trasferimento>) =>
    aggiorna(trasferimenti.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const eliminaRiga = (i: number) =>
    aggiorna(trasferimenti.filter((_, idx) => idx !== i));

  const aggiungiRiga = () => {
    const from = giocatori[0]?.id_nome ?? 0;
    const to   = giocatori[1]?.id_nome ?? from;
    aggiorna([...trasferimenti, { from, to, importo: 0 }]);
  };

  const sbilanciato = Math.abs(sbilancio) >= 0.01;

  return (
    <div>
      {/* ── Riepilogo ── */}
      <div className="settle-totalbar">
        <div className="stt-item">
          <div className="stt-lbl">Giocatori</div>
          <div className="stt-val">{giocatori.length}</div>
        </div>
        <div className="stt-item">
          <div className="stt-lbl">Trasferimenti</div>
          <div className="stt-val">{trasferimenti.length}</div>
        </div>
        <div className="stt-item">
          <div className="stt-lbl">Sbilancio</div>
          <div className={`stt-val${sbilanciato ? ' stt-val--bad' : ''}`}>€{euro(sbilancio)}</div>
        </div>
      </div>

      {sbilanciato && (
        <div className="settle-warning">
          ⚠ Le fiche non quadrano: somma dei netti {euroSigned(sbilancio)}. Controlla
          il conteggio delle fiche, oppure procedi comunque.
        </div>
      )}

      {/* ── Risultato dei giocatori (netto + check §9) ── */}
      <div className="settle-section-title">Risultato giocatori</div>
      {giocatori.map(g => {
        const ris = risultanteDi(g.id_nome);
        const ok  = Math.abs(ris - g.netto) < 0.01;
        const cls = g.netto > 0.005 ? 'pos' : g.netto < -0.005 ? 'neg' : '';
        return (
          <div key={g.id_nome} className="settle-card">
            <div className="settle-head">
              <span className="settle-name">{nomeDi(g.id_nome)}</span>
              <span className={`settle-amount ${cls}`}>{euroSigned(g.netto)}</span>
            </div>
            <div className={`settle-check ${ok ? 'ok' : 'bad'}`}>
              {ok
                ? '✓ Trasferimenti bilanciati'
                : `⚠ Dai trasferimenti risulta ${euroSigned(ris)} (atteso ${euroSigned(g.netto)})`}
            </div>
          </div>
        );
      })}

      {/* ── Trasferimenti — modificabili, aggiungibili, eliminabili (§8) ── */}
      <div className="settle-section-title">Trasferimenti — chi dà contanti a chi</div>
      {trasferimenti.length === 0 && (
        <div className="settle-info-txt">
          Nessun trasferimento: nessuno deve passare contante.
        </div>
      )}
      {trasferimenti.map((t, i) => (
        <div key={i} className="trasf-row">
          <select
            className="trasf-sel"
            value={t.from}
            onChange={e => setRiga(i, { from: Number(e.target.value) })}
          >
            {giocatori.map(g => (
              <option key={g.id_nome} value={g.id_nome}>{nomeDi(g.id_nome)}</option>
            ))}
          </select>
          <span className="trasf-arrow">→</span>
          <select
            className="trasf-sel"
            value={t.to}
            onChange={e => setRiga(i, { to: Number(e.target.value) })}
          >
            {giocatori.map(g => (
              <option key={g.id_nome} value={g.id_nome}>{nomeDi(g.id_nome)}</option>
            ))}
          </select>
          <span className="trasf-eur">€</span>
          <input
            className="trasf-amt"
            type="number"
            min="0"
            step="0.5"
            inputMode="decimal"
            value={t.importo || ''}
            onChange={e =>
              setRiga(i, {
                importo: round2(Math.max(0, parseFloat(e.target.value.replace(',', '.')) || 0)),
              })
            }
          />
          <button
            className="trasf-del"
            onClick={() => eliminaRiga(i)}
            title="Elimina trasferimento"
          >
            ✕
          </button>
        </div>
      ))}

      <button className="btn btn-outline btn-sm btn--full-mt" onClick={aggiungiRiga}>
        + Aggiungi trasferimento
      </button>
    </div>
  );
}
