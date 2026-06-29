import { createContext, useContext } from 'react';

import { defaultTheme, type Theme } from './theme';

/* Contesto del tema attivo. In R1.1 fornisce il tema scuro di default;
   da R1.3 (store agganciato) la radice calcolera' il tema dal gioco
   selezionato (giocoFiltro) e lo passera' qui, senza toccare le schermate. */
const ThemeContext = createContext<Theme>(defaultTheme);

export const ThemeProvider = ThemeContext.Provider;

/** Hook unico per leggere il tema attivo dalle schermate/componenti. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
