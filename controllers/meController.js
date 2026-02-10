const mongoose = require('mongoose');
const User = require('../models/User');
const Interest = require('../models/Interest');
const { isValidObjectId } = require('../utils/validateObjectId');

function toProfile(user) {
  if (!user) return null;
  const u = user._id ? user : { _id: user.id, ...user };
  return {
    id: u._id.toString(),
    firebaseUid: u.firebaseUid,
    name: u.name,
    email: u.email,
    phoneNumber: u.phoneNumber,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function toInterestDoc(i) {
  return {
    id: i._id.toString(),
    name: i.name,
    isActive: i.isActive,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

/**
 * GET /me - current user profile from MongoDB
 */
async function getMe(req, res) {
  return res.status(200).json({ success: true, user: toProfile(req.user) });
}

/**
 * POST /me/interests - replace user's interests atomically
 * Body: { interestIds: ["mongoId1", "mongoId2"] }
 * Validates all exist and are active; updates interestsUpdatedAt
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

module.exports = { getMe, setMyInterests, getMyInterests };
