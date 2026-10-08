import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { hideSplash } from './utils/splash';
import './styles/globals.css';

// Register the service worker so the app loads offline
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (window.confirm('A new version of Sokoni is available. Reload now?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {},
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Hide the splash after React commits its first paint. The splash
// utility waits out any remaining animation time before transitioning.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    hideSplash();
  });
});