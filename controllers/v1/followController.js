const mongoose = require('mongoose');
const Follow = require('../../models/Follow');
const User = require('../../models/User');
const { isValidObjectId } = require('../../utils/validateObjectId');

/**
 * Normalize user for response (public profile fields only).
 */
function toPublicUser(user) {
  if (!user) return null;
  const u = user._id ? user : { _id: user.id, ...user };
  return {
    id: u._id.toString(),
    name: u.name ?? null,
    username: u.username ?? null,
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
 * GET /users/:userId
 * Public profile for a user (name, username, bio, avatar, counts, isFollowedByMe).
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
};
