const Post = require('../../models/Post');
const UserFeed = require('../../models/UserFeed');
const User = require('../../models/User');
const mongoose = require('mongoose');

/**
 * Debug: Check feed data for current user.
 * GET /api/v1/debug/feed
 */
async function debugFeed(req, res) {
  try {
    const userId = req.userId;

    // Get user's interests
    const user = await User.findById(userId).select('interests').lean();
    const userInterestIds = (user.interests || []).map((i) => i.toString());

    // Get all posts count by type
    const postStats = await Post.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          withInterests: {
            $sum: {
              $cond: [{ $gt: [{ $size: { $ifNull: ['$interests', []] } }, 0] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Get user's feed entries count
    const feedEntriesCount = await UserFeed.countDocuments({ userId });

    // Get feed entries grouped by post type
    const feedEntries = await UserFeed.find({ userId })
      .populate({
        path: 'postId',
        select: 'type interests isActive',
      })
      .lean();

    const feedByType = {};
    feedEntries.forEach((entry) => {
      if (entry.postId) {
        const type = entry.postId.type;
        if (!feedByType[type]) feedByType[type] = 0;
        feedByType[type]++;
      }
    });

    // Get sample image/video posts with interests
    const imageVideoPosts = await Post.find({
      type: { $in: ['image', 'video'] },
      isActive: true,
    })
      .select('_id type interests createdAt')
      .limit(5)
      .sort({ createdAt: -1 })
      .lean();

    // Check which image/video posts match user's interests
    const matchingImageVideoPosts = imageVideoPosts.filter((post) => {
      const postInterests = (post.interests || []).map((i) => i.toString());
      return postInterests.some((pi) => userInterestIds.includes(pi));
    });

    return res.status(200).json({
      success: true,
      debug: {
        userId,
        userInterests: userInterestIds,
        userInterestsCount: userInterestIds.length,
        allPostsByType: postStats,
        userFeedEntriesTotal: feedEntriesCount,
        userFeedEntriesByType: feedByType,
        sampleImageVideoPosts: imageVideoPosts.map((p) => ({
          _id: p._id,
          type: p.type,
          interests: p.interests,
          matchesUserInterests: matchingImageVideoPosts.some((mp) => mp._id.toString() === p._id.toString()),
        })),
        diagnosis: {
          hasImagePostsInDB: postStats.some((s) => s._id === 'image' && s.count > 0),
          hasVideoPostsInDB: postStats.some((s) => s._id === 'video' && s.count > 0),
          hasImagePostsInFeed: (feedByType.image || 0) > 0,
          hasVideoPostsInFeed: (feedByType.video || 0) > 0,
          possibleIssues: [],
        },
      },
    });
  } catch (err) {
    console.error('GET /debug/feed error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Debug: Get all posts (for admin).
 * GET /api/v1/debug/posts?type=image
 */
async function debugPosts(req, res) {
  try {
    const { type } = req.query;
    const filter = { isActive: true };
    if (type) filter.type = type;

    const posts = await Post.find(filter)
      .select('_id type userId interests createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const total = await Post.countDocuments(filter);

    return res.status(200).json({
      success: true,
      posts,
      total,
      filter,
    });
  } catch (err) {
    console.error('GET /debug/posts error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { debugFeed, debugPosts };
