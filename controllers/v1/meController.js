const mongoose = require('mongoose');
const User = require('../../models/User');
const Interest = require('../../models/Interest');
const Post = require('../../models/Post');
const { isValidObjectId } = require('../../utils/validateObjectId');
const { getUserNotifications, getNotificationStats, markNotificationAsRead, markAllNotificationsAsRead } = require('../../notifications-helpers');
const { createCustomToken, getMissingFirebaseEnv, getLastFirebaseError } = require('../../services/firebaseAdmin');
const BunnyService = require('../../services/BunnyService');

const ABOUT_FIELDS = ['name', 'username', 'bio', 'status', 'gender', 'dateOfBirth', 'profilePictureUrl', 'documentUrl', 'email', 'phoneNumber', 'country', 'city'];

function toUserResponse(user) {
  if (!user) return null;
  const u = user._id ? user : { _id: user.id, ...user };
  const loc = u.location;
  return {
    id: u._id.toString(),
    provider: u.provider,
    providerUserId: u.providerUserId,
    name: u.name ?? null,
    email: u.email ?? null,
    phoneNumber: u.phoneNumber ?? null,
    username: u.username ?? null,
    profilePictureUrl: u.profilePictureUrl ?? null,
    bio: u.bio ?? null,
    status: u.status ?? null,
    gender: u.gender ?? null,
    dateOfBirth: u.dateOfBirth ?? null,
    documentUrl: u.documentUrl ?? null,
    country: u.country ?? null,
    city: u.city ?? null,
    followerCount: u.followerCount ?? 0,
    followingCount: u.followingCount ?? 0,
    interests: (u.interests || []).map((i) => (i && i._id ? i._id.toString() : i.toString())),
    interestsUpdatedAt: u.interestsUpdatedAt ?? null,
    savedPosts: (u.savedPosts || []).map((id) => (id && id.toString ? id.toString() : id)),
    latitude: loc?.latitude ?? null,
    longitude: loc?.longitude ?? null,
    locationIsVisible: loc?.isVisible ?? false,
    locationUpdatedAt: loc?.updatedAt ?? null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function toInterestDoc(i) {
  if (!i || !i._id) return null;
  return {
    id: i._id.toString(),
    name: i.name,
    isActive: i.isActive,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

/**
 * GET /me - current user profile
 */
async function getMe(req, res) {
  return res.status(200).json({ success: true, user: toUserResponse(req.user) });
}

/**
 * GET /me/firebase-token - get Firebase custom token for chat (Firestore/Storage).
 * UID in the token = current user's MongoDB _id so Flutter can use same identity in Firebase.
 */
async function getFirebaseToken(req, res) {
  try {
    const uid = req.userId.toString();
    const token = await createCustomToken(uid);
    if (!token) {
      const missing = getMissingFirebaseEnv();
      const detail = getLastFirebaseError();
      let message;
      if (missing.length) {
        message = `Firebase not configured. Missing: ${missing.join(', ')}. Set these in the server environment (e.g. .env or host env vars) and restart.`;
      } else if (detail) {
        message = `Firebase init failed: ${detail}. Check FIREBASE_PRIVATE_KEY format (use \\n for newlines if pasted in one line).`;
      } else {
        message = 'Firebase not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in the server environment and restart.';
      }
      return res.status(503).json({
        success: false,
        error: message,
        missing: missing.length ? missing : undefined,
        detail: detail || undefined,
      });
    }
    return res.status(200).json({ success: true, token });
  } catch (err) {
    console.error('GET /me/firebase-token error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create Firebase token.' });
  }
}

/**
 * POST /me/profile-picture - upload profile picture (multipart field "media", same as post upload).
 * Send one image in the "media" field. Returns updated user.
 */
async function uploadProfilePicture(req, res) {
  try {
    const file = req.files && req.files[0];
    if (!file || !file.buffer) {
      return res.status(400).json({ success: false, error: 'No image provided. Use multipart field name: media (same as post upload).' });
    }
    if (!BunnyService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Profile picture upload is not configured. Set BUNNY_STORAGE_ZONE, BUNNY_ACCESS_KEY, BUNNY_CDN_URL in environment.',
      });
    }
    const fileName = file.originalname || `profile_${Date.now()}.jpg`;
    const { cdnUrl } = await BunnyService.upload(file.buffer, fileName, 'profile');
    const user = await User.findByIdAndUpdate(
      req.userId,
      { profilePictureUrl: cdnUrl, updatedAt: new Date() },
      { new: true }
    ).lean();
    return res.status(200).json({ success: true, user: toUserResponse(user), profilePictureUrl: cdnUrl });
  } catch (err) {
    console.error('POST /me/profile-picture error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to upload profile picture.' });
  }
}

