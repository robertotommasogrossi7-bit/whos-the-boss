import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useStore } from './store/useStore';
import Toast from './components/common/Toast';
import LoginScreen from './components/auth/LoginScreen';
import NuovaLega from './components/leghe/NuovaLega';
import ListaLeghe from './components/leghe/ListaLeghe';
import HubLega from './components/leghe/HubLega';
import AppLayout from './components/app/AppLayout';
import TabPartecipanti from './components/giocatori/TabPartecipanti';
import TabSerata from './components/serata/TabSerata';
import TabStorico from './components/storico/TabStorico';
import TabClassifica from './components/classifica/TabClassifica';
import DebitiScreen from './components/debiti/DebitiScreen';
import ShellLayout from './components/shell/ShellLayout';
import Home from './components/shell/Home';
import ClassificaShell from './components/shell/ClassificaShell';
import StoricoShell from './components/shell/StoricoShell';

/* ── Guard: richiede utente loggato ── */
function RequireAuth({ children }: { children: ReactNode }) {
  const utente = useStore(s => s.utente);
  if (!utente) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/* ── Redirect iniziale in base allo stato auth ── */
function AutoRedirect() {
  const utente = useStore(s => s.utente);
  return <Navigate to={utente ? '/' : '/login'} replace />;
}

/* ── Retrocompat vecchio routing /app/:legaId/* → /leghe/:legaId/poker ── */
function RedirectAppToPoker() {
  const { legaId } = useParams<{ legaId: string }>();
  return <Navigate to={`/leghe/${legaId}/poker`} replace />;
}

export default function App() {
  const runMigrations = useStore(s => s.runMigrations);

  useEffect(() => {
    runMigrations();
  }, [runMigrations]);

  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        <Route path="/login"      element={<LoginScreen />} />
        <Route path="/nuova-lega" element={<RequireAuth><NuovaLega /></RequireAuth>} />
        <Route path="/debiti"     element={<RequireAuth><DebitiScreen /></RequireAuth>} />

        {/* App poker: layout + nav propri, sotto la lega (logica invariata) */}
        <Route
          path="/leghe/:legaId/poker"
          element={<RequireAuth><AppLayout /></RequireAuth>}
        >
          <Route index element={<Navigate to="serata" replace />} />
          <Route path="partecipanti" element={<TabPartecipanti />} />
          <Route path="serata"       element={<TabSerata />} />
          <Route path="storico"      element={<TabStorico />} />
          <Route path="classifica"   element={<TabClassifica />} />
          <Route path="chiusura"     element={<Navigate to="serata" replace />} />
        </Route>

        {/* Shell multigioco: bottom nav globale a 4 voci */}
        <Route element={<RequireAuth><ShellLayout /></RequireAuth>}>
          <Route path="/"            element={<Home />} />
          <Route path="/classifica"  element={<ClassificaShell />} />
          <Route path="/storico"     element={<StoricoShell />} />
          <Route path="/leghe"       element={<ListaLeghe />} />
          <Route path="/leghe/:legaId" element={<HubLega />} />
        </Route>

        {/* Retrocompat vecchie route */}
        <Route path="/circoli"      element={<Navigate to="/" replace />} />
        <Route path="/app/:legaId/*" element={<RequireAuth><RedirectAppToPoker /></RequireAuth>} />

        {/* Catch-all */}
        <Route path="*" element={<AutoRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
