import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import cssVars from 'css-vars-ponyfill';

// Polifill CSS variables for older WebViews (like Nokia N1 Android 5.0 Chrome 37/38)
cssVars({
  watch: true,
  onlyLegacy: true,
});

// Register Service Worker for PWA capabilities in production
if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker successfully registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.error('[PWA] Service Worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register PWA service worker for full offline capability
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = './sw.js';
    navigator.serviceWorker.register(swPath)
      .then(reg => {
        console.log('[PWA] Service Worker registered successfully with scope:', reg.scope);
      })
      .catch(err => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}

// Global PWA installation prompt interceptor
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default browser install automatic action
    e.preventDefault();
    // Cache the event so we can trigger it in Settings later
    (window as any).deferredInstallPrompt = e;
    // Notify any mounted settings dialogs about prompt availability
    window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
  });
}



