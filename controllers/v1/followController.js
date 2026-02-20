const mongoose = require('mongoose');
const Follow = require('../../models/Follow');
const User = require('../../models/User');
const { isValidObjectId } = require('../../utils/validateObjectId');

/**
 * Escape special regex chars in a string for safe use in RegExp.
 */
function escapeRegex(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Display name for chat/list: prefer name, then username, then 'User'.
 */
function getDisplayName(name, username) {
  if (name != null && String(name).trim() !== '') return String(name).trim();
  if (username != null && String(username).trim() !== '') return String(username).trim();
  return 'User';
}

/**
 * Normalize user for response (public profile fields only).
 * Includes displayName so chat/list can show one label (name → username → 'User').
 */
function toPublicUser(user) {
  if (!user) return null;
  const u = user._id ? user : { _id: user.id, ...user };
  const name = u.name ?? null;
  const username = u.username ?? null;
  return {
    id: u._id.toString(),
    name,
    username,
    displayName: getDisplayName(name, username),
    profilePictureUrl: u.profilePictureUrl ?? null,
    bio: u.bio ?? null,
    followerCount: u.followerCount ?? 0,
    followingCount: u.followingCount ?? 0,
    isFollowedByMe: u.isFollowedByMe ?? false,
  };
}

/**
 * POST /users/:userId/follow
 * Current user (req.userId) follows the user with id = :userId.
 * - Cannot follow yourself.
 * - Idempotent: if already following, returns success.
 */
async function followUser(req, res) {
  try {
    const currentUserId = req.userId;
    const targetUserId = req.params.userId;

    if (!targetUserId || !isValidObjectId(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({ success: false, error: 'You cannot follow yourself.' });
    }

    const targetUser = await User.findById(targetUserId).select('_id').lean();
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const currentId = new mongoose.Types.ObjectId(currentUserId);
    const targetId = new mongoose.Types.ObjectId(targetUserId);

    // Already following? Idempotent success
    const existing = await Follow.findOne({ followerId: currentId, followingId: targetId }).lean();
    if (existing) {
      const updated = await User.findById(targetId).select('followerCount').lean();
      return res.status(200).json({
        success: true,
        message: 'Already following this user.',
        following: true,
        followerCount: (updated && updated.followerCount) ?? 0,
      });
    }

    // Create new follow
    await Follow.create({ followerId: currentId, followingId: targetId });

    // Atomic counter updates
    await User.updateOne({ _id: targetId }, { $inc: { followerCount: 1 } });
    await User.updateOne({ _id: currentId }, { $inc: { followingCount: 1 } });

    const updated = await User.findById(targetId).select('followerCount').lean();

    return res.status(200).json({
      success: true,
      message: 'Followed successfully.',
      following: true,
      followerCount: (updated && updated.followerCount) ?? 0,
    });
  } catch (err) {
    if (err.code === 11000) {
      // Race: duplicate key = already following
      const targetId = req.params.userId;
      const updated = await User.findById(targetId).select('followerCount').lean();
      return res.status(200).json({
        success: true,
        message: 'Already following this user.',
        following: true,
        followerCount: (updated && updated.followerCount) ?? 0,
      });
    }
    console.error('POST /users/:userId/follow error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to follow user.' });
  }
}

/**
 * DELETE /users/:userId/follow
 * Current user unfollows the user with id = :userId.
 */
async function unfollowUser(req, res) {
  try {
    const currentUserId = req.userId;
    const targetUserId = req.params.userId;

    if (!targetUserId || !isValidObjectId(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const currentId = new mongoose.Types.ObjectId(currentUserId);
    const targetId = new mongoose.Types.ObjectId(targetUserId);

    const deleted = await Follow.findOneAndDelete({
      followerId: currentId,
      followingId: targetId,
    });

    if (deleted) {
      await User.updateOne({ _id: targetId }, { $inc: { followerCount: -1 } });
      await User.updateOne({ _id: currentId }, { $inc: { followingCount: -1 } });
    }

    const updated = await User.findById(targetId).select('followerCount').lean();

    return res.status(200).json({
      success: true,
      message: 'Unfollowed successfully.',
      following: false,
      followerCount: Math.max(0, (updated && updated.followerCount) ?? 0),
    });
  } catch (err) {
    console.error('DELETE /users/:userId/follow error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to unfollow user.' });
  }
}

/**
 * GET /users/:userId/followers
 * List users who follow :userId (paginated).
 */
async function getFollowers(req, res) {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    if (!targetUserId || !isValidObjectId(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const targetId = new mongoose.Types.ObjectId(targetUserId);
    const currentId = new mongoose.Types.ObjectId(currentUserId);

    const followDocs = await Follow.find({ followingId: targetId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('followerId', 'name username profilePictureUrl bio followerCount followingCount')
      .lean();

    const total = await Follow.countDocuments({ followingId: targetId });
    const followerIds = followDocs.map((f) => f.followerId && f.followerId._id).filter(Boolean);

    let isFollowedByMeMap = {};
    if (followerIds.length > 0) {
      const myFollows = await Follow.find({
        followerId: currentId,
        followingId: { $in: followerIds },
      })
        .select('followingId')
        .lean();
      myFollows.forEach((f) => {
        isFollowedByMeMap[f.followingId.toString()] = true;
      });
    }

    const users = followDocs.map((f) => {
      const u = f.followerId;
      if (!u) return null;
      const userObj = toPublicUser(u);
      userObj.isFollowedByMe = !!isFollowedByMeMap[u._id.toString()];
      return userObj;
    }).filter(Boolean);

    return res.status(200).json({
      success: true,
      followers: users,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + users.length < total,
      },
    });
  } catch (err) {
    console.error('GET /users/:userId/followers error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get followers.' });
  }
}

/**
 * GET /users/:userId/following
 * List users that :userId follows (paginated).
 */
async function getFollowing(req, res) {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    if (!targetUserId || !isValidObjectId(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const targetId = new mongoose.Types.ObjectId(targetUserId);
    const currentId = new mongoose.Types.ObjectId(currentUserId);

    const followDocs = await Follow.find({ followerId: targetId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('followingId', 'name username profilePictureUrl bio followerCount followingCount')
      .lean();

    const total = await Follow.countDocuments({ followerId: targetId });
    const followingIds = followDocs.map((f) => f.followingId && f.followingId._id).filter(Boolean);

    let isFollowedByMeMap = {};
    if (followingIds.length > 0) {
      const myFollows = await Follow.find({
        followerId: currentId,
        followingId: { $in: followingIds },
      })
        .select('followingId')
        .lean();
      myFollows.forEach((f) => {
        isFollowedByMeMap[f.followingId.toString()] = true;
      });
    }

    const users = followDocs.map((f) => {
      const u = f.followingId;
      if (!u) return null;
      const userObj = toPublicUser(u);
      userObj.isFollowedByMe = !!isFollowedByMeMap[u._id.toString()];
      return userObj;
    }).filter(Boolean);

    return res.status(200).json({
      success: true,
      following: users,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + users.length < total,
      },
    });
  } catch (err) {
    console.error('GET /users/:userId/following error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get following list.' });
  }
}

/**
 * GET /users/:userId/follow/status
 * Returns whether current user follows :userId and counts.
 */
async function getFollowStatus(req, res) {
  try {
    const currentUserId = req.userId;
    const targetUserId = req.params.userId;

    if (!targetUserId || !isValidObjectId(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const targetUser = await User.findById(targetUserId)
      .select('name username profilePictureUrl followerCount followingCount')
      .lean();
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const follow = await Follow.findOne({
      followerId: currentUserId,
      followingId: targetUserId,
    }).lean();

    return res.status(200).json({
      success: true,
      following: !!follow,
      followerCount: targetUser.followerCount ?? 0,
      followingCount: targetUser.followingCount ?? 0,
      user: toPublicUser({ ...targetUser, isFollowedByMe: !!follow }),
    });
  } catch (err) {
    console.error('GET /users/:userId/follow/status error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get follow status.' });
  }
}

/**
 * GET /users/search?q=...
 * Search users by username, name, or phone number.
 * Returns public profile + isFollowedByMe. Excludes current user. Min query length 2.
 */
async function searchUsers(req, res) {
  try {
    const currentUserId = req.userId;
    const q = (req.query.q || req.query.query || '').trim();
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    if (q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters.',
      });
    }

    const conditions = [];
    const escaped = escapeRegex(q);

    if (escaped.length > 0) {
      conditions.push({ username: { $regex: escaped, $options: 'i' } });
      conditions.push({ name: { $regex: escaped, $options: 'i' } });
    }

    const digitsOnly = q.replace(/\D/g, '');
    if (digitsOnly.length >= 3) {
      const digitRegex = digitsOnly.split('').join('.*');
      conditions.push({ phoneNumber: { $regex: digitRegex, $options: 'i' } });
    }

    if (conditions.length === 0) {
      return res.status(200).json({ success: true, users: [] });
    }

    const filter = {
      _id: { $ne: currentUserId },
      $or: conditions,
    };

    const users = await User.find(filter)
      .select('name username profilePictureUrl bio followerCount followingCount')
      .limit(limit)
      .lean();

    const userIds = users.map((u) => u._id);
    const followMap = new Map();
    if (userIds.length > 0) {
      const follows = await Follow.find({
        followerId: currentUserId,
        followingId: { $in: userIds },
      })
        .select('followingId')
        .lean();
      follows.forEach((f) => followMap.set(f.followingId.toString(), true));
    }

    const list = users.map((u) =>
      toPublicUser({ ...u, isFollowedByMe: !!followMap.get(u._id.toString()) })
    );

    return res.status(200).json({ success: true, users: list });
  } catch (err) {
    console.error('GET /users/search error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Search failed.' });
  }
}

/**
 * GET /api/v1/users/suggestions
 * Suggested users for "Suggested for you" (automatic, scalable).
 * Returns users the current user does not follow: first those who share interests, then popular users. Limit 20.
 * Each item has id, name, username, displayName, profilePictureUrl, bio, followerCount, followingCount, isFollowedByMe (false).
 */
async function getSuggestions(req, res) {
  try {
    const currentUserId = req.userId;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const myId = new mongoose.Types.ObjectId(currentUserId);

    const [me, followingIds] = await Promise.all([
      User.findById(currentUserId).select('interests').lean(),
      Follow.find({ followerId: myId }).select('followingId').lean(),
    ]);

    const excludeIds = new Set([currentUserId.toString()]);
    (followingIds || []).forEach((f) => excludeIds.add(f.followingId.toString()));
    const myInterestIds = (me && me.interests) || [];

    const excludeArr = Array.from(excludeIds).filter((id) => isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id));
    if (excludeArr.length === 0) {
      excludeArr.push(myId);
    }

    const suggested = [];
    const seenIds = new Set(excludeIds);

    if (myInterestIds.length > 0) {
      const withSharedInterests = await User.find({
        _id: { $nin: excludeArr },
        interests: { $in: myInterestIds },
      })
        .select('name username profilePictureUrl bio followerCount followingCount')
        .sort({ followerCount: -1 })
        .limit(limit)
        .lean();
      withSharedInterests.forEach((u) => {
        if (!seenIds.has(u._id.toString())) {
          seenIds.add(u._id.toString());
          suggested.push(toPublicUser({ ...u, isFollowedByMe: false }));
        }
      });
    }

    if (suggested.length < limit) {
      const need = limit - suggested.length;
      const popular = await User.find({
        _id: { $nin: excludeArr },
      })
        .select('name username profilePictureUrl bio followerCount followingCount')
        .sort({ followerCount: -1 })
        .limit(need + excludeArr.length)
        .lean();
      let added = 0;
      for (const u of popular) {
        if (added >= need) break;
        const id = u._id.toString();
        if (!seenIds.has(id)) {
          seenIds.add(id);
          suggested.push(toPublicUser({ ...u, isFollowedByMe: false }));
          added += 1;
        }
      }
    }

    return res.status(200).json({
      success: true,
      suggestions: suggested.slice(0, limit),
    });
  } catch (err) {
    console.error('GET /users/suggestions error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get suggestions.' });
  }
}

/**
 * GET /api/v1/users/:userId
 * Public profile for a user (name, username, displayName, bio, avatar, counts, isFollowedByMe).
 * For chat: use user.displayName (name → username → 'User') so the other user's label is never "User" when we have username.
 */
async function getPublicProfile(req, res) {
  try {
    const currentUserId = req.userId;
    const targetUserId = req.params.userId;

    if (!targetUserId || !isValidObjectId(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const targetUser = await User.findById(targetUserId)
      .select('name username profilePictureUrl bio followerCount followingCount')
      .lean();
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const follow = await Follow.findOne({
      followerId: currentUserId,
      followingId: targetUserId,
    }).lean();

    return res.status(200).json({
      success: true,
      user: toPublicUser({ ...targetUser, isFollowedByMe: !!follow }),
    });
  } catch (err) {
    console.error('GET /users/:userId error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get profile.' });
  }
}

module.exports = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getPublicProfile,
  getSuggestions,
  searchUsers,
};
