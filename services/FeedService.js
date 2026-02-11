const User = require('../models/User');
const UserFeed = require('../models/UserFeed');

/**
 * FeedService: Modular feed generation and scoring.
 * Supports interest-based feed with extensible scoring for future features.
 */
class FeedService {
  /**
   * Calculate score for a post-user pair. Modular design for future ranking.
   * @param {Object} post - Post document
   * @param {Object} user - User document
   * @param {Object} context - Additional context (e.g. engagement, location)
   * @returns {number} Score (higher = more relevant)
   */
  calculateScore(post, user, context = {}) {
    let score = 0;

    // Base: recency (posts created recently get higher score)
    const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 100 - ageInHours); // decay over time
    score += recencyScore;

    // Interest match (current implementation)
    const userInterestIds = (user.interests || []).map((i) => i.toString());
    const postInterestIds = (post.interests || []).map((i) => i.toString());
    const matchCount = postInterestIds.filter((id) => userInterestIds.includes(id)).length;
    if (matchCount > 0) {
      score += matchCount * 50; // boost per matching interest
    }

    // Future: follower boost (if user follows post author)
    if (context.isFollowing) {
      score += 100;
    }

    // Future: engagement boost (likes, comments)
    const engagementScore = (post.likesCount || 0) * 2 + (post.commentsCount || 0) * 5;
    score += Math.min(engagementScore, 200); // cap at 200

    // Future: location boost
    if (context.locationBoost) {
      score += context.locationBoost;
    }

    // Future: trending boost
    if (context.isTrending) {
      score += 150;
    }

    return score;
  }

  /**
   * Fan-out on write: generate feed entries for users with matching interests.
   * @param {Object} post - Created post
   * @returns {Promise<{ targetedUsers: number }>}
   */
  async fanOutPost(post) {
    if (!post.interests || post.interests.length === 0) {
      console.warn(`Post ${post._id} has no interests; skipping fan-out.`);
      return { targetedUsers: 0 };
    }

    const postInterestIds = post.interests.map((i) => (i._id ? i._id : i));

    // Find users with at least one matching interest
    const users = await User.find({
      interests: { $in: postInterestIds },
      _id: { $ne: post.userId }, // exclude post author
    })
      .select('_id interests')
      .lean();

    if (users.length === 0) {
      console.log(`Post ${post._id}: no matching users.`);
      return { targetedUsers: 0 };
    }

    // Generate feed entries with scores
    const feedEntries = users.map((user) => {
      const score = this.calculateScore(post, user, {});
      return {
        userId: user._id,
        postId: post._id,
        score,
        source: 'interest',
        metadata: { interestMatch: true },
        createdAt: post.createdAt,
      };
    });

    // Batch insert (ignore duplicates if post is re-fanned)
    await UserFeed.insertMany(feedEntries, { ordered: false }).catch((err) => {
      if (err.code !== 11000) throw err; // ignore duplicate key errors
    });

    console.log(`Post ${post._id}: fanned out to ${feedEntries.length} users.`);
    return { targetedUsers: feedEntries.length };
  }

  /**
   * Recalculate and update scores for a post (e.g. after engagement change).
   * @param {string} postId
   */
  async recalculateScoresForPost(postId) {
    // Future: fetch all UserFeed entries for this post, recalculate scores, and update
    console.log(`Recalculate scores for post ${postId} - not yet implemented.`);
  }
}

module.exports = new FeedService();
