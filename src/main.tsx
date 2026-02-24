import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';

// Polyfill for Promise.withResolvers (required by pdfjs-dist 5.x)
if (typeof (Promise as any).withResolvers === 'undefined') {
  if (typeof window !== 'undefined') {
    // Polyfill for Promise.withResolvers (required by pdfjs-dist 5.x)
    (window.Promise as any).withResolvers = function () {
      let resolve, reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
