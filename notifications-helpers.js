/**
 * Notifications — stubbed (Firebase removed). Implement with MongoDB if needed.
 */
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
  return { success: true };
}
async function getFCMToken(userId) {
  return null;
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
