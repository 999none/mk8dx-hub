'use client';

import { useEffect } from 'react';

/**
 * ServiceWorkerProvider
 * Registers the service worker on app load for push notification support
 */
export default function ServiceWorkerProvider({ children }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[App] Service Worker registered:', registration.scope);
          
          // Check for updates
          registration.update();
        })
        .catch((error) => {
          console.warn('[App] Service Worker registration failed:', error);
        });
    }
  }, []);

  return children;
}
