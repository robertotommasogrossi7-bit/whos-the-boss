import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/styles.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root non trovato');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
