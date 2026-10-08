import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/globals.css';

// Register the service worker so the app loads offline
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // New version available — reload automatically
    if (window.confirm('A new version of Sokoni is available. Reload now?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    // Quiet — no need to bother the user; the OfflineBanner handles it
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);