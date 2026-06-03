import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { classificaGioco, statsPersonaCrossContesto, resolveGiocoGlobale, resolveGiocoLega } from '../../utils/classifiche';
import { GIOCHI_PREIMPOSTATI } from '../../utils/giochi';
import { GameIcon, IconCrown, IconTrophy, IconChevronDown, IconChevronUp } from '../icons';
import { Avatar, Card, EmptyState } from '../ui';
import GameBar from './GameBar';

/* CLASSIFICA globale / Personale (M4) — scheda "Classifica" della shell.
   SPEC §5/§8 + DECISIONI 2026-06-04.
   - GameBar in cima (filtro gioco persiste tra schermate).
   - "La tua situazione": totale aggregato persona su Personale+leghe + breakdown.
   - "Classifica Personale": standings nella lega Personale per quel gioco.
   - Avviso identità per nome (pre-backend). Poker: nota separata. */
export default function ClassificaShell() {
  const giocoFiltro = useStore(s => s.giocoFiltro);
  const utente      = useStore(s => s.utente);
  const leghe       = useStore(s => s.db.leghe);

  const [persona,         setPersona]         = useState(utente?.username ?? '');
  const [breakdownAperto, setBreakdownAperto] = useState(false);

  const gioco = resolveGiocoGlobale(giocoFiltro);
  const legaPersonale = leghe.find(l => l.personale);

  const icona = (id: string) => GIOCHI_PREIMPOSTATI.find(g => g.id === id)?.icona ?? 'mazzo';

  /* ── Poker selezionato: rimanda alla classifica di lega ── */
  if (giocoFiltro === 'poker') {
    return (
      <>
        <GameBar />
        <div className="tab-content">
          <EmptyState
            icon={<IconTrophy size={48} />}
            title="Classifica Poker"
            hint="La classifica poker (per netto €) si trova nella scheda Classifica di ogni lega poker."
          />
        </div>
      </>
    );
  }

  /* ── Nessun gioco valido (non dovrebbe accadere) ── */
  if (!gioco) {
    return (
      <>
        <GameBar />
        <div className="tab-content">
          <EmptyState icon={<IconTrophy size={48} />} title="Seleziona un gioco" hint="Usa la barra in alto per scegliere un gioco." />
        </div>
      </>
    );
  }

  /* ── Sezione 1: totale aggregato della persona ── */
  const { totale, perContesto } = persona.trim()
    ? statsPersonaCrossContesto(persona.trim(), gioco, leghe)
    : { totale: null, perContesto: [] };

  /* ── Sezione 2: classifica Personale ── */
  const sessPersonaleChiuse = legaPersonale
    ? (legaPersonale.sessioniGioco ?? []).filter(s => s.stato === 'chiusa' && s.giocoId === gioco.id)
    : [];
  const righePersonale = legaPersonale
    ? classificaGioco(
        resolveGiocoLega(gioco.id, legaPersonale) ?? gioco,
        sessPersonaleChiuse,
        legaPersonale.nomi,
      )
    : [];
  const haPersonale = righePersonale.some(r => r.stats.partiteGiocate > 0);

  return (
    <>
      <GameBar />
      <div className="tab-content">

        {/* ── Sezione 1: La tua situazione ── */}
        <div className="sec-hdr"><h2>La tua situazione</h2></div>

        <div className="cla-persona-bar">
          <span className="cla-persona-label">Persona</span>
          <input
            className="cla-persona-input"
            type="text"
            value={persona}
            onChange={e => setPersona(e.target.value)}
            placeholder="Nome giocatore…"
          />
        </div>

        {totale && perContesto.length > 0 ? (
          <>
            {/* Prima riga: totale aggregato */}
            <Card className="cla-totale-card">
              <div className="cla-totale-title">
                <span className="cla-totale-ico"><GameIcon icona={icona(gioco.id)} size={18} /></span>
                {gioco.nome} — tutti i contesti
              </div>
              <div className="cla-totale-stats">
                <div className="cla-totale-stat">
                  <span className="cla-totale-val">{totale.percVittorie}%</span>
                  <span className="cla-totale-lbl">% vinte</span>
                </div>
                <div className="cla-totale-stat">
                  <span className="cla-totale-val">{totale.partiteGiocate}</span>
                  <span className="cla-totale-lbl">partite</span>
                </div>
                <div className="cla-totale-stat">
                  <span className="cla-totale-val">{totale.sessioniVinte}</span>
                  <span className="cla-totale-lbl">sess. vinte</span>
                </div>
              </div>
            </Card>

            {/* Breakdown per contesto (collassabile) */}
            <button
              className="cla-breakdown-toggle"
              onClick={() => setBreakdownAperto(o => !o)}
            >
              <span>Dettaglio per contesto</span>
              {breakdownAperto ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </button>

            {breakdownAperto && (
              <div className="cla-breakdown">
                {perContesto.map(ctx => (
                  <div key={ctx.legaId} className="cla-ctx">
                    <div className="cla-ctx-nome">
                      {ctx.personale ? 'Personale' : ctx.legaNome}
                    </div>
                    <div className="cla-ctx-stats">
                      <span>{ctx.stats.percVittorie}%</span>
                      <span className="cla-ctx-sub">{ctx.stats.partiteGiocate} partite · {ctx.stats.sessioniVinte} sess. vinte</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : persona.trim() ? (
          <EmptyState
            icon={<IconTrophy size={44} />}
            title={`"${persona}" non trovato`}
            hint={`Nessuna partita a ${gioco.nome} trovata per questo nome. Controlla il nome o gioca qualche sessione.`}
          />
        ) : (
          <EmptyState
            icon={<IconTrophy size={44} />}
            title="Inserisci un nome"
            hint="Scrivi il tuo nome (o quello di un altro giocatore) per vedere le sue statistiche aggregate."
          />
        )}

        {/* ── Sezione 2: classifica Personale ── */}
        <div className="sec-hdr sec-hdr--mt">
          <h2>Classifica Personale</h2>
          <span>{gioco.nome}</span>
        </div>

        {!haPersonale ? (
          <EmptyState
            icon={<IconTrophy size={40} />}
            title="Nessuna partita Personale"
            hint={`Gioca sessioni di ${gioco.nome} dalla Home e chiudile per vedere la classifica.`}
          />
        ) : (
          <div className="cla-table">
            <div className="cla-thead">
              <span className="cla-th-pos">#</span>
              <span className="cla-th-nome">Giocatore</span>
              <span className="cla-th-num">% vinte</span>
              <span className="cla-th-num">Sess.</span>
            </div>

            {righePersonale.map((r, i) => (
              <div
                key={r.idNome}
                className={[
                  'cla-row',
                  r.isLeader ? 'cla-row--leader' : '',
                  r.stats.partiteGiocate === 0 ? 'cla-row--zero' : '',
                ].filter(Boolean).join(' ')}
              >
                <div className="cla-pos">{i + 1}</div>
                <div className="cla-player">
                  {r.isLeader
                    ? <span className="cla-crown"><IconCrown size={14} /></span>
                    : <span className="cla-crown-placeholder" />}
                  <Avatar nome={r.nome} size="sm" />
                  <span className="cla-nome">{r.nome}</span>
                </div>
                <div className="cla-num">
                  {r.stats.partiteGiocate > 0 ? `${r.stats.percVittorie}%` : '—'}
                </div>
                <div className="cla-num">
                  {r.stats.partiteGiocate > 0 ? r.stats.sessioniVinte : '—'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Avviso identità per nome (pre-backend) */}
        <p className="classifica-nota">
          L'identità tra leghe è determinata per nome (pre-backend): stesso nome = stessa persona.
          I dati saranno esatti con l'autenticazione.
        </p>
      </div>
    </>
  );
}
