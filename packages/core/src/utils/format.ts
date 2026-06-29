import type { Lega } from '../types';

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

export function getNome(lega: Lega, id: number): string {
  const n = lega.nomi.find(n => n.id === id);
  return n ? n.nome : '?';
}

/** Ora corrente "HH:MM". */
export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "oggi" / "domani" / "DD/MM/YYYY" rispetto alla data odierna. */
export function fmtRelativeData(data: string): string {
  if (!data) return '';
  if (data === oggi()) return 'oggi';
  const dom = new Date();
  dom.setDate(dom.getDate() + 1);
  const domStr = [
    dom.getFullYear(),
    String(dom.getMonth() + 1).padStart(2, '0'),
    String(dom.getDate()).padStart(2, '0'),
  ].join('-');
  if (data === domStr) return 'domani';
  return fmtData(data);
}