/**
 * PUT /me/about - update profile fields
 * Body: { name?, username?, bio?, status?, gender?, dateOfBirth?, profilePictureUrl?, documentUrl?, email?, phoneNumber?, country?, city?, latitude?, longitude?, locationIsVisible? }
 */
async function updateMeAbout(req, res) {
  const filtered = {};
  for (const key of ABOUT_FIELDS) {
    if (req.body[key] !== undefined) {
      if (typeof req.body[key] === 'string') {
        const trimmed = req.body[key].trim();
        filtered[key] = trimmed || null;
      } else {
        filtered[key] = req.body[key];
      }
    }
  }
  if (req.body.dateOfBirth !== undefined) {
    const v = req.body.dateOfBirth;
    if (v !== null && (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.trim()))) {
      return res.status(400).json({ success: false, error: 'dateOfBirth must be yyyy-MM-dd or null.' });
    }
    filtered.dateOfBirth = v && typeof v === 'string' ? v.trim() || null : null;
  }

  if (req.body.latitude !== undefined || req.body.longitude !== undefined || req.body.locationIsVisible !== undefined) {
    const current = await User.findById(req.userId).select('location').lean();
    const loc = current?.location || {};
    let lat = req.body.latitude !== undefined ? Number(req.body.latitude) : (loc.latitude ?? null);
    let lng = req.body.longitude !== undefined ? Number(req.body.longitude) : (loc.longitude ?? null);
    if (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
      return res.status(400).json({ success: false, error: 'latitude must be between -90 and 90.' });
    }
    if (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
      return res.status(400).json({ success: false, error: 'longitude must be between -180 and 180.' });
    }
    const isVisible = req.body.locationIsVisible !== undefined ? Boolean(req.body.locationIsVisible) : (loc.isVisible ?? false);
    filtered['location.latitude'] = lat;
    filtered['location.longitude'] = lng;
    filtered['location.isVisible'] = isVisible;
    filtered['location.updatedAt'] = new Date();
  }

  if (Object.keys(filtered).length === 0) {
    return res.status(400).json({ success: false, error: 'No valid fields to update.' });
  }

  filtered.updatedAt = new Date();
  const user = await User.findByIdAndUpdate(req.userId, { $set: filtered }, { new: true }).lean();
  return res.status(200).json({ success: true, user: toUserResponse(user) });
}

/**
 * POST /me/interests - replace user interests atomically
 * Body: { interestIds: ["id1", "id2"] }
 */
async function setMyInterests(req, res) {
  const { interestIds } = req.body;
  if (!Array.isArray(interestIds)) {
    return res.status(400).json({ success: false, error: 'interestIds must be an array.' });
  }
  const validIds = interestIds.filter((id) => id && typeof id === 'string' && isValidObjectId(id));
  if (validIds.length !== interestIds.length) {
    return res.status(400).json({ success: false, error: 'All interestIds must be valid MongoDB ObjectIds.' });
  }
  const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));
  const count = await Interest.countDocuments({ _id: { $in: objectIds }, isActive: true });
  if (count !== objectIds.length) {
    return res.status(400).json({ success: false, error: 'One or more interest IDs are invalid or inactive.' });
  }

  const now = new Date();
  await User.findByIdAndUpdate(req.userId, {
    interests: objectIds,
    interestsUpdatedAt: now,
    updatedAt: now,
  });

  const interests = await Interest.find({ _id: { $in: objectIds } }).sort({ name: 1 }).lean();
  const list = interests.map(toInterestDoc);
  return res.status(200).json({ success: true, interests: list, data: list });
}

