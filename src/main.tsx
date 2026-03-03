import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element "#root" was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

const bootShell = document.getElementById('boot-shell');

if (bootShell) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      bootShell.dataset.hidden = 'true';

      window.setTimeout(() => {
        bootShell.remove();
      }, 220);
    });
  });
}
