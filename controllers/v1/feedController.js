const UserFeed = require('../../models/UserFeed');
const Post = require('../../models/Post');

/**
 * Get user feed (paginated, interest-based).
 * GET /api/v1/feed?page=1&limit=20
 */
async function getFeed(req, res) {
  try {
    const userId = req.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // Fetch feed entries for user, sorted by score (descending)
    const feedEntries = await UserFeed.find({ userId })
      .sort({ score: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('postId score source')
      .lean();

    if (feedEntries.length === 0) {
      return res.status(200).json({
        success: true,
        feed: [],
        pagination: { page, limit, total: 0, hasMore: false },
      });
    }

    // Get post IDs
    const postIds = feedEntries.map((entry) => entry.postId);

    // Fetch posts with only necessary fields (projection)
    const posts = await Post.find({
      _id: { $in: postIds },
      isActive: true,
    })
      .select('_id userId type content media poll interests likesCount commentsCount sharesCount viewsCount createdAt')
      .populate('userId', 'name username profilePictureUrl')
      .populate('interests', 'name')
      .lean();

    // Map posts to feed entries (preserve score order)
    const postMap = {};
    posts.forEach((post) => {
      postMap[post._id.toString()] = post;
    });

    const feed = feedEntries
      .map((entry) => {
        const post = postMap[entry.postId.toString()];
        if (!post) return null; // post deleted or inactive
        return {
          ...post,
          feedScore: entry.score,
          feedSource: entry.source,
        };
      })
      .filter(Boolean); // remove null entries

    // Count total entries for pagination
    const total = await UserFeed.countDocuments({ userId });

    return res.status(200).json({
      success: true,
      feed,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + feed.length < total,
      },
    });
  } catch (err) {
    console.error('GET /feed error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch feed.' });
  }
}

module.exports = { getFeed };
