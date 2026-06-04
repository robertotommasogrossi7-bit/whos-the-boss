import type { GiocoLega, SessioneGioco, Lega, Partita } from '../types';
import { calcolaStatsGioco, type StatsGiocatore } from './statsGiochi';
import { GIOCHI_PREIMPOSTATI } from './giochi';
import { normalizzaNome } from './normalizzaNome';

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

/* ══════════════════════════════════════════════════════
   MODELLO-RIGA UNIFICATO (Card Tracker #4.6) — layer-dati
   Una sola forma di "riga classifica" per TUTTI i contesti, così il #4.7
   monta UN componente parametrico sul tipo:
   - 'punti'  → giochi non-poker: KPI = StatsGiocatore (%/vittorie)
   - 'soldi'  → poker: KPI = netto € (+ partite/vittorie/% derivate)
   Le righe escono GIÀ ordinate dal produttore (netto desc | %→sessVinte→partite).
══════════════════════════════════════════════════════ */

export type KpiClassifica =
  | { tipo: 'punti'; stats: StatsGiocatore }
  | { tipo: 'soldi'; partiteGiocate: number; partiteVinte: number; percVittorie: number; netto: number };

export interface RigaClassificaU {
  idNome:   number;
  nome:     string;
  isLeader: boolean;
  kpi:      KpiClassifica;
}

