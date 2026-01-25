const { db, admin } = require('./firebase-config');

/**
 * Send FCM notification to a user
 * @param {string} userId - Target user ID
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Notification result
 */
async function sendNotification(userId, notificationData) {
  try {
    const {
      senderId,
      senderName,
      senderProfilePicture,
      type,
      action,
      relatedPostId,
      postThumbnail,
    } = notificationData;

    // Validate required fields
    if (!senderId || !senderName || !type || !action) {
      throw new Error('Missing required fields: senderId, senderName, type, action');
    }

    // Get user's FCM token
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken;

    // Generate notification ID
    const notificationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create notification document
    const notificationDoc = {
      notificationId,
      senderId,
      senderName,
      senderProfilePicture: senderProfilePicture || null,
      type,
      action,
      relatedPostId: relatedPostId || null,
      postThumbnail: postThumbnail || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    };

    // Save notification to Firestore (always save, even without FCM token)
    await db
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .doc(notificationId)
      .set(notificationDoc);

    // If no FCM token, just save to Firestore and return
    if (!fcmToken) {
      return {
        success: true,
        messageId: null,
        notificationId,
        notification: notificationDoc,
        warning: 'Notification saved to Firestore. User has no FCM token, so push notification was not sent. User will see this notification when they open the app.',
      };
    }

    // Prepare FCM message
    const message = {
      token: fcmToken,
      notification: {
        title: senderName,
        body: action,
      },
      data: {
        notificationId,
        senderId,
        senderName: senderName,
        senderProfilePicture: senderProfilePicture || '',
        type,
        action,
        relatedPostId: relatedPostId || '',
        postThumbnail: postThumbnail || '',
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // Send FCM message using Admin SDK
    let fcmResponse = null;
    let fcmError = null;
    
    try {
      const messaging = admin.messaging();
      fcmResponse = await messaging.send(message);
    } catch (error) {
      console.error('FCM send error:', error);
      fcmError = error.message;
      // Still return success since notification is saved to Firestore
    }

    return {
      success: true,
      messageId: fcmResponse,
      notificationId,
      notification: notificationDoc,
      fcmError: fcmError || null,
      warning: fcmError ? 'Notification saved to Firestore, but FCM push failed. User will see this notification when they open the app.' : null,
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

/**
 * Send notifications to multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Results with successes and errors
 */
async function sendBulkNotifications(userIds, notificationData) {
  const results = [];
  const errors = [];

  for (const userId of userIds) {
    try {
      const result = await sendNotification(userId, notificationData);
      results.push({ userId, success: true, ...result });
    } catch (error) {
      errors.push({ userId, error: error.message });
    }
  }

  return {
    success: true,
    sent: results.length,
    failed: errors.length,
    results,
    errors,
  };
}

/**
 * Get user's notifications
 * @param {string} userId - User ID
 * @param {Object} options - Query options { limit, unreadOnly }
 * @returns {Promise<Array>} Array of notifications
 */
async function getUserNotifications(userId, options = {}) {
  try {
    let query = db
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .orderBy('timestamp', 'desc');

    if (options.unreadOnly) {
      query = query.where('read', '==', false);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    const notifications = [];

    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return notifications;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 * @param {string} userId - User ID
 * @param {string} notificationId - Notification ID
 * @returns {Promise<boolean>} Success status
 */
async function markNotificationAsRead(userId, notificationId) {
  try {
    await db
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .doc(notificationId)
      .update({
        read: true,
        readAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of notifications marked as read
 */
async function markAllNotificationsAsRead(userId) {
  try {
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    return snapshot.size;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Get notification statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Notification statistics
 */
async function getNotificationStats(userId) {
  try {
    const allNotifications = await getUserNotifications(userId);
    const unreadNotifications = await getUserNotifications(userId, { unreadOnly: true });

    return {
      total: allNotifications.length,
      unread: unreadNotifications.length,
      read: allNotifications.length - unreadNotifications.length,
    };
  } catch (error) {
    console.error('Error getting notification stats:', error);
    throw error;
  }
}

/**
 * Save or update user's FCM token
 * @param {string} userId - User ID
 * @param {string} fcmToken - FCM token
 * @returns {Promise<Object>} Updated user data
 */
async function saveFCMToken(userId, fcmToken) {
  try {
    if (!fcmToken || fcmToken.trim() === '') {
      throw new Error('FCM token is required');
    }

    await db.collection('users').doc(userId).update({
      fcmToken: fcmToken.trim(),
      fcmTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return await db.collection('users').doc(userId).get().then(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error saving FCM token:', error);
    throw error;
  }
}

/**
 * Get user's FCM token
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} FCM token or null
 */
async function getFCMToken(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return null;
    }
    return userDoc.data()?.fcmToken || null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    throw error;
  }
}

module.exports = {
  sendNotification,
  sendBulkNotifications,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationStats,
  saveFCMToken,
  getFCMToken,
};
