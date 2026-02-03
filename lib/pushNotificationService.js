import { getDatabase } from '@/lib/mongodb';
import { sendPushNotificationToMany, NotificationPayloads } from '@/lib/webPush';

/**
 * Push Notification Service
 * Handles scheduling and sending push notifications for Lounge and SQ events
 */

/**
 * Check if it's time to send Lounge Queue notifications
 * Lounge Queue opens at XX:00 and closes at XX:55
 * @returns {boolean} Whether to send lounge queue notifications
 */
export function shouldSendLoungeQueueNotification() {
  const now = new Date();
  const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const currentMinutes = parisTime.getMinutes();
  
  // Send notification at the start of each hour (within first 2 minutes)
  return currentMinutes >= 0 && currentMinutes <= 2;
}

/**
 * Check if it's time to send SQ Queue notifications
 * SQ Queue opens 45 minutes before the SQ starts
 * @param {Object} sq - Squad Queue event
 * @returns {boolean} Whether to send SQ queue notification
 */
export function shouldSendSQQueueNotification(sq) {
  const now = Date.now();
  const sqTime = sq.time;
  const queueOpenTime = sqTime - (45 * 60 * 1000); // 45 min before
  
  // Notify within the first 2 minutes of queue opening
  const diff = now - queueOpenTime;
  return diff >= 0 && diff <= 2 * 60 * 1000;
}

/**
 * Get current hour info for Lounge Queue
 */
export function getLoungeQueueInfo() {
  const now = new Date();
  const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const currentHour = parisTime.getHours();
  const currentMinutes = parisTime.getMinutes();
  const nextHour = (currentHour + 1) % 24;
  
  return {
    currentHour,
    currentMinutes,
    nextHour,
    isQueueOpen: currentMinutes < 55,
    closesIn: 55 - currentMinutes
  };
}

/**
 * Send Lounge Queue push notifications to all subscribed users
 */
export async function sendLoungeQueueNotifications() {
  try {
    const db = await getDatabase();
    const loungeInfo = getLoungeQueueInfo();
    
    // Get all subscriptions that want lounge notifications
    const subscriptions = await db.collection('push_subscriptions')
      .find({ 
        active: true,
        'preferences.loungeQueue': true 
      })
      .toArray();
    
    if (subscriptions.length === 0) {
      console.log('[PushService] No subscriptions for lounge queue notifications');
      return { sent: 0 };
    }
    
    // Check if we already sent this notification recently (avoid duplicates)
    const notificationKey = `lounge_queue_${loungeInfo.currentHour}`;
    const recent = await db.collection('push_notification_logs')
      .findOne({
        key: notificationKey,
        sentAt: { $gte: new Date(Date.now() - 55 * 60 * 1000) } // Within last 55 min
      });
    
    if (recent) {
      console.log('[PushService] Lounge queue notification already sent for this hour');
      return { sent: 0, skipped: true };
    }
    
    // Send notifications
    const payload = NotificationPayloads.loungeQueueOpen(loungeInfo.nextHour);
    const results = await sendPushNotificationToMany(subscriptions, payload);
    
    // Log the notification
    await db.collection('push_notification_logs').insertOne({
      key: notificationKey,
      type: 'lounge_queue',
      hour: loungeInfo.currentHour,
      sentAt: new Date(),
      results
    });
    
    // Remove expired subscriptions
    if (results.expired.length > 0) {
      await db.collection('push_subscriptions').updateMany(
        { _id: { $in: results.expired } },
        { $set: { active: false, expiredAt: new Date() } }
      );
    }
    
    console.log(`[PushService] Lounge queue notifications sent: ${results.success}/${results.total}`);
    return results;
    
  } catch (error) {
    console.error('[PushService] Error sending lounge queue notifications:', error);
    throw error;
  }
}

/**
 * Send SQ Queue push notifications to subscribed users
 * @param {Object} sq - Squad Queue event
 */
export async function sendSQQueueNotifications(sq) {
  try {
    const db = await getDatabase();
    
    // Get all subscriptions that want SQ notifications
    const subscriptions = await db.collection('push_subscriptions')
      .find({ 
        active: true,
        'preferences.sqQueue': true 
      })
      .toArray();
    
    if (subscriptions.length === 0) {
      console.log('[PushService] No subscriptions for SQ queue notifications');
      return { sent: 0 };
    }
    
    // Check if we already sent this notification
    const notificationKey = `sq_queue_${sq.id}`;
    const recent = await db.collection('push_notification_logs')
      .findOne({ key: notificationKey });
    
    if (recent) {
      console.log(`[PushService] SQ queue notification already sent for SQ #${sq.id}`);
      return { sent: 0, skipped: true };
    }
    
    // Send notifications
    const payload = NotificationPayloads.sqQueueOpen(sq);
    const results = await sendPushNotificationToMany(subscriptions, payload);
    
    // Log the notification
    await db.collection('push_notification_logs').insertOne({
      key: notificationKey,
      type: 'sq_queue',
      sqId: sq.id,
      sqFormat: sq.format,
      sqTime: new Date(sq.time),
      sentAt: new Date(),
      results
    });
    
    // Remove expired subscriptions
    if (results.expired.length > 0) {
      await db.collection('push_subscriptions').updateMany(
        { _id: { $in: results.expired } },
        { $set: { active: false, expiredAt: new Date() } }
      );
    }
    
    console.log(`[PushService] SQ queue notifications sent for SQ #${sq.id}: ${results.success}/${results.total}`);
    return results;
    
  } catch (error) {
    console.error('[PushService] Error sending SQ queue notifications:', error);
    throw error;
  }
}

/**
 * Check and send all pending notifications
 * This should be called periodically (every minute)
 */
export async function checkAndSendNotifications() {
  const results = {
    loungeQueue: null,
    sqQueue: []
  };
  
  try {
    // Check Lounge Queue notifications
    if (shouldSendLoungeQueueNotification()) {
      results.loungeQueue = await sendLoungeQueueNotifications();
    }
    
    // Check SQ Queue notifications
    const db = await getDatabase();
    
    // Get upcoming SQs from cache
    const cache = await db.collection('sq_schedule_cache').findOne({ key: 'sq_schedule' });
    if (cache && cache.data) {
      const now = Date.now();
      
      for (const sq of cache.data) {
        // Check if queue is opening (45 min before)
        if (shouldSendSQQueueNotification(sq)) {
          const result = await sendSQQueueNotifications(sq);
          results.sqQueue.push({ sqId: sq.id, ...result });
        }
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('[PushService] Error in checkAndSendNotifications:', error);
    throw error;
  }
}

/**
 * Get notification statistics
 */
export async function getNotificationStats() {
  try {
    const db = await getDatabase();
    
    const [subscriptionStats, recentLogs] = await Promise.all([
      db.collection('push_subscriptions').aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$active', 1, 0] } },
            loungeEnabled: { $sum: { $cond: ['$preferences.loungeQueue', 1, 0] } },
            sqEnabled: { $sum: { $cond: ['$preferences.sqQueue', 1, 0] } }
          }
        }
      ]).toArray(),
      
      db.collection('push_notification_logs')
        .find({})
        .sort({ sentAt: -1 })
        .limit(20)
        .toArray()
    ]);
    
    return {
      subscriptions: subscriptionStats[0] || { total: 0, active: 0, loungeEnabled: 0, sqEnabled: 0 },
      recentNotifications: recentLogs
    };
    
  } catch (error) {
    console.error('[PushService] Error getting stats:', error);
    throw error;
  }
}
