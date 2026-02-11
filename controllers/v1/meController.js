const mongoose = require('mongoose');
const User = require('../../models/User');
const Interest = require('../../models/Interest');
const { isValidObjectId } = require('../../utils/validateObjectId');

const ABOUT_FIELDS = ['name', 'username', 'bio', 'status', 'gender', 'dateOfBirth', 'profilePictureUrl', 'documentUrl', 'email', 'phoneNumber', 'country', 'city'];

function toUserResponse(user) {
  if (!user) return null;
  const u = user._id ? user : { _id: user.id, ...user };
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
 * PUT /me/about - update profile fields
 * Body: { name?, username?, bio?, status?, gender?, dateOfBirth?, profilePictureUrl?, documentUrl? }
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
  if (Object.keys(filtered).length === 0) {
    return res.status(400).json({ success: false, error: 'No valid fields to update.' });
  }

  filtered.updatedAt = new Date();
  const user = await User.findByIdAndUpdate(req.userId, filtered, { new: true }).lean();
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
 * DELETE /me - delete user account (hard delete from MongoDB)
 */
async function deleteMe(req, res) {
  try {
    await User.findByIdAndDelete(req.userId);
    return res.status(200).json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('DELETE /me error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete account.' });
  }
}

module.exports = { getMe, updateMeAbout, setMyInterests, getMyInterests, deleteMe };
