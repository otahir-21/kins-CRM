/**
 * Maintenance controller for admin operations.
 * These endpoints should be protected and only accessible by admins.
 */

const Post = require('../../models/Post');
const UserFeed = require('../../models/UserFeed');
const FeedService = require('../../services/FeedService');

/**
 * Re-fan-out existing posts to UserFeed.
 * Use this to fix posts created before feed system or when fan-out failed.
 * 
 * POST /api/v1/maintenance/refan-out
 * Body: { type?: "image" | "video" | "text" | "poll", postId?: "...", clearExisting?: true }
 */
async function refanOutPosts(req, res) {
  try {
    const { type, postId, clearExisting = true } = req.body;

    let filter = { isActive: true };
    let description = 'all active posts';

    if (postId) {
      filter._id = postId;
      description = `post ${postId}`;
    } else if (type) {
      filter.type = type;
      description = `all ${type} posts`;
    }

    // Get posts to re-fan-out
    const posts = await Post.find(filter)
      .select('_id type userId interests createdAt likesCount commentsCount')
      .lean();

    if (posts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No posts found to process.',
        processed: 0,
      });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const post of posts) {
      try {
        // Optional: Clear existing UserFeed entries for this post
        if (clearExisting) {
          await UserFeed.deleteMany({ postId: post._id });
        }

        // Re-fan-out
        await FeedService.fanOutPost(post);
        successCount++;
      } catch (err) {
        console.error(`Error re-fanning post ${post._id}:`, err);
        errorCount++;
        errors.push({
          postId: post._id,
          error: err.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Re-fanned out ${description}`,
      stats: {
        total: posts.length,
        success: successCount,
        errors: errorCount,
      },
      errors: errors.slice(0, 10), // Only show first 10 errors
    });
  } catch (err) {
    console.error('POST /maintenance/refan-out error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to re-fan-out posts.',
    });
  }
}

/**
 * Get feed statistics for debugging.
 * 
 * GET /api/v1/maintenance/feed-stats
 */
async function getFeedStats(req, res) {
  try {
    const [postStats, feedStats] = await Promise.all([
      Post.aggregate([
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
      ]),
      UserFeed.aggregate([
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            uniquePosts: { $addToSet: '$postId' },
          },
        },
      ]),
    ]);

    const feedStatsData = feedStats[0] || {
      totalEntries: 0,
      uniqueUsers: [],
      uniquePosts: [],
    };

    return res.status(200).json({
      success: true,
      posts: {
        byType: postStats,
        total: postStats.reduce((sum, stat) => sum + stat.count, 0),
      },
      userFeed: {
        totalEntries: feedStatsData.totalEntries,
        uniqueUsers: feedStatsData.uniqueUsers.length,
        uniquePosts: feedStatsData.uniquePosts.length,
      },
    });
  } catch (err) {
    console.error('GET /maintenance/feed-stats error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to get feed stats.',
    });
  }
}

module.exports = {
  refanOutPosts,
  getFeedStats,
};
