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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

