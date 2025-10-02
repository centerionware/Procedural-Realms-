import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const registerServiceWorker = () => {
  // Construct the absolute URL to the service worker to ensure it's on the same origin.
  // This avoids issues in specific hosting environments where relative paths might be
  // resolved incorrectly.
  const swUrl = `${window.location.origin}/service-worker.js`;
  navigator.serviceWorker.register(swUrl)
    .then(registration => {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch(err => {
      console.error('Service Worker registration failed:', err);
    });
};

if ('serviceWorker' in navigator) {
  // To prevent a race condition, we check if the document is already loaded.
  // If it is, we can register the service worker immediately.
  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    // Otherwise, we wait for the 'load' event to fire.
    window.addEventListener('load', registerServiceWorker);
  }
}