/**
 * GET /me/interests - return full interest objects for user
 */
async function getMyInterests(req, res) {
  const user = await User.findById(req.userId).populate('interests').lean();
  const interestList = (user && user.interests) || [];
  const list = interestList.map((i) => (i && i._id ? toInterestDoc(i) : null)).filter(Boolean);
  return res.status(200).json({ success: true, interests: list, data: list });
}

/**
 * POST /me/fcm-token - save FCM token for push (chat notifications).
 * Body: { fcmToken: string }
 */
async function saveFcmToken(req, res) {
  try {
    const { fcmToken } = req.body;
    const token = typeof fcmToken === 'string' ? fcmToken.trim() || null : null;
    await User.findByIdAndUpdate(req.userId, { fcmToken: token, updatedAt: new Date() });
    return res.status(200).json({ success: true, message: 'FCM token saved.' });
  } catch (err) {
    console.error('POST /me/fcm-token error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to save FCM token.' });
  }
}

/**
 * DELETE /me - delete user account (hard delete from MongoDB).
 * Cascade: deactivate all posts by this user so they stop showing in feed (no "anonymous" author).
 */
async function deleteMe(req, res) {
  try {
    const userId = req.userId;
    await Post.updateMany({ userId }, { isActive: false });
    await User.findByIdAndDelete(userId);
    return res.status(200).json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('DELETE /me error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete account.' });
  }
}

/**
 * GET /me/notifications - list current user's in-app notifications (e.g. warnings from admin).
 */
async function getMyNotifications(req, res) {
  try {
    const userId = req.userId;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const unreadOnly = req.query.unreadOnly === 'true';
    const list = await getUserNotifications(userId, { limit, unreadOnly });
    return res.status(200).json({ success: true, notifications: list, data: list });
  } catch (err) {
    console.error('GET /me/notifications error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch notifications.' });
  }
}

/**
 * GET /me/notifications/stats - total and unread count.
 */
async function getMyNotificationStats(req, res) {
  try {
    const stats = await getNotificationStats(req.userId);
    return res.status(200).json({ success: true, ...stats });
  } catch (err) {
    console.error('GET /me/notifications/stats error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch notification stats.' });
  }
}

/**
 * PUT /me/notifications/:notificationId/read - mark one as read.
 */
async function markMyNotificationRead(req, res) {
  try {
    const { notificationId } = req.params;
    if (!isValidObjectId(notificationId)) {
      return res.status(400).json({ success: false, error: 'Invalid notification ID.' });
    }
    await markNotificationAsRead(req.userId, notificationId);
    return res.status(200).json({ success: true, message: 'Marked as read.' });
  } catch (err) {
    console.error('PUT /me/notifications/:id/read error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to mark as read.' });
  }
}

/**
 * PUT /me/notifications/read-all - mark all as read.
 */
async function markMyNotificationsAllRead(req, res) {
  try {
    const count = await markAllNotificationsAsRead(req.userId);
    return res.status(200).json({ success: true, message: 'All marked as read.', count });
  } catch (err) {
    console.error('PUT /me/notifications/read-all error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to mark all as read.' });
  }
}

module.exports = {
  getMe,
  updateMeAbout,
  uploadProfilePicture,
  setMyInterests,
  getMyInterests,
  getFirebaseToken,
  saveFcmToken,
  deleteMe,
  getMyNotifications,
  getMyNotificationStats,
  markMyNotificationRead,
  markMyNotificationsAllRead,
};
