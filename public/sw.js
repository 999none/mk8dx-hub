// Service Worker for MK8DX Hub Push Notifications

const CACHE_NAME = 'mk8dx-hub-v1';

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {};
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
    data = {
      title: 'MK8DX Hub',
      body: event.data ? event.data.text() : 'Nouvelle notification',
      icon: '/favicon.ico'
    };
  }
  
  const title = data.title || 'MK8DX Hub';
  const options = {
    body: data.body || 'Vous avez une nouvelle notification',
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'mk8dx-notification',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || '/',
      type: data.type || 'general',
      sqId: data.sqId || null,
      timestamp: Date.now()
    },
    actions: data.actions || [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ],
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Get the URL to open
  const urlToOpen = event.notification.data?.url || '/lounge';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open a new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed by user');
});

// Background sync for scheduling notifications
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkAndSendNotifications());
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);
  
  if (event.tag === 'check-lounge-queue') {
    event.waitUntil(checkLoungeQueue());
  }
});

// Check lounge queue status
async function checkLoungeQueue() {
  try {
    // Get current hour in Paris timezone
    const now = new Date();
    const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const currentMinutes = parisTime.getMinutes();
    const currentHour = parisTime.getHours();
    const nextHour = (currentHour + 1) % 24;
    
    // Check if we should notify about Lounge Queue (opens at XX:00)
    // Notify within the first few minutes of the hour
    if (currentMinutes >= 0 && currentMinutes <= 5) {
      await self.registration.showNotification('🎮 Lounge Queue Ouverte!', {
        body: `La queue pour le Lounge de ${nextHour.toString().padStart(2, '0')}H est ouverte! (ferme à ${currentHour.toString().padStart(2, '0')}:55)`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `lounge-queue-${currentHour}`,
        data: { url: '/lounge', type: 'lounge_queue' }
      });
    }
    
    console.log('[SW] Lounge queue check completed');
  } catch (error) {
    console.error('[SW] Error checking lounge queue:', error);
  }
}

// Check and send scheduled notifications
async function checkAndSendNotifications() {
  try {
    // This would typically call the server to check for pending notifications
    console.log('[SW] Checking for pending notifications...');
  } catch (error) {
    console.error('[SW] Error checking notifications:', error);
  }
}

console.log('[SW] Service Worker script loaded');
