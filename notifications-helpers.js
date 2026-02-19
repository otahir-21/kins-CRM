/**
 * Notifications — stubbed except FCM token storage (MongoDB User.fcmToken).
 */
let User = null;
try {
  User = require('./models/User');
} catch {
  // no mongoose
}

async function sendNotification(userId, notificationData) {
  return { success: true, messageId: null, notificationId: null, warning: 'Notifications not implemented (Firebase removed).' };
}
async function sendBulkNotifications(userIds, notificationData) {
  return { success: true, results: userIds.map(() => ({ success: true })) };
}
async function getUserNotifications(userId, options = {}) {
  return [];
}
async function markNotificationAsRead(userId, notificationId) {
  return { success: true };
}
async function markAllNotificationsAsRead(userId) {
  return { success: true };
}
async function getNotificationStats(userId) {
  return { total: 0, unread: 0 };
}

async function saveFCMToken(userId, fcmToken) {
  if (!User) return { success: true };
  const u = await User.findByIdAndUpdate(userId, { fcmToken: fcmToken || null, updatedAt: new Date() }, { new: true }).lean();
  return { success: true, user: u };
}

async function getFCMToken(userId) {
  if (!User) return null;
  const u = await User.findById(userId).select('fcmToken').lean();
  return (u && u.fcmToken) || null;
}

/** Return array of FCM tokens for the given user ids (skips null/empty). */
async function getFCMTokens(userIds) {
  if (!User || !Array.isArray(userIds) || userIds.length === 0) return [];
  const users = await User.find({ _id: { $in: userIds }, fcmToken: { $exists: true, $ne: null } })
    .select('fcmToken')
    .lean();
  return users.map((u) => u.fcmToken).filter(Boolean);
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
  getFCMTokens,
};
