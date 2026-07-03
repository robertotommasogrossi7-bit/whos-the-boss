import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/* Lo store è condiviso web+mobile (React Native/Hermes non ha `confirm`,
   `alert`, `prompt`: sono globali del browser). Un uso diretto crasha
   silenziosamente su mobile (A1, audit 2026-07-03). Guardia statica: legge
   il sorgente e rifiuta il merge se qualcuno li reintroduce nello store. */
describe('store.ts — niente globali browser (confirm/alert/prompt)', () => {
  it('non contiene chiamate a confirm(), alert() o prompt() (fuori dai commenti)', () => {
    const path = fileURLToPath(new URL('./store.ts', import.meta.url));
    const src = readFileSync(path, 'utf-8');
    // Toglie i commenti (che possono citare confirm()/alert() per spiegare la
    // rimozione, come qui sopra) prima di cercare CHIAMATE vere nel codice.
    const senzaCommenti = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    const matches = senzaCommenti.match(/\b(confirm|alert|prompt)\s*\(/g) ?? [];
    expect(matches).toEqual([]);
  });
});
