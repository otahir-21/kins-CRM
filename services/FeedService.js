const User = require('../models/User');
const UserFeed = require('../models/UserFeed');
const Follow = require('../models/Follow');

/**
 * FeedService: Modular feed generation and scoring.
 * Supports interest-based and follower-based feed with extensible scoring.
 */
class FeedService {
  /**
   * Calculate score for a post-user pair. Modular design for future ranking.
   * @param {Object} post - Post document
   * @param {Object} user - User document
   * @param {Object} context - Additional context (e.g. isFollowing, engagement)
   * @returns {number} Score (higher = more relevant)
   */
  calculateScore(post, user, context = {}) {
    let score = 0;

    // Base: recency (posts created recently get higher score)
    const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 100 - ageInHours); // decay over time
    score += recencyScore;

    // Interest match
    const userInterestIds = (user.interests || []).map((i) => i.toString());
    const postInterestIds = (post.interests || []).map((i) => i.toString());
    const matchCount = postInterestIds.filter((id) => userInterestIds.includes(id)).length;
    if (matchCount > 0) {
      score += matchCount * 50; // boost per matching interest
    }

    // Follower boost: posts from people you follow rank higher
    if (context.isFollowing) {
      score += 100;
    }

    // Engagement boost (likes, comments)
    const engagementScore = (post.likesCount || 0) * 2 + (post.commentsCount || 0) * 5;
    score += Math.min(engagementScore, 200); // cap at 200

    if (context.locationBoost) {
      score += context.locationBoost;
    }

    if (context.isTrending) {
      score += 150;
    }

    return score;
  }

  /**
   * Fan-out on write: generate feed entries for users with matching interests
   * and for followers of the post author (so posts from people you follow appear).
   * One entry per (userId, postId); source is 'follower' or 'interest'.
   * @param {Object} post - Created post
   * @returns {Promise<{ targetedUsers: number }>}
   */
  async fanOutPost(post) {
    const authorId = post.userId;
    const postId = post._id;
    const postInterestIds = (post.interests || []).map((i) => (i._id ? i._id : i));

    // 1) Users with at least one matching interest (exclude author)
    let interestUserIds = [];
    if (postInterestIds.length > 0) {
      const interestUsers = await User.find({
        interests: { $in: postInterestIds },
        _id: { $ne: authorId },
      })
        .select('_id interests')
        .lean();
      interestUserIds = interestUsers.map((u) => u._id.toString());
    }

    // 2) Followers of the post author (they should see this post)
    const followerDocs = await Follow.find({ followingId: authorId }).select('followerId').lean();
    const followerIds = followerDocs.map((f) => f.followerId && f.followerId.toString()).filter(Boolean);

    // 3) Union: all user ids who should see this post (dedupe, exclude author)
    const allIdsSet = new Set([...interestUserIds, ...followerIds]);
    allIdsSet.delete(authorId.toString());
    const allUserIds = Array.from(allIdsSet);

    if (allUserIds.length === 0) {
      console.log(`Post ${postId}: no matching users or followers.`);
      return { targetedUsers: 0 };
    }

    // 4) Fetch user docs for scoring (interests + isFollowing)
    const users = await User.find({ _id: { $in: allUserIds } })
      .select('_id interests')
      .lean();
    const followerSet = new Set(followerIds);

    const feedEntries = users.map((user) => {
      const isFollowing = followerSet.has(user._id.toString());
      const score = this.calculateScore(post, user, { isFollowing });
      return {
        userId: user._id,
        postId,
        score,
        source: isFollowing ? 'follower' : 'interest',
        metadata: {
          interestMatch: postInterestIds.length > 0 && (user.interests || []).some((i) =>
            postInterestIds.some((pid) => (pid || pid.toString()) === (i && i.toString()))
          ),
          followerBoost: isFollowing ? 100 : 0,
        },
        createdAt: post.createdAt,
      };
    });

    // Upsert by (userId, postId) so we keep one entry per user and don't duplicate on re-fan
    const bulkOps = feedEntries.map((entry) => ({
      updateOne: {
        filter: { userId: entry.userId, postId: entry.postId },
        update: {
          $set: {
            score: entry.score,
            source: entry.source,
            metadata: entry.metadata,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            userId: entry.userId,
            postId: entry.postId,
            createdAt: entry.createdAt,
          },
        },
        upsert: true,
      },
    }));

    await UserFeed.bulkWrite(bulkOps);

    console.log(`Post ${postId}: fanned out to ${feedEntries.length} users (interest + follower).`);
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
