import type { GiocoLega, SessioneGioco, Lega } from '../types';
import { calcolaStatsGioco, type StatsGiocatore } from './statsGiochi';
import { GIOCHI_PREIMPOSTATI } from './giochi';

/* ══════════════════════════════════════════════════════
   CLASSIFICHE (Card Tracker M4) — funzioni pure
   SPEC §8: per-gioco (dentro la lega) + globale (cross-contesto).
   ⚠️ Poker INVARIATO — usa la sua TabClassifica.
   Regola fondamentale: sommare i CONTEGGI e RICALCOLARE le %
   sui totali. MAI mediare percentuali.
══════════════════════════════════════════════════════ */

export interface RigaClassifica {
  idNome: number;
  nome:   string;
  stats:  StatsGiocatore;
  isLeader: boolean;
}

export interface ContextoStats {
  legaId:   number;
  legaNome: string;
  personale: boolean;
  stats:    StatsGiocatore;
}

export interface CrossContextoResult {
  totale:      StatsGiocatore;
  perContesto: ContextoStats[];
}

const ZERO_STATS: StatsGiocatore = {
  sessioniGiocate: 0, sessioniVinte: 0, sessioniPerse: 0, sessioniPareggio: 0,
  partiteGiocate:  0, partiteVinte:  0, partitePerse:  0, partitePareggio:  0,
  percVittorie: 0,
};

/**
 * Somma due StatsGiocatore sommando i CONTEGGI e RICALCOLANDO percVittorie.
 * NON mediare le percentuali: la % aggregata si calcola sempre sui totali.
 */
export function sommaStats(
  a: StatsGiocatore,
  b: StatsGiocatore,
  pareggioComeVittoria: boolean,
): StatsGiocatore {
  const partiteVinte    = a.partiteVinte    + b.partiteVinte;
  const partitePareggio = a.partitePareggio + b.partitePareggio;
  const partiteGiocate  = a.partiteGiocate  + b.partiteGiocate;
  const num = partiteVinte + (pareggioComeVittoria ? partitePareggio : 0);
  return {
    sessioniGiocate:  a.sessioniGiocate  + b.sessioniGiocate,
    sessioniVinte:    a.sessioniVinte    + b.sessioniVinte,
    sessioniPerse:    a.sessioniPerse    + b.sessioniPerse,
    sessioniPareggio: a.sessioniPareggio + b.sessioniPareggio,
    partiteGiocate,
    partiteVinte,
    partitePerse:     a.partitePerse     + b.partitePerse,
    partitePareggio,
    percVittorie: partiteGiocate === 0
      ? 0
      : Math.round((num / partiteGiocate) * 1000) / 10,
  };
}

/**
 * Classifica per un gioco su un set di sessioni chiuse.
 * Per ogni giocatore calcola le stats, poi ordina (% desc → sessioni vinte desc →
 * partite giocate desc) e marca il leader (primo con almeno una partita giocata).
 */
export function classificaGioco(
  gioco:          GiocoLega,
  sessioniChiuse: SessioneGioco[],
  idNomi:         Array<{ id: number; nome: string }>,
): RigaClassifica[] {
  const righe = idNomi.map(({ id, nome }) => ({
    idNome: id,
    nome,
    stats: calcolaStatsGioco(gioco, sessioniChiuse, id),
  }));

  righe.sort((a, b) => {
    if (b.stats.percVittorie  !== a.stats.percVittorie)  return b.stats.percVittorie  - a.stats.percVittorie;
    if (b.stats.sessioniVinte !== a.stats.sessioniVinte) return b.stats.sessioniVinte - a.stats.sessioniVinte;
    return b.stats.partiteGiocate - a.stats.partiteGiocate;
  });

  const leaderIdx = righe.findIndex(r => r.stats.partiteGiocate > 0);
  return righe.map((r, i) => ({ ...r, isLeader: i === leaderIdx && r.stats.partiteGiocate > 0 }));
}

/**
 * Aggrega le stats di una persona su tutti i contesti (Personale + leghe).
 * Identità per NOME (best-effort, pre-backend). Salta contesti dove il nome è assente.
 * La % nel totale è RICALCOLATA sui conteggi sommati, mai mediata.
 */
export function statsPersonaCrossContesto(
  nome:  string,
  gioco: GiocoLega,
  leghe: Lega[],
): CrossContextoResult {
  const nomeLower = nome.trim().toLowerCase();
  const perContesto: ContextoStats[] = [];
  let totale: StatsGiocatore = { ...ZERO_STATS };

  for (const lega of leghe) {
    const giocatore = lega.nomi.find(n => n.nome.trim().toLowerCase() === nomeLower);
    if (!giocatore) continue;

    const sessioniChiuse = (lega.sessioniGioco ?? []).filter(
      s => s.stato === 'chiusa' && s.giocoId === gioco.id,
    );
    const stats = calcolaStatsGioco(gioco, sessioniChiuse, giocatore.id);

    perContesto.push({
      legaId:   lega.id,
      legaNome: lega.personale ? 'Personale' : lega.nome,
      personale: lega.personale ?? false,
      stats,
    });
    totale = sommaStats(totale, stats, gioco.pareggioComeVittoria);
  }

  return { totale, perContesto };
}

/**
 * Risolve un GiocoLega da giocoId (cerca prima in lega.giochi, poi nel catalogo).
 * Restituisce null se non trovato o se è il poker (fuori dalle stats comuni, SPEC §8).
 */
export function resolveGiocoLega(giocoId: string, lega: Lega): GiocoLega | null {
  if (giocoId === 'poker') return null;
  const custom = lega.giochi?.find(g => g.id === giocoId);
  if (custom) return custom;
  const cat = GIOCHI_PREIMPOSTATI.find(g => g.id === giocoId);
  if (!cat) return null;
  return {
    id: cat.id,
    nome: cat.nome,
    preimpostato: true,
    accent: cat.accent,
    attivo: true,
    pareggioComeVittoria: true,
  };
}

/**
 * Risolve un GiocoLega dal catalogo globale (senza contesto di lega specifica).
 * Usato nella ClassificaShell globale.
 */
export function resolveGiocoGlobale(giocoId: string): GiocoLega | null {
  if (giocoId === 'poker') return null;
  const cat = GIOCHI_PREIMPOSTATI.find(g => g.id === giocoId);
  if (!cat) return null;
  return {
    id: cat.id,
    nome: cat.nome,
    preimpostato: true,
    accent: cat.accent,
    attivo: true,
    pareggioComeVittoria: true,
  };
}
