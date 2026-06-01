import { GIOCHI_PREIMPOSTATI } from './giochi';

/* ══════════════════════════════════════════════════════
   TEMA DINAMICO PER GIOCO (DESIGN_SPEC §5/§6)
   Applica sul root: data-tema ('poker' = feltro | 'scuro') e
   l'accento dinamico (--accent/--accent-soft). L'accento inline sul
   root è l'UNICA eccezione tollerata al "niente inline style".
══════════════════════════════════════════════════════ */

export function temaPerGioco(giocoId: string): 'poker' | 'scuro' {
  return giocoId === 'poker' ? 'poker' : 'scuro';
}

export function accentPerGioco(giocoId: string): string | null {
  return GIOCHI_PREIMPOSTATI.find(g => g.id === giocoId)?.accent ?? null;
}

/** Applica tema + accento del gioco selezionato al documento. */
export function applyTema(giocoId: string): void {
  const root = document.documentElement;
  root.dataset.tema = temaPerGioco(giocoId);

  if (giocoId === 'poker') {
    // Il feltro definisce il proprio accento (oro) via [data-tema="poker"]:
    // rimuovo l'override inline così non resta l'accento del gioco precedente.
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-soft');
    return;
  }

  const accent = accentPerGioco(giocoId);
  if (accent) {
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-soft', `${accent}22`);
  } else {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-soft');
  }
}
