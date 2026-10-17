import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { registerServiceWorker } from './lib/registerSW.js';
import { initAnalytics } from './lib/analytics.js';
import { blockGestures } from './lib/gestures.js';
import './design/tokens.css';
import './design/components.css';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

blockGestures(document);
registerServiceWorker();
initAnalytics();