export interface ClassificaU {
  tipo:  'punti' | 'soldi'; // come ordinare + quali colonne mostra il #4.7
  righe: RigaClassificaU[];  // GIÀ ordinate dal produttore
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

/* ══════════════════════════════════════════════════════
   POKER NEL MODELLO-RIGA UNIFICATO (#4.6) — produttori puri
   Estrae la logica oggi inline in components/classifica/TabClassifica.tsx
   (aggrega lega.partite per id_nome: partite, vittorie, netto €). La UI
   vecchia resta com'è: la rimpiazza il #4.7 leggendo da qui.
══════════════════════════════════════════════════════ */

/** Arrotonda una % a 1 decimale (0..100), come altrove (statsGiochi/sommaStats). */
function perc1(num: number, den: number): number {
  return den === 0 ? 0 : Math.round((num / den) * 1000) / 10;
}

/**
 * Classifica poker per netto (modello-riga unificato, KPI 'soldi').
 * Aggrega `partite` per `id_nome`: partiteGiocate, partiteVinte (g.vincitore),
 * netto = Σ g.netto_finale. Ordina per netto desc; leader = primo con partite>0.
 * `range` opzionale (preserva il filtro-data del poker). Pura.
 */
export function classificaPoker(
  partite: Partita[],
  idNomi:  Array<{ id: number; nome: string }>,
  range?:  { from?: string; to?: string },
): RigaClassificaU[] {
  const nomeById = (id: number) => idNomi.find(n => n.id === id)?.nome ?? '?';

  const filtrate = partite.filter(p => {
    if (range?.from && p.data < range.from) return false;
    if (range?.to   && p.data > range.to)   return false;
    return true;
  });

  const agg = new Map<number, { partite: number; vittorie: number; netto: number }>();
  for (const p of filtrate) {
    for (const g of p.giocatori) {
      const prev = agg.get(g.id_nome) ?? { partite: 0, vittorie: 0, netto: 0 };
      agg.set(g.id_nome, {
        partite:  prev.partite  + 1,
        vittorie: prev.vittorie + (g.vincitore ? 1 : 0),
        netto:    prev.netto    + g.netto_finale,
      });
    }
  }

  const righe: RigaClassificaU[] = [...agg.entries()].map(([idNome, a]) => ({
    idNome,
    nome: nomeById(idNome),
    isLeader: false,
    kpi: {
      tipo: 'soldi',
      partiteGiocate: a.partite,
      partiteVinte:   a.vittorie,
      percVittorie:   perc1(a.vittorie, a.partite),
      netto:          a.netto,
    },
  }));

  righe.sort((x, y) => {
    const nx = x.kpi.tipo === 'soldi' ? x.kpi.netto : 0;
    const ny = y.kpi.tipo === 'soldi' ? y.kpi.netto : 0;
    return ny - nx;
  });

  const leaderIdx = righe.findIndex(
    r => r.kpi.tipo === 'soldi' && r.kpi.partiteGiocate > 0,
  );
  return righe.map((r, i) => ({ ...r, isLeader: i === leaderIdx }));
}

/**
 * Classifica di un gioco non-poker nel modello-riga unificato (KPI 'punti').
 * Wrappa `classificaGioco` (riusa il calcolo, non lo duplica) e mappa ogni
 * riga a `{…, kpi:{tipo:'punti', stats}}`. Già ordinata come classificaGioco.
 */
export function classificaGiocoU(
  gioco:          GiocoLega,
  sessioniChiuse: SessioneGioco[],
  idNomi:         Array<{ id: number; nome: string }>,
): RigaClassificaU[] {
  return classificaGioco(gioco, sessioniChiuse, idNomi).map(r => ({
    idNome:   r.idNome,
    nome:     r.nome,
    isLeader: r.isLeader,
    kpi:      { tipo: 'punti', stats: r.stats },
  }));
}

/**
 * Dispatcher classifica di lega nel modello unificato — il "poker inline".
 * - giocoId 'poker' → classificaPoker su lega.partite (tipo 'soldi').
 * - altro gioco     → risolve il gioco (resolveGiocoLega) + classificaGiocoU
 *                     sulle sessioniGioco chiuse di quel gioco (tipo 'punti').
 * Gioco non risolvibile → classifica 'punti' vuota.
 */
export function classificaUnificata(lega: Lega, giocoId: string): ClassificaU {
  if (giocoId === 'poker') {
    return { tipo: 'soldi', righe: classificaPoker(lega.partite, lega.nomi) };
  }
  const gioco = resolveGiocoLega(giocoId, lega);
  if (!gioco) return { tipo: 'punti', righe: [] };
  const sessioniChiuse = (lega.sessioniGioco ?? []).filter(
    s => s.stato === 'chiusa' && s.giocoId === giocoId,
  );
  return { tipo: 'punti', righe: classificaGiocoU(gioco, sessioniChiuse, lega.nomi) };
}

/* ── Poker globale "La tua situazione" (#4.6), gemello soldi di
   statsPersonaCrossContesto. Identità per NOME normalizzato (#4.5). ── */

export interface ContestoPoker {
  legaId:    number;
  legaNome:  string;
  personale: boolean;
  netto:     number;
  partite:   number;
  vittorie:  number;
}

export interface CrossContextoPokerResult {
  totale:      { netto: number; partite: number; vittorie: number; percVittorie: number };
  perContesto: ContestoPoker[];
}

/**
 * Aggrega il poker di una persona su TUTTE le leghe, matchando per
 * `normalizzaNome` (best-effort, pre-backend). Salta i contesti dove il nome
 * è assente; include un contesto trovato anche con 0 partite (come il gemello
 * non-poker). La % del totale è ricalcolata sui conteggi sommati. Pura.
 */
export function classificaPokerCrossContesto(
  nome:  string,
  leghe: Lega[],
): CrossContextoPokerResult {
  const target = normalizzaNome(nome);
  const perContesto: ContestoPoker[] = [];
  let netto = 0, partite = 0, vittorie = 0;

  if (target) {
    for (const lega of leghe) {
      const giocatore = lega.nomi.find(n => normalizzaNome(n.nome) === target);
      if (!giocatore) continue;

      let cNetto = 0, cPartite = 0, cVittorie = 0;
      for (const p of lega.partite) {
        for (const g of p.giocatori) {
          if (g.id_nome !== giocatore.id) continue;
          cPartite++;
          if (g.vincitore) cVittorie++;
          cNetto += g.netto_finale;
        }
      }

      perContesto.push({
        legaId:    lega.id,
        legaNome:  lega.personale ? 'Personale' : lega.nome,
        personale: lega.personale ?? false,
        netto:     cNetto,
        partite:   cPartite,
        vittorie:  cVittorie,
      });
      netto += cNetto; partite += cPartite; vittorie += cVittorie;
    }
  }

  return {
    totale: { netto, partite, vittorie, percVittorie: perc1(vittorie, partite) },
    perContesto,
  };
}
