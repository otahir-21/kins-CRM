/**
 * Notifications — MongoDB storage + optional FCM push.
 */
const mongoose = require('mongoose');
let User = null;
let Notification = null;
try {
  User = require('./models/User');
  Notification = require('./models/Notification');
} catch {
  // no mongoose
}

function toNotificationDoc(doc) {
  if (!doc || !doc._id) return null;
  return {
    id: doc._id.toString(),
    notificationId: doc._id.toString(),
    userId: doc.userId && doc.userId.toString ? doc.userId.toString() : doc.userId,
    type: doc.type,
    title: doc.title ?? null,
    body: doc.body ?? null,
    senderId: doc.senderId ?? null,
    senderName: doc.senderName ?? null,
    senderProfilePicture: doc.senderProfilePicture ?? null,
    action: doc.action ?? doc.body ?? null,
    relatedPostId: doc.relatedPostId ? doc.relatedPostId.toString() : null,
    postThumbnail: doc.postThumbnail ?? null,
    read: !!doc.read,
    timestamp: doc.createdAt,
    createdAt: doc.createdAt,
  };
}

async function sendNotification(userId, notificationData) {
  if (!Notification || !mongoose.Types.ObjectId.isValid(userId)) {
    return { success: true, messageId: null, notificationId: null };
  }
  const {
    senderId,
    senderName,
    senderProfilePicture,
    type,
    action,
    relatedPostId,
    postThumbnail,
    title,
    body,
  } = notificationData || {};
  const doc = await Notification.create({
    userId: new mongoose.Types.ObjectId(userId),
    type: type || 'system',
    title: title ?? (type === 'warning' ? 'Warning from KINS' : null),
    body: body ?? action ?? '',
    senderId: senderId ?? null,
    senderName: senderName ?? null,
    senderProfilePicture: senderProfilePicture ?? null,
    action: action ?? body ?? null,
    relatedPostId: relatedPostId ? new mongoose.Types.ObjectId(relatedPostId) : null,
    postThumbnail: postThumbnail ?? null,
    read: false,
  });
  let pushResult = { successCount: 0 };
  try {
    const token = await getFCMToken(userId);
    if (token) {
      const { sendMulticast } = require('./services/firebaseAdmin');
      const titleText = (title ?? (type === 'warning' ? 'Warning from KINS' : 'KINS')).trim() || 'KINS';
      const bodyText = (body ?? action ?? '').trim() || 'You have a new notification.';
      const dataPayload = {
        type: type || 'system',
        notificationId: doc._id.toString(),
        ...(doc.senderName && { senderName: String(doc.senderName) }),
        ...(doc.relatedPostId && { relatedPostId: doc.relatedPostId.toString() }),
      };
      pushResult = await sendMulticast(
        [token],
        dataPayload,
        { title: titleText, body: bodyText }
      );
    }
  } catch (err) {
    console.error('FCM push after sendNotification:', err.message);
  }
  return {
    success: true,
    messageId: pushResult.successCount > 0 ? 'sent' : null,
    notificationId: doc._id.toString(),
  };
}

async function sendBulkNotifications(userIds, notificationData) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return { results: [] };
  }
  const results = [];
  for (const uid of userIds) {
    try {
      const r = await sendNotification(uid, notificationData);
      results.push({ userId: uid, ...r });
    } catch (err) {
      results.push({ userId: uid, success: false, error: err.message });
    }
  }
  return { results };
}

async function getUserNotifications(userId, options = {}) {
  if (!Notification || !mongoose.Types.ObjectId.isValid(userId)) return [];
  const limit = Math.min(parseInt(options.limit) || 50, 100);
  const query = { userId: new mongoose.Types.ObjectId(userId) };
  if (options.unreadOnly) query.read = false;
  const list = await Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean();
  return list.map(toNotificationDoc).filter(Boolean);
}

async function markNotificationAsRead(userId, notificationId) {
  if (!Notification || !mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(notificationId)) {
    return;
  }
  await Notification.updateOne(
    { _id: notificationId, userId: new mongoose.Types.ObjectId(userId) },
    { $set: { read: true } }
  );
}

async function markAllNotificationsAsRead(userId) {
  if (!Notification || !mongoose.Types.ObjectId.isValid(userId)) return 0;
  const result = await Notification.updateMany(
    { userId: new mongoose.Types.ObjectId(userId), read: false },
    { $set: { read: true } }
  );
  return result.modifiedCount || 0;
}

async function getNotificationStats(userId) {
  if (!Notification || !mongoose.Types.ObjectId.isValid(userId)) {
    return { total: 0, unread: 0 };
  }
  const uid = new mongoose.Types.ObjectId(userId);
  const [total, unread] = await Promise.all([
    Notification.countDocuments({ userId: uid }),
    Notification.countDocuments({ userId: uid, read: false }),
  ]);
  return { total, unread };
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

async function getFCMTokens(userIds) {
  if (!User || !Array.isArray(userIds) || userIds.length === 0) return [];
  const ids = userIds.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
  const users = await User.find({ _id: { $in: ids }, fcmToken: { $exists: true, $ne: null } })
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
