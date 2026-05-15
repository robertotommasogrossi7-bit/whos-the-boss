import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Toast from './components/common/Toast';
import LoginScreen from './components/auth/LoginScreen';
import CircoliHome from './components/leghe/CircoliHome';
import NuovaLega from './components/leghe/NuovaLega';
import ListaLeghe from './components/leghe/ListaLeghe';

/* ── Guard: richiede utente loggato ── */
function RequireAuth({ children }: { children: ReactNode }) {
  const utente = useStore(s => s.utente);
  if (!utente) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/* ── Redirect iniziale in base allo stato auth ── */
function AutoRedirect() {
  const utente = useStore(s => s.utente);
  return <Navigate to={utente ? '/circoli' : '/login'} replace />;
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

        <Route path="/circoli"    element={<RequireAuth><CircoliHome /></RequireAuth>} />
        <Route path="/nuova-lega" element={<RequireAuth><NuovaLega /></RequireAuth>} />
        <Route path="/leghe"      element={<RequireAuth><ListaLeghe /></RequireAuth>} />

        {/* Placeholder — implementati nelle fasi successive */}
        <Route path="/app/:legaId" element={<RequireAuth><div className="screen-body">App — Fase 3</div></RequireAuth>} />
        <Route path="/debiti"     element={<RequireAuth><div className="screen-body">Debiti — Fase 3</div></RequireAuth>} />
        <Route path="/chiusura"   element={<RequireAuth><div className="screen-body">Chiusura — Fase 6</div></RequireAuth>} />

        {/* Catch-all: redirect in base all'auth */}
        <Route path="*" element={<AutoRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
