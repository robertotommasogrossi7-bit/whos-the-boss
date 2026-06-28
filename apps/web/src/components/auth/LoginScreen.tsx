import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { GameIcon } from '../icons';

type Tab = 'login' | 'reg';

export default function LoginScreen() {
  const [tab, setTab] = useState<Tab>('login');

  const navigate = useNavigate();
  const toast    = useStore(s => s.toast);
  const login    = useStore(s => s.login);
  const register = useStore(s => s.register);

  // Login form
  const liUserRef = useRef<HTMLInputElement>(null);
  const liPwdRef  = useRef<HTMLInputElement>(null);

  // Register form
  const rgUserRef = useRef<HTMLInputElement>(null);
  const rgMailRef = useRef<HTMLInputElement>(null);
  const rgPwdRef  = useRef<HTMLInputElement>(null);

  async function doLogin() {
    const email    = liUserRef.current?.value ?? '';
    const password = liPwdRef.current?.value ?? '';
    const err = await login(email, password);
    if (err) { toast(err); return; }
    toast('Accesso effettuato!');
    navigate('/');
  }

  async function doRegister() {
    const username = rgUserRef.current?.value ?? '';
    const email    = rgMailRef.current?.value ?? '';
    const password = rgPwdRef.current?.value ?? '';
    const err = await register(username, email, password);
    if (err) { toast(err); return; }
    toast('Account creato!');
    navigate('/');
  }

  return (
    <div className="login-wrap">
      <div className="login-logo"><GameIcon icona="picche" size={64} /></div>
      <div className="login-title">Poker Tracker</div>
      <div className="login-sub">Organizza le serate di poker con i tuoi amici</div>

      <div className="login-card">
        <div className="login-tabs">
          <button
            className={`login-tab${tab === 'login' ? ' active' : ''}`}
            onClick={() => setTab('login')}
          >
            Accedi
          </button>
          <button
            className={`login-tab${tab === 'reg' ? ' active' : ''}`}
            onClick={() => setTab('reg')}
          >
            Registrati
          </button>
        </div>

        {tab === 'login' && (
          <div>
            <div className="form-row">
              <label>Email</label>
              <input
                type="email"
                placeholder="tu@esempio.it"
                autoComplete="email"
                ref={liUserRef}
              />
            </div>
            <div className="form-row">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                ref={liPwdRef}
                onKeyDown={e => e.key === 'Enter' && doLogin()}
              />
            </div>
            <button className="btn btn-green btn-block" onClick={doLogin}>
              Accedi
            </button>
          </div>
        )}

        {tab === 'reg' && (
          <div>
            <div className="form-row">
              <label>Username</label>
              <input
                type="text"
                placeholder="Scegli un username"
                autoComplete="off"
                ref={rgUserRef}
              />
            </div>
            <div className="form-row">
              <label>Email</label>
              <input
                type="email"
                placeholder="email@esempio.it"
                autoComplete="off"
                ref={rgMailRef}
              />
            </div>
            <div className="form-row">
              <label>Password</label>
              <input
                type="password"
                placeholder="Almeno 6 caratteri"
                autoComplete="new-password"
                ref={rgPwdRef}
                onKeyDown={e => e.key === 'Enter' && doRegister()}
              />
            </div>
            <button className="btn btn-green btn-block" onClick={doRegister}>
              Crea account
            </button>
          </div>
        )}

        <p className="login-note">
          Accesso reale con Supabase. La tua sessione resta attiva tra le visite.
        </p>
      </div>
    </div>
  );
}
