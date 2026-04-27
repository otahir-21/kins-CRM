const { getFirestore, sendMulticast } = require('./firebaseAdmin');

const NOTIFICATIONS_COLLECTION = 'notifications';
const USERS_COLLECTION = 'users';

function db() {
  const firestore = getFirestore();
  if (!firestore) throw new Error('Firebase Firestore is not configured.');
  return firestore;
}

function normalizeTimestamp(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value._seconds === 'number') return new Date(value._seconds * 1000).toISOString();
  return null;
}

function toNotificationDoc(id, data) {
  return {
    id: String(id),
    notificationId: String(id),
    userId: data.userId ? String(data.userId) : null,
    type: data.type || 'system',
    title: data.title ?? null,
    body: data.body ?? null,
    senderId: data.senderId ?? null,
    senderName: data.senderName ?? null,
    senderProfilePicture: data.senderProfilePicture ?? null,
    action: data.action ?? data.body ?? null,
    relatedPostId: data.relatedPostId ? String(data.relatedPostId) : null,
    postThumbnail: data.postThumbnail ?? null,
    read: data.read === true,
    timestamp: normalizeTimestamp(data.createdAt),
    createdAt: normalizeTimestamp(data.createdAt),
  };
}

async function getFCMToken(userId) {
  const id = String(userId || '').trim();
  if (!id) return null;
  const doc = await db().collection(USERS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data() || {};
  return data.fcmToken ? String(data.fcmToken) : null;
}

async function saveFCMToken(userId, fcmToken) {
  const id = String(userId || '').trim();
  if (!id) return { success: true, user: null };
  const now = new Date().toISOString();
  await db().collection(USERS_COLLECTION).doc(id).set(
    { fcmToken: fcmToken || null, updatedAt: now },
    { merge: true }
  );
  const doc = await db().collection(USERS_COLLECTION).doc(id).get();
  return { success: true, user: doc.exists ? { id, ...(doc.data() || {}) } : null };
}

async function sendNotification(userId, notificationData) {
  const id = String(userId || '').trim();
  if (!id) return { success: false, messageId: null, notificationId: null };
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
  const now = new Date().toISOString();
  const payload = {
    userId: id,
    type: type || 'system',
    title: title ?? (type === 'warning' ? 'Warning from KINS' : null),
    body: body ?? action ?? '',
    senderId: senderId ?? null,
    senderName: senderName ?? null,
    senderProfilePicture: senderProfilePicture ?? null,
    action: action ?? body ?? null,
    relatedPostId: relatedPostId ? String(relatedPostId) : null,
    postThumbnail: postThumbnail ?? null,
    read: false,
    createdAt: now,
    updatedAt: now,
  };
  const ref = db().collection(NOTIFICATIONS_COLLECTION).doc();
  await ref.set(payload);

  let pushSent = false;
  try {
    const token = await getFCMToken(id);
    if (token) {
      const titleText = (payload.title || 'KINS').trim() || 'KINS';
      const bodyText = (payload.body || 'You have a new notification.').trim() || 'You have a new notification.';
      const dataPayload = {
        type: payload.type,
        notificationId: ref.id,
        ...(payload.senderName ? { senderName: String(payload.senderName) } : {}),
        ...(payload.relatedPostId ? { relatedPostId: String(payload.relatedPostId) } : {}),
      };
      const pushResult = await sendMulticast([token], dataPayload, { title: titleText, body: bodyText });
      pushSent = !!(pushResult && pushResult.successCount > 0);
    }
  } catch (err) {
    console.error('FCM push after sendNotification (firebase):', err.message);
  }

  return { success: true, messageId: pushSent ? 'sent' : null, notificationId: ref.id };
}

async function sendBulkNotifications(userIds, notificationData) {
  const list = Array.isArray(userIds) ? userIds : [];
  const results = [];
  for (const userId of list) {
    try {
      const r = await sendNotification(userId, notificationData);
      results.push({ userId, ...r });
    } catch (err) {
      results.push({ userId, success: false, error: err.message });
    }
  }
  return { results };
}

async function getUserNotifications(userId, options = {}) {
  const id = String(userId || '').trim();
  if (!id) return [];
  const limit = Math.min(parseInt(options.limit, 10) || 50, 100);
  const col = db().collection(NOTIFICATIONS_COLLECTION);
  const needsFilter = !!(options.unreadOnly || options.type);
  const fetchCap = needsFilter ? Math.min(300, Math.max(limit * 3, limit)) : limit;

  const mapAndFilter = (snap) => {
    let rows = snap.docs.map((doc) => toNotificationDoc(doc.id, doc.data() || {}));
    if (options.unreadOnly) rows = rows.filter((r) => !r.read);
    if (options.type) rows = rows.filter((r) => String(r.type || '') === String(options.type));
    return rows;
  };

  try {
    const snap = await col.where('userId', '==', id).orderBy('createdAt', 'desc').limit(fetchCap).get();
    return mapAndFilter(snap).slice(0, limit);
  } catch (err) {
    const snap = await col.where('userId', '==', id).get();
    let rows = mapAndFilter(snap);
    rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return rows.slice(0, limit);
  }
}

async function markNotificationAsRead(userId, notificationId) {
  const uid = String(userId || '').trim();
  const nid = String(notificationId || '').trim();
  if (!uid || !nid) return;
  const ref = db().collection(NOTIFICATIONS_COLLECTION).doc(nid);
  const doc = await ref.get();
  if (!doc.exists) return;
  const data = doc.data() || {};
  if (String(data.userId || '') !== uid) return;
  await ref.set({ read: true, updatedAt: new Date().toISOString() }, { merge: true });
}

async function markAllNotificationsAsRead(userId) {
  const uid = String(userId || '').trim();
  if (!uid) return 0;
  const col = db().collection(NOTIFICATIONS_COLLECTION);
  let docs;
  try {
    const snap = await col.where('userId', '==', uid).where('read', '==', false).get();
    docs = snap.docs;
  } catch (err) {
    const snap = await col.where('userId', '==', uid).get();
    docs = snap.docs.filter((d) => (d.data() || {}).read !== true);
  }

  const now = new Date().toISOString();
  let count = 0;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = db().batch();
    const chunk = docs.slice(i, i + 450);
    for (const doc of chunk) {
      batch.set(doc.ref, { read: true, updatedAt: now }, { merge: true });
      count += 1;
    }
    await batch.commit();
  }
  return count;
}

async function getNotificationStats(userId) {
  const uid = String(userId || '').trim();
  if (!uid) return { total: 0, unread: 0 };
  const col = db().collection(NOTIFICATIONS_COLLECTION);
  try {
    const [totalSnap, unreadSnap] = await Promise.all([
      col.where('userId', '==', uid).count().get(),
      col.where('userId', '==', uid).where('read', '==', false).count().get(),
    ]);
    return { total: totalSnap.data().count, unread: unreadSnap.data().count };
  } catch (err) {
    const snap = await col.where('userId', '==', uid).get();
    const total = snap.docs.length;
    const unread = snap.docs.reduce((acc, d) => {
      const data = d.data() || {};
      return acc + (data.read === true ? 0 : 1);
    }, 0);
    return { total, unread };
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

