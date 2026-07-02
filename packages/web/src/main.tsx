import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/im-fell-english';
import '@fontsource/caveat';
import '@fontsource/caveat/600.css';
import './index.css';
import App from './App.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
