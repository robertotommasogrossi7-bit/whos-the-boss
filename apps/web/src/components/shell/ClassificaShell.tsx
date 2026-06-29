import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import {
  classificaUnificata, classificaPokerCrossContesto, statsPersonaCrossContesto,
  resolveGiocoGlobale, type ClassificaU,
} from '@poker/core';
import { GIOCHI_PREIMPOSTATI } from '@poker/core';
import { euroSigned } from '@poker/core';
import { GameIcon, IconTrophy, IconChevronDown, IconChevronUp, IconChevronRight } from '../icons';
import { Card, EmptyState } from '../ui';
import GameBar from './GameBar';
import ClassificaTable from '../classifica/ClassificaTable';
import FiltroNome from '../classifica/FiltroNome';

/* CLASSIFICA globale / Personale (#4.7a) — scheda "Classifica" della shell.
   Tutto PARAMETRICO sul gioco della GameBar (poker incluso, niente più
   EmptyState di solo-rimando):
   - "La tua situazione": poker → classificaPokerCrossContesto (netto+%+partite),
     giochi → statsPersonaCrossContesto (%+partite+sess); breakdown per contesto.
   - "Classifica Personale": classificaUnificata(Personale, gioco) → ClassificaTable.
   - Filtro nome (match in cima), avviso identità, link rapido alla schermata poker. */
