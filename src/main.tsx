import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';
import { load, loadSample } from '@/lib/store';
import { initSync } from '@/lib/sync';
import { initTheme } from '@/lib/theme';
import { initLock } from '@/lib/lock';

initTheme();
initLock(); // si hay PIN, la app arranca bloqueada

// Primer arranque: datos de ejemplo para que la app no se vea vacía.
if (!load()) loadSample();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

initSync();
registerSW({ immediate: true });
