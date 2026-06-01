import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import GlobalNav from './GlobalNav';

/* Layout della shell multigioco: contenuto + bottom nav globale.
   La GameBar (dove serve) la montano le singole schermate (M2b). */
export default function ShellLayout() {
  useEffect(() => {
    document.body.classList.add('in-app');
    return () => document.body.classList.remove('in-app');
  }, []);

  return (
    <>
      <Outlet />
      <GlobalNav />
    </>
  );
}
