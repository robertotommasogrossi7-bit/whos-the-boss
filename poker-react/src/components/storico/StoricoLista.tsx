import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { fmtData, euro, getNome } from '../../utils/format';
import { GIOCHI_PREIMPOSTATI } from '../../utils/giochi';
import { esitoSessione, partitaInCorso } from '../../utils/sessioneGioco';
import { filtraStoricoPerNome, type VoceStorico } from '../../utils/storico';
import {
  GameIcon, IconHistory, IconTrash, IconTrophy, IconCrown,
  IconChevronUp, IconChevronDown, IconCheck,
} from '../icons';
import { Chip, EmptyState } from '../ui';
import type { Lega, Partita, SessioneGioco, PartitaGioco } from '../../types';

/* ══════════════════════════════════════════════════════
   STORICO CONDIVISO (#4.7b)
   UN componente per TUTTI i contesti (Personale / lega / poker), card
   PARAMETRICA su `voce.kind` (#4.6 vociStorico):
   - 'poker' → card identica a TabStorico (Cash/Torneo, ranking netto, settlement).
   - 'gioco' → card identica a StoricoSessioni (gioco/data/N partite, esiti).
   Filtro nome SECCO (filtraStoricoPerNome): le voci senza il nome SPARISCONO.
   Espandi/collassa LOCALE con chiave unificata `${kind}:${id}`.
══════════════════════════════════════════════════════ */

interface Props {
  lega:   Lega;
  voci:   VoceStorico[];
  query?: string;
}

