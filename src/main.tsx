import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AppErrorBoundary } from './components/Common/AppErrorBoundary';
import './index.css';

(window as unknown as { __appMounted?: boolean }).__appMounted = true;
try {
  sessionStorage.removeItem('sw_recovery_reloaded');
} catch {
  // ignore storage access errors
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
