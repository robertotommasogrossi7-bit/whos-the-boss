import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { GIOCHI_PREIMPOSTATI } from '../../utils/giochi';
import { fmtData } from '../../utils/format';
import { esitoSessione, partitaInCorso } from '../../utils/sessioneGioco';
import { GameIcon, IconChevronDown, IconChevronUp, IconHistory, IconTrash, IconCheck } from '../icons';
import { Chip, EmptyState } from '../ui';
import type { SessioneGioco, PartitaGioco } from '../../types';

/* STORICO sessioni di gioco (M3, SPEC §6/B3). Elenco delle sessioni CHIUSE
   (apribili nel dettaglio con le partite). Riusato in due ambiti: Personale
   (Home/Storico, filtrato per il gioco della GameBar) e dentro una lega
   (tab Storico, tutti i giochi). Le classifiche vere arrivano in M4. */
interface Props {
  legaId: number;
  giocoId?: string; // se presente, mostra solo le sessioni di quel gioco
}

export default function StoricoSessioni({ legaId, giocoId }: Props) {
  const lega = useStore(s => s.db.leghe.find(l => l.id === legaId));
  const eliminaSessioneGioco = useStore(s => s.eliminaSessioneGioco);
  const [aperte, setAperte] = useState<Set<number>>(new Set());

  if (!lega) return null;

  const nome = (id: number) => lega.nomi.find(n => n.id === id)?.nome ?? '?';
  const nomeGioco = (id: string) =>
    GIOCHI_PREIMPOSTATI.find(g => g.id === id)?.nome
    ?? lega.giochi?.find(g => g.id === id)?.nome
    ?? 'Gioco';
  const iconaGioco = (id: string) => GIOCHI_PREIMPOSTATI.find(g => g.id === id)?.icona ?? 'mazzo';

  const sessioni = (lega.sessioniGioco ?? [])
    .filter(s => s.stato === 'chiusa' && (giocoId ? s.giocoId === giocoId : true))
    .sort((a, b) => b.id - a.id);

  function toggle(id: number) {
    setAperte(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function elimina(id: number) {
    if (confirm('Eliminare questa sessione dallo storico?')) eliminaSessioneGioco(legaId, id);
  }

  function esitoLabel(sess: SessioneGioco) {
    const e = esitoSessione(sess);
    if (e.pareggio) return <Chip tone="warn">Pareggio</Chip>;
    return <Chip tone="ok">Vince {e.vincitori.map(nome).join(', ')}</Chip>;
  }

  function esitoPartita(p: PartitaGioco) {
    if (partitaInCorso(p))         return <Chip tone="muted">non conclusa</Chip>;
    if (p.pareggio)                return <Chip tone="warn">Pareggio</Chip>;
    if (p.vincitori.length === 0)  return <Chip tone="muted">Nessun vincitore</Chip>;
    return <Chip tone="ok"><IconCheck size={13} /> {p.vincitori.map(nome).join(', ')}</Chip>;
  }

  if (sessioni.length === 0) {
    return (
      <div className="tab-content">
        <EmptyState
          icon={<IconHistory size={48} />}
          title="Nessuna sessione conclusa"
          hint="Quando chiudi una sessione, la ritrovi qui con le sue partite ed esiti."
        />
      </div>
    );
  }

  return (
    <div className="tab-content gioco-screen">
      {sessioni.map(sess => {
        const aperta = aperte.has(sess.id);
        return (
          <div key={sess.id} className="storico-sess">
            <button className="storico-sess-head" onClick={() => toggle(sess.id)}>
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
                <button className="storico-sess-del" onClick={() => elimina(sess.id)}>
                  <IconTrash size={15} /> Elimina sessione
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
