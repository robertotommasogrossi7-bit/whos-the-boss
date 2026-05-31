import type { GiocoLega } from '../types';

/* ══════════════════════════════════════════════════════
   CATALOGO GIOCHI (Card Tracker M1)
   Solo dati: id, nome, accento (hex), chiave icona kebab-case.
   Lo SVG vero lo disegna la fase grafica (DESIGN_SPEC §4).
   NESSUNA immagine/logo di marca nel repo (vincolo copyright).
   ⚠️ Il poker sta qui SOLO per identità/tema/GameBar: NON usa SessioneGioco
   né calcolaStatsGioco, mantiene il suo modello e la sua classifica.
══════════════════════════════════════════════════════ */

export interface GiocoPreimpostato {
  id: string;
  nome: string;
  accent: string; // hex #RRGGBB (catalogo DESIGN_SPEC §4)
  icona: string;  // chiave kebab-case stabile (lo SVG lo fa la fase grafica)
}

export const GIOCHI_PREIMPOSTATI: GiocoPreimpostato[] = [
  { id: 'poker',     nome: 'Poker',     accent: '#1E8A4C', icona: 'picche' },
  { id: 'generico',  nome: 'Generico',  accent: '#5B8DEF', icona: 'mazzo' },
  { id: 'scopa',     nome: 'Scopa',     accent: '#D24B40', icona: 'coppe' },
  { id: 'briscola',  nome: 'Briscola',  accent: '#2E8B5A', icona: 'bastoni' },
  { id: 'tressette', nome: 'Tressette', accent: '#C2912E', icona: 'denari' },
  { id: 'burraco',   nome: 'Burraco',   accent: '#C24E8E', icona: 'due-mazzi' },
  { id: 'scala40',   nome: 'Scala 40',  accent: '#4E8DB0', icona: 'scala' },
  { id: 'uno',       nome: 'Uno',       accent: '#D33A2C', icona: 'uno' },
  { id: 'magic',     nome: 'Magic',     accent: '#C9772F', icona: 'magic' },
  { id: 'yugioh',    nome: 'Yu-Gi-Oh!', accent: '#B07A2A', icona: 'yugioh' },
  { id: 'pokemon',   nome: 'Pokémon',   accent: '#E6B400', icona: 'pokemon' },
];

/* ── Hash deterministico: stringa → intero non negativo ── */
function hashNome(nome: string): number {
  let h = 0;
  for (let i = 0; i < nome.length; i++) {
    h = (h * 31 + nome.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ── HSL → hex #RRGGBB (uppercase) ── */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const canale = (n: number): string => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${canale(0)}${canale(8)}${canale(4)}`.toUpperCase();
}

/* ── Accento deterministico derivato dal nome (DESIGN_SPEC §4/§9) ──
   Hash → tonalità HSL, saturazione/luminosità fisse coerenti col tema scuro.
   Restituisce sempre hex #RRGGBB. */
export function accentDaNome(nome: string): string {
  const hue = hashNome(nome) % 360;
  return hslToHex(hue, 65, 55);
}

/* ── Nuovo gioco custom: schermata comune + default (SPEC §9) ── */
export function nuovoGiocoCustom(nome: string, foto?: string): GiocoLega {
  return {
    id: `custom-${Date.now()}`,
    nome,
    preimpostato: false,
    foto,
    accent: accentDaNome(nome),
    attivo: true,
    pareggioComeVittoria: true,
  };
}
