import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

declare global {
  interface Window {
    __mythosSwReg?: ServiceWorkerRegistration;
  }
}

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        window.__mythosSwReg = reg;

        const notifyWaiting = () => {
          if (reg.waiting && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('mythos-sw-update', { detail: reg }));
          }
        };

        notifyWaiting();

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') {
              notifyWaiting();
            }
          });
        });
      })
      .catch(() => {
        // Ignore SW registration failure in dev/restricted origins
      });
  });
}
