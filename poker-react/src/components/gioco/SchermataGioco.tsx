import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { GIOCHI_PREIMPOSTATI } from '../../utils/giochi';
import { fmtRelativeData } from '../../utils/format';
import { idBloccatiInclusi } from '../../utils/personale';
import { esitoSessione, partitaInCorso } from '../../utils/sessioneGioco';
import { GameIcon, IconChevronLeft, IconPlus, IconCheck, IconClock } from '../icons';
import { Button, Card, Chip, EmptyState, Sheet } from '../ui';
import SheetNuovaSessione from './SheetNuovaSessione';
import SheetEsitoPartita from './SheetEsitoPartita';
import type { PartitaGioco } from '../../types';

/* SCHERMATA COMUNE DEL GIOCO (M3, SPEC §6) — "segna partita".
   Cuore del flusso non-poker: crea/avvia sessione, segna partite
   (vincitori/pareggio/partecipanti/nomeLibero), chiudi sessione.
   Riusabile in due contesti: Home (Personale, niente backTo) e dentro una
   lega (route /leghe/:id/g/:giocoId, con backTo alla griglia giochi). */
interface Props {
  legaId: number;
  giocoId: string;
  backTo?: string;
}

export default function SchermataGioco({ legaId, giocoId, backTo }: Props) {
  const lega                 = useStore(s => s.db.leghe.find(l => l.id === legaId));
  const utente               = useStore(s => s.utente);
  const aggiungiPartita      = useStore(s => s.aggiungiPartita);
  const chiudiPartita        = useStore(s => s.chiudiPartita);
  const annullaPartita       = useStore(s => s.annullaPartita);
  const avviaSessioneGioco   = useStore(s => s.avviaSessioneGioco);
  const chiudiSessioneGioco  = useStore(s => s.chiudiSessioneGioco);
  const eliminaSessioneGioco = useStore(s => s.eliminaSessioneGioco);

  const [openNuova, setOpenNuova]         = useState(false);
  const [esitoPartitaId, setEsitoPartitaId] = useState<number | null>(null);
  const [openChiudi, setOpenChiudi]       = useState(false);
  const [forzaPareggio, setForzaPareggio] = useState(false);

  if (!lega) return null;

  const gioco     = GIOCHI_PREIMPOSTATI.find(g => g.id === giocoId);
  const nomeGioco = gioco?.nome ?? 'Gioco';
  const icona     = gioco?.icona ?? 'mazzo';
  const nome      = (id: number) => lega.nomi.find(n => n.id === id)?.nome ?? '?';
  // #4.5: nel Personale l'id "sei tu" è sempre fra i partecipanti (non deselezionabile).
  const bloccati  = idBloccatiInclusi(lega, utente?.username);

  const corrente = (lega.sessioniGioco ?? [])
    .filter(s => s.giocoId === giocoId && s.stato !== 'chiusa')
    .sort((a, b) => b.id - a.id)[0] ?? null;

  const back = backTo
    ? <Link to={backTo} className="gioco-back"><IconChevronLeft size={18} /> Giochi</Link>
    : null;

  /* ── Nessuna sessione corrente ── */
  if (!corrente) {
    return (
      <div className="tab-content gioco-screen">
        {back}
        <EmptyState
          icon={<GameIcon icona={icona} size={48} />}
          title={`Nessuna sessione di ${nomeGioco}`}
          hint="Crea una sessione, poi segna le partite con i tuoi amici."
          action={<Button onClick={() => setOpenNuova(true)}><IconPlus size={18} /> Crea sessione</Button>}
        />
        {openNuova && (
          <SheetNuovaSessione
            lega={lega}
            giocoId={giocoId}
            onClose={() => setOpenNuova(false)}
            onCreated={() => setOpenNuova(false)}
          />
        )}
      </div>
    );
  }

  const head = (sub: string, chip: React.ReactNode) => (
    <Card className="gioco-head">
      <span className="gioco-head-ico"><GameIcon icona={icona} size={30} /></span>
      <div className="gioco-head-body">
        <div className="gioco-head-nome">{nomeGioco}</div>
        <div className="gioco-head-sub">{sub}</div>
      </div>
      {chip}
    </Card>
  );

  const players = (
    <div className="gioco-players">
      {corrente.partecipanti.map(id => <span key={id} className="gioco-player">{nome(id)}</span>)}
    </div>
  );

  /* ── Sessione programmata ('pre') ── */
  if (corrente.stato === 'pre') {
    return (
      <div className="tab-content gioco-screen">
        {back}
        {head(`Programmata · ${fmtRelativeData(corrente.data)}`, <Chip tone="muted">in attesa</Chip>)}
        {players}
        <Button block onClick={() => avviaSessioneGioco(legaId, corrente.id)}>Avvia sessione</Button>
        <button
          className="gioco-del"
          onClick={() => { if (confirm('Eliminare la sessione programmata?')) eliminaSessioneGioco(legaId, corrente.id); }}
        >
          Elimina sessione
        </button>
      </div>
    );
  }

  /* ── Sessione attiva ── */
  const inCorso = corrente.partite.find(partitaInCorso) ?? null;
  const chiuse  = corrente.partite.filter(p => !partitaInCorso(p));
  const esito   = esitoSessione(corrente);

  function nuovaPartita() {
    const pid = aggiungiPartita(legaId, corrente!.id);
    if (pid != null) setEsitoPartitaId(pid);
  }

  function esitoChip(p: PartitaGioco) {
    if (p.pareggio)              return <Chip tone="warn">Pareggio</Chip>;
    if (p.vincitori.length === 0) return <Chip tone="muted">Nessun vincitore</Chip>;
    return <Chip tone="ok"><IconCheck size={13} /> {p.vincitori.map(nome).join(', ')}</Chip>;
  }

  return (
    <div className="tab-content gioco-screen">
      {back}
      {head(
        `${fmtRelativeData(corrente.data)} · ${corrente.partite.length} ${corrente.partite.length === 1 ? 'partita' : 'partite'}`,
        <Chip tone="accent">in corso</Chip>,
      )}
      {players}

      {inCorso ? (
        <Card className="gioco-incorso">
          <div className="gioco-incorso-top">
            <span className="gioco-incorso-ico dot-live"><IconClock size={18} /></span>
            <div>
              <div className="gioco-incorso-titolo">Partita {inCorso.id} in corso</div>
              <div className="gioco-incorso-sub">dalle {inCorso.ora_inizio}</div>
            </div>
          </div>
          <div className="gioco-incorso-actions">
            <Button variant="ghost" size="sm" onClick={() => annullaPartita(legaId, corrente.id, inCorso.id)}>Annulla</Button>
            <Button size="sm" onClick={() => setEsitoPartitaId(inCorso.id)}>Registra esito</Button>
          </div>
        </Card>
      ) : (
        <Button block onClick={nuovaPartita}><IconPlus size={18} /> Nuova partita</Button>
      )}

      {chiuse.length > 0 && (
        <div className="gioco-partite">
          {chiuse.slice().reverse().map(p => (
            <div key={p.id} className="gioco-partita">
              <div className="gioco-partita-head">
                <span className="gioco-partita-n">Partita {p.id}</span>
                <span className="gioco-partita-ore">{p.ora_inizio}–{p.ora_fine}</span>
              </div>
              <div className="gioco-partita-esito">
                {esitoChip(p)}
                {p.nomeLibero && <Chip tone="muted">{p.nomeLibero}</Chip>}
                {p.partecipanti && <span className="gioco-partita-sub">{p.partecipanti.length} giocatori</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className="gioco-chiudi"
        disabled={!!inCorso}
        onClick={() => { setForzaPareggio(false); setOpenChiudi(true); }}
      >
        Chiudi sessione
      </button>
      {inCorso && <p className="gioco-hint">Chiudi la partita in corso prima di chiudere la sessione.</p>}

      {esitoPartitaId != null && (
        <SheetEsitoPartita
          partecipantiSessione={corrente.partecipanti}
          nome={nome}
          bloccati={bloccati}
          onClose={() => setEsitoPartitaId(null)}
          onConfirm={(e) => { chiudiPartita(legaId, corrente.id, esitoPartitaId, e); setEsitoPartitaId(null); }}
        />
      )}

      {openChiudi && (
        <Sheet open onClose={() => setOpenChiudi(false)} title="Chiudi sessione">
          <p className="esito-hint">
            {forzaPareggio || esito.pareggio
              ? 'La sessione si chiude in pareggio.'
              : `Vince ${esito.vincitori.map(nome).join(', ')} con più partite vinte.`}
          </p>
          {!esito.pareggio && (
            <button className={`esito-pareggio${forzaPareggio ? ' on' : ''}`} onClick={() => setForzaPareggio(v => !v)}>
              <span className="ep-box">{forzaPareggio && <IconCheck size={16} />}</span>
              Forza pareggio
            </button>
          )}
          <div className="esito-actions">
            <Button variant="ghost" onClick={() => setOpenChiudi(false)}>Annulla</Button>
            <Button onClick={() => { chiudiSessioneGioco(legaId, corrente.id, forzaPareggio || esito.pareggio); setOpenChiudi(false); }}>
              Chiudi sessione
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
