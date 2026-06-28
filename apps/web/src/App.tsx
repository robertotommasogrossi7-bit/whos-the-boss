import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useStore } from './store/useStore';
import Toast from './components/common/Toast';
import LoginScreen from './components/auth/LoginScreen';
import NuovaLega from './components/leghe/NuovaLega';
import ListaLeghe from './components/leghe/ListaLeghe';
import LegaLayout from './components/leghe/LegaLayout';
import LegaHome from './components/leghe/LegaHome';
import LegaClassifica from './components/leghe/LegaClassifica';
import LegaStorico from './components/leghe/LegaStorico';
import SchermataGiocoLega from './components/leghe/SchermataGiocoLega';
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
  const initAuth      = useStore(s => s.initAuth);
  const authLoading   = useStore(s => s.authLoading);

  useEffect(() => {
    runMigrations();
    initAuth();
  }, [runMigrations, initAuth]);

  // Finché la sessione Supabase non è ripristinata, mostra un loader: così
  // RequireAuth non sbatte su /login prima del restore (niente flash al refresh).
  if (authLoading) {
    return <div className="app-loading">Caricamento…</div>;
  }

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
        </Route>

        {/* Sezione lega: nav propria a 4 schede (M3) */}
        <Route path="/leghe/:legaId" element={<RequireAuth><LegaLayout /></RequireAuth>}>
          <Route index               element={<LegaHome />} />
          <Route path="classifica"   element={<LegaClassifica />} />
          <Route path="storico"      element={<LegaStorico />} />
          <Route path="giocatori"    element={<TabPartecipanti />} />
          <Route path="g/:giocoId"   element={<SchermataGiocoLega />} />
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
