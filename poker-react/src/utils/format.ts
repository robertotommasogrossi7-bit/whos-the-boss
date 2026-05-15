import type { Lega } from '../types';

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function oggi(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

export function fmtData(s: string): string {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

export function euro(v: unknown): string {
  const n = parseFloat(String(v)) || 0;
  return n.toFixed(2).replace('.', ',');
}

export function euroSigned(v: unknown): string {
  const n = parseFloat(String(v)) || 0;
  return (n >= 0 ? '+' : '') + euro(n);
}

export function numVal(el: HTMLInputElement | null): number {
  return parseFloat(el?.value ?? '') || 0;
}

export function getNome(lega: Lega, id: number): string {
  const n = lega.nomi.find(n => n.id === id);
  return n ? n.nome : '?';
}
