import webPush from 'web-push';

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.NEXT_PUBLIC_BASE_URL || 'mailto:admin@mk8dx-hub.com';

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

/**
 * Send a push notification to a subscription
 * @param {Object} subscription - Push subscription object
 * @param {Object} payload - Notification payload
 * @returns {Promise<Object>} Result of the push
 */
export async function sendPushNotification(subscription, payload) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID keys not configured');
  }
  
  const payloadString = JSON.stringify(payload);
  
  try {
    const result = await webPush.sendNotification(subscription, payloadString);
    return { success: true, result };
  } catch (error) {
    console.error('[WebPush] Send error:', error);
    
    // Handle subscription expiration
    if (error.statusCode === 404 || error.statusCode === 410) {
      return { success: false, expired: true, error: error.message };
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Send push notifications to multiple subscriptions
 * @param {Array} subscriptions - Array of subscription objects
 * @param {Object} payload - Notification payload
 * @returns {Promise<Object>} Results summary
 */
export async function sendPushNotificationToMany(subscriptions, payload) {
  const results = {
    total: subscriptions.length,
    success: 0,
    failed: 0,
    expired: [],
    errors: []
  };
  
  const payloadString = JSON.stringify(payload);
  
  // Send in parallel with batching
  const batchSize = 10;
  for (let i = 0; i < subscriptions.length; i += batchSize) {
    const batch = subscriptions.slice(i, i + batchSize);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (sub) => {
        try {
          await webPush.sendNotification(sub.subscription, payloadString);
          return { success: true, id: sub._id || sub.id };
        } catch (error) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            return { success: false, expired: true, id: sub._id || sub.id };
          }
          return { success: false, error: error.message, id: sub._id || sub.id };
        }
      })
    );
    
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          results.success++;
        } else {
          results.failed++;
          if (result.value.expired) {
            results.expired.push(result.value.id);
          } else {
            results.errors.push(result.value);
          }
        }
      } else {
        results.failed++;
        results.errors.push({ error: result.reason?.message });
      }
    });
  }
  
  return results;
}

/**
 * Notification payloads for different event types
 */
export const NotificationPayloads = {
  // Lounge Queue opened (every hour at XX:00)
  loungeQueueOpen: (nextHour) => ({
    title: '🎮 Lounge Queue Ouverte!',
    body: `La queue pour le Lounge de ${nextHour.toString().padStart(2, '0')}H est ouverte!`,
    icon: '/favicon.ico',
    tag: `lounge-queue-${Date.now()}`,
    type: 'lounge_queue',
    url: '/lounge',
    requireInteraction: true,
    actions: [
      { action: 'open', title: '🎯 Rejoindre' },
      { action: 'close', title: 'Fermer' }
    ]
  }),
  
  // Squad Queue registration open (45 min before SQ starts)
  sqQueueOpen: (sq) => ({
    title: `🏁 SQ ${sq.format.toUpperCase()} - Queue Ouverte!`,
    body: `La queue pour la Squad Queue #${sq.id} (${sq.format.toUpperCase()}) est ouverte! Début à ${formatTime(sq.time)}.`,
    icon: '/favicon.ico',
    tag: `sq-queue-${sq.id}`,
    type: 'sq_queue',
    sqId: sq.id,
    url: '/lounge',
    requireInteraction: true,
    actions: [
      { action: 'open', title: '🎯 S\'inscrire' },
      { action: 'close', title: 'Fermer' }
    ]
  }),
  
  // SQ reminder
  sqReminder: (sq, minutesBefore) => ({
    title: `⏰ SQ ${sq.format.toUpperCase()} dans ${minutesBefore} min!`,
    body: `La Squad Queue #${sq.id} commence bientôt à ${formatTime(sq.time)}.`,
    icon: '/favicon.ico',
    tag: `sq-reminder-${sq.id}`,
    type: 'sq_reminder',
    sqId: sq.id,
    url: '/lounge',
    actions: [
      { action: 'open', title: 'Voir' },
      { action: 'close', title: 'Fermer' }
    ]
  })
};

// Helper to format time in Paris timezone
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  });
}

export { webPush };
