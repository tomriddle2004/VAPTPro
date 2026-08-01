import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { initTheme } from '@/lib/theme';
import App from './App';

// Apply persisted theme BEFORE first paint to avoid flash
initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
