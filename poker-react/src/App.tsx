import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Toast from './components/common/Toast';
import LoginScreen from './components/auth/LoginScreen';
import CircoliHome from './components/leghe/CircoliHome';
import NuovaLega from './components/leghe/NuovaLega';
import ListaLeghe from './components/leghe/ListaLeghe';
import AppLayout from './components/app/AppLayout';
import TabPartecipanti from './components/giocatori/TabPartecipanti';
import TabSerata from './components/serata/TabSerata';
import TabStorico from './components/storico/TabStorico';
import TabClassifica from './components/classifica/TabClassifica';
import DebitiScreen from './components/debiti/DebitiScreen';
import ChiusuraScreen from './components/settlement/ChiusuraScreen';

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

        {/* App principale: layout con bottom nav e tab annidati */}
        <Route
          path="/app/:legaId"
          element={<RequireAuth><AppLayout /></RequireAuth>}
        >
          <Route index element={<Navigate to="serata" replace />} />
          <Route path="partecipanti" element={<TabPartecipanti />} />
          <Route path="serata"       element={<TabSerata />} />
          <Route path="storico"      element={<TabStorico />} />
          <Route path="classifica"   element={<TabClassifica />} />
          <Route path="chiusura"     element={<ChiusuraScreen />} />
        </Route>

        <Route path="/debiti" element={<RequireAuth><DebitiScreen /></RequireAuth>} />

        {/* Catch-all: redirect in base all'auth */}
        <Route path="*" element={<AutoRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
