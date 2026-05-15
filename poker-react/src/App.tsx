import { useEffect } from 'react';
import { useStore } from './store/useStore';

export default function App() {
  const leghe = useStore(s => s.db.leghe);
  const runMigrations = useStore(s => s.runMigrations);

  useEffect(() => {
    runMigrations();
  }, [runMigrations]);

  return (
    <div style={{ padding: '40px 24px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Poker Tracker — React</h1>
      <p style={{ color: '#555' }}>
        Leghe nel localStorage: <strong>{leghe.length}</strong>
      </p>
      {leghe.length > 0 && (
        <ul style={{ marginTop: 16, paddingLeft: 20 }}>
          {leghe.map(l => (
            <li key={l.id} style={{ marginBottom: 4 }}>
              {l.nome} — {l.partite?.length ?? 0} partite, {l.nomi?.length ?? 0} giocatori
            </li>
          ))}
        </ul>
      )}
      <p style={{ marginTop: 24, color: '#888', fontSize: 13 }}>
        Fase 1 completata. Prossima fase: auth, routing, schermate circoli.
      </p>
    </div>
  );
}