export default function ClassificaShell() {
  const giocoFiltro = useStore(s => s.giocoFiltro);
  const utente      = useStore(s => s.utente);
  const leghe       = useStore(s => s.db.leghe);

  const [persona,         setPersona]         = useState(utente?.username ?? '');
  const [breakdownAperto, setBreakdownAperto] = useState(false);
  const [query,           setQuery]           = useState('');

  const isPoker       = giocoFiltro === 'poker';
  const gioco         = isPoker ? null : resolveGiocoGlobale(giocoFiltro);
  const legaPersonale = leghe.find(l => l.personale);
  const icona = (id: string) => GIOCHI_PREIMPOSTATI.find(g => g.id === id)?.icona ?? 'mazzo';

  /* ── Gioco non valido (e non poker) ── */
  if (!isPoker && !gioco) {
    return (
      <>
        <GameBar />
        <div className="tab-content">
          <EmptyState icon={<IconTrophy size={48} />} title="Seleziona un gioco" hint="Usa la barra in alto per scegliere un gioco." />
        </div>
      </>
    );
  }

  const nomeGioco  = isPoker ? 'Poker' : gioco!.nome;
  const iconaGioco = isPoker ? 'picche' : icona(gioco!.id);

  /* ── Sezione 1: La tua situazione (cross-contesto per nome) ── */
  const personaTrim = persona.trim();
  const pokerCross = isPoker && personaTrim ? classificaPokerCrossContesto(personaTrim, leghe) : null;
  const giocoCross = !isPoker && personaTrim ? statsPersonaCrossContesto(personaTrim, gioco!, leghe) : null;
  const haSituazione = (pokerCross?.perContesto.length ?? 0) > 0 || (giocoCross?.perContesto.length ?? 0) > 0;

  /* ── Sezione 2: Classifica Personale (sul condiviso) ── */
  const classificaPers: ClassificaU = legaPersonale
    ? classificaUnificata(legaPersonale, isPoker ? 'poker' : gioco!.id)
    : { tipo: isPoker ? 'soldi' : 'punti', righe: [] };
  const haPersonale = classificaPers.righe.some(r =>
    r.kpi.tipo === 'soldi' ? r.kpi.partiteGiocate > 0 : r.kpi.stats.partiteGiocate > 0,
  );

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

        {haSituazione ? (
          <>
            <Card className="cla-totale-card">
              <div className="cla-totale-title">
                <span className="cla-totale-ico"><GameIcon icona={iconaGioco} size={18} /></span>
                {nomeGioco} — tutti i contesti
              </div>
              <div className="cla-totale-stats">
                {isPoker ? (
                  <>
                    <div className="cla-totale-stat">
                      <span className={`cla-totale-val ${pokerCross!.totale.netto >= 0 ? 'pos' : 'neg'}`}>{euroSigned(pokerCross!.totale.netto)}</span>
                      <span className="cla-totale-lbl">netto €</span>
                    </div>
                    <div className="cla-totale-stat">
                      <span className="cla-totale-val">{pokerCross!.totale.percVittorie}%</span>
                      <span className="cla-totale-lbl">% vinte</span>
                    </div>
                    <div className="cla-totale-stat">
                      <span className="cla-totale-val">{pokerCross!.totale.partite}</span>
                      <span className="cla-totale-lbl">partite</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="cla-totale-stat">
                      <span className="cla-totale-val">{giocoCross!.totale.percVittorie}%</span>
                      <span className="cla-totale-lbl">% vinte</span>
                    </div>
                    <div className="cla-totale-stat">
                      <span className="cla-totale-val">{giocoCross!.totale.partiteGiocate}</span>
                      <span className="cla-totale-lbl">partite</span>
                    </div>
                    <div className="cla-totale-stat">
                      <span className="cla-totale-val">{giocoCross!.totale.sessioniVinte}</span>
                      <span className="cla-totale-lbl">sess. vinte</span>
                    </div>
                  </>
                )}
              </div>
            </Card>

            <button className="cla-breakdown-toggle" onClick={() => setBreakdownAperto(o => !o)}>
              <span>Dettaglio per contesto</span>
              {breakdownAperto ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </button>

            {breakdownAperto && (
              <div className="cla-breakdown">
                {isPoker
                  ? pokerCross!.perContesto.map(ctx => (
                      <div key={ctx.legaId} className="cla-ctx">
                        <div className="cla-ctx-nome">
                          {ctx.personale ? 'Personale' : ctx.legaNome}
                          <span className="cla-ctx-cisei">ci sei</span>
                        </div>
                        <div className="cla-ctx-stats">
                          <span className={ctx.netto >= 0 ? 'pos' : 'neg'}>{euroSigned(ctx.netto)}</span>
                          <span className="cla-ctx-sub">{ctx.partite} partite · {ctx.vittorie} vinte</span>
                        </div>
                      </div>
                    ))
                  : giocoCross!.perContesto.map(ctx => (
                      <div key={ctx.legaId} className="cla-ctx">
                        <div className="cla-ctx-nome">
                          {ctx.personale ? 'Personale' : ctx.legaNome}
                          <span className="cla-ctx-cisei">ci sei</span>
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
        ) : personaTrim ? (
          <EmptyState
            icon={<IconTrophy size={44} />}
            title={`"${persona}" non trovato`}
            hint={`Nessuna partita a ${nomeGioco} trovata per questo nome. Controlla il nome o gioca qualche ${isPoker ? 'serata' : 'sessione'}.`}
          />
        ) : (
          <EmptyState
            icon={<IconTrophy size={44} />}
            title="Inserisci un nome"
            hint="Scrivi il tuo nome (o quello di un altro giocatore) per vedere le sue statistiche aggregate."
          />
        )}

        {/* ── Sezione 2: Classifica Personale ── */}
        <div className="sec-hdr sec-hdr--mt">
          <h2>Classifica Personale</h2>
          <span>{nomeGioco}</span>
        </div>

        {isPoker && legaPersonale && (
          <Link to={`/leghe/${legaPersonale.id}/poker/classifica`} className="cla-link-poker">
            Apri schermata Poker <IconChevronRight size={16} />
          </Link>
        )}

        {!haPersonale ? (
          <EmptyState
            icon={<IconTrophy size={40} />}
            title="Nessuna partita Personale"
            hint={`Gioca ${isPoker ? 'serate di poker' : `sessioni di ${nomeGioco}`} dalla Home e chiudile per vedere la classifica.`}
          />
        ) : (
          <>
            <FiltroNome value={query} onChange={setQuery} />
            <ClassificaTable classifica={classificaPers} query={query} />
          </>
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
