import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { applyTema } from '../../utils/tema';
import GlobalNav from './GlobalNav';

/* Layout della shell multigioco: contenuto + bottom nav globale.
   Applica il tema/accento del gioco filtrato (DESIGN_SPEC §5). */
export default function ShellLayout() {
  const giocoFiltro = useStore(s => s.giocoFiltro);

  useEffect(() => {
    document.body.classList.add('in-app');
    return () => document.body.classList.remove('in-app');
  }, []);

  /* Ri-tema l'app col gioco selezionato (poker → feltro). */
  useEffect(() => {
    applyTema(giocoFiltro);
  }, [giocoFiltro]);

  return (
    <>
      <Outlet />
      <GlobalNav />
    </>
  );
}