export default function StoricoLista({ lega, voci, query = '' }: Props) {
  const eliminaPartita       = useStore(s => s.eliminaPartita);
  const eliminaSessioneGioco = useStore(s => s.eliminaSessioneGioco);
  const toggleSettlementPaid = useStore(s => s.toggleSettlementPaid);
  const toast                = useStore(s => s.toast);
  const [aperte, setAperte]  = useState<Set<string>>(new Set());

  const nome      = (id: number) => getNome(lega, id);
  const nomeGioco = (id: string) =>
    GIOCHI_PREIMPOSTATI.find(g => g.id === id)?.nome
    ?? lega.giochi?.find(g => g.id === id)?.nome
    ?? 'Gioco';
  const iconaGioco = (id: string) => GIOCHI_PREIMPOSTATI.find(g => g.id === id)?.icona ?? 'mazzo';

  const filtrate = filtraStoricoPerNome(voci, query, nome);

  function toggle(key: string) {
    setAperte(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  /* ── Card POKER (identica a TabStorico) ── */
  function renderPoker(partita: Partita) {
    const key    = `poker:${partita.id}`;
    const isOpen = aperte.has(key);
    const ranking = partita.giocatori.slice().sort((a, b) => b.netto_finale - a.netto_finale);
    const tipo = partita.modalita === 'torneo' ? 'Torneo' : 'Cash';
    const vincitore = partita.giocatori.find(g => g.vincitore);
    const vincitoreNome = vincitore ? nome(vincitore.id_nome) : null;
    const rankClass = (i: number) => (i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '');

    function doElimina() {
      if (!confirm('Eliminare questa partita? L\'operazione è irreversibile.')) return;
      eliminaPartita(lega.id, partita.id);
      toast('Partita eliminata');
    }

    return (
      <div key={key} className="game-card">
        <div className="game-card-head" onClick={() => toggle(key)}>
          <div>
            <div className="game-card-date">{tipo} · {fmtData(partita.data)}</div>
            <div className="game-card-date-sub">
              {partita.giocatori.length} giocatori · {partita.ora_inizio}–{partita.ora_fine}
            </div>
          </div>
          <div className="game-card-actions">
            <button className="ic-btn" title="Elimina partita" onClick={e => { e.stopPropagation(); doElimina(); }}>
              <IconTrash size={15} />
            </button>
            <span className="storico-toggle">{isOpen ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}</span>
          </div>
        </div>

        {vincitoreNome && (
          <div className="game-winner-bar">
            <IconTrophy size={14} className="ico-inline" /> Vincitore: {vincitoreNome}
          </div>
        )}

        {isOpen && (
          <>
            <div className="tbl-wrap">
              <table className="ranking-tbl">
                <thead>
                  <tr><th>#</th><th>Giocatore</th><th>Buy-in</th><th>Netto</th></tr>
                </thead>
                <tbody>
                  {ranking.map((g, i) => (
                    <tr key={g.id_nome} className={rankClass(i)}>
                      <td><span className="rank-pos">{i + 1}</span></td>
                      <td>
                        <span className={vincitore?.id_nome === g.id_nome ? 'name-with-crown' : ''}>
                          {nome(g.id_nome)}
                          {vincitore?.id_nome === g.id_nome && <span className="crown"><IconCrown size={15} className="ico-inline" /></span>}
                        </span>
                      </td>
                      <td>{euro(g.entrate)}</td>
                      <td className={g.netto_finale >= 0 ? 'pos' : 'neg'}>{euro(g.netto_finale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {partita.settlements.length > 0 && (
              <div className="pay-cell-wrap">
                <div className="pay-cell">
                  {partita.settlements.map((s, idx) => (
                    <button
                      key={idx}
                      className={`pay-pill debt${s.pagato ? ' paid' : ''}`}
                      onClick={() => toggleSettlementPaid(lega.id, partita.id, idx)}
                    >
                      {nome(s.from)} → {nome(s.to)} {euro(s.amount)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  /* ── Card GIOCO (identica a StoricoSessioni) ── */
  function esitoLabel(sess: SessioneGioco) {
    const e = esitoSessione(sess);
    if (e.pareggio) return <Chip tone="warn">Pareggio</Chip>;
    return <Chip tone="ok">Vince {e.vincitori.map(nome).join(', ')}</Chip>;
  }

  function esitoPartita(p: PartitaGioco) {
    if (partitaInCorso(p))        return <Chip tone="muted">non conclusa</Chip>;
    if (p.pareggio)               return <Chip tone="warn">Pareggio</Chip>;
    if (p.vincitori.length === 0) return <Chip tone="muted">Nessun vincitore</Chip>;
    return <Chip tone="ok"><IconCheck size={13} /> {p.vincitori.map(nome).join(', ')}</Chip>;
  }

  function renderGioco(sess: SessioneGioco) {
    const key    = `gioco:${sess.id}`;
    const aperta = aperte.has(key);

    function doElimina() {
      if (confirm('Eliminare questa sessione dallo storico?')) eliminaSessioneGioco(lega.id, sess.id);
    }

    return (
      <div key={key} className="storico-sess">
        <button className="storico-sess-head" onClick={() => toggle(key)}>
          <span className="storico-sess-ico"><GameIcon icona={iconaGioco(sess.giocoId)} size={22} /></span>
          <div className="storico-sess-body">
            <div className="storico-sess-nome">{nomeGioco(sess.giocoId)}</div>
            <div className="storico-sess-sub">
              {fmtData(sess.data)} · {sess.ora_inizio}–{sess.ora_fine} · {sess.partite.length} {sess.partite.length === 1 ? 'partita' : 'partite'}
            </div>
          </div>
          {esitoLabel(sess)}
          <span className="storico-sess-chevron">{aperta ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}</span>
        </button>

        {aperta && (
          <div className="storico-sess-det">
            {sess.partite.length === 0 ? (
              <p className="esito-hint">Nessuna partita giocata.</p>
            ) : (
              sess.partite.map(p => (
                <div key={p.id} className="storico-partita">
                  <span className="storico-partita-n">Partita {p.id}</span>
                  <span className="storico-partita-ore">{p.ora_inizio}–{p.ora_fine}</span>
                  <span className="storico-partita-esito">
                    {esitoPartita(p)}
                    {p.nomeLibero && <Chip tone="muted">{p.nomeLibero}</Chip>}
                  </span>
                </div>
              ))
            )}
            <button className="storico-sess-del" onClick={doElimina}>
              <IconTrash size={15} /> Elimina sessione
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── Empty state (dopo il filtro nome) ── */
  if (filtrate.length === 0) {
    const q = query.trim();
    return (
      <EmptyState
        icon={<IconHistory size={48} />}
        title={q ? `Nessun risultato per "${q}"` : 'Storico vuoto'}
        hint={q ? 'Nessuna partita o sessione coinvolge questo nome.' : 'Le partite e le sessioni concluse compaiono qui.'}
      />
    );
  }

  return (
    <div className="storico-lista">
      {filtrate.map(voce => (voce.kind === 'poker' ? renderPoker(voce.partita) : renderGioco(voce.sessione)))}
    </div>
  );
}
