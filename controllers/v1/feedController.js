const mongoose = require('mongoose');
const UserFeed = require('../../models/UserFeed');
const Post = require('../../models/Post');

/**
 * Get user feed (paginated) with isLiked, userVote, and pollResults embedded.
 * Single GET /feed response — no N+1 calls to like/status or poll results.
 */
async function getFeed(req, res) {
  try {
    const userId = req.userId;
    const currentUserObjectId = new mongoose.Types.ObjectId(userId);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

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

    const postIds = feedEntries.map((e) => e.postId);
    const entryByPostId = {};
    feedEntries.forEach((e) => {
      entryByPostId[e.postId.toString()] = { score: e.score, source: e.source };
    });

    const pipeline = [
      { $match: { _id: { $in: postIds }, isActive: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'authorDoc',
        },
      },
      { $unwind: { path: '$authorDoc', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'interests',
          localField: 'interests',
          foreignField: '_id',
          as: 'interestsDoc',
        },
      },
      {
        $lookup: {
          from: 'likes',
          let: { pid: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$postId', '$$pid'] },
                    { $eq: ['$userId', currentUserObjectId] },
                  ],
                },
              },
            },
          ],
          as: 'currentUserLike',
        },
      },
      {
        $addFields: {
          isLiked: { $gt: [{ $size: '$currentUserLike' }, 0] },
        },
      },
      {
        $lookup: {
          from: 'pollvotes',
          let: { pid: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$postId', '$$pid'] },
                    { $eq: ['$userId', currentUserObjectId] },
                  ],
                },
              },
            },
          ],
          as: 'userPollVote',
        },
      },
      {
        $addFields: {
          userVote: {
            $cond: [
              { $gt: [{ $size: '$userPollVote' }, 0] },
              { $arrayElemAt: ['$userPollVote.optionIndex', 0] },
              null,
            ],
          },
        },
      },
      {
        $addFields: {
          pollResults: {
            $cond: [
              { $eq: ['$type', 'poll'] },
              {
                question: { $ifNull: ['$poll.question', ''] },
                totalVotes: { $ifNull: ['$poll.totalVotes', 0] },
                options: {
                  $map: {
                    input: { $ifNull: ['$poll.options', []] },
                    as: 'opt',
                    in: {
                      text: '$$opt.text',
                      votes: { $ifNull: ['$$opt.votes', 0] },
                      percentage: {
                        $round: [
                          {
                            $cond: [
                              { $gt: [{ $ifNull: ['$poll.totalVotes', 0] }, 0] },
                              {
                                $multiply: [
                                  { $divide: [{ $ifNull: ['$$opt.votes', 0] }, '$poll.totalVotes'] },
                                  100,
                                ],
                              },
                              0,
                            ],
                          },
                          1,
                        ],
                      },
                    },
                  },
                },
              },
              null,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          type: 1,
          content: 1,
          media: 1,
          likesCount: 1,
          commentsCount: 1,
          sharesCount: 1,
          viewsCount: 1,
          createdAt: 1,
          isLiked: 1,
          userVote: 1,
          pollResults: 1,
          author: {
            _id: '$authorDoc._id',
            name: '$authorDoc.name',
            username: '$authorDoc.username',
            profilePictureUrl: '$authorDoc.profilePictureUrl',
          },
          interests: {
            $map: {
              input: '$interestsDoc',
              as: 'i',
              in: { _id: '$$i._id', name: '$$i.name' },
            },
          },
        },
      },
    ];

    const posts = await Post.aggregate(pipeline);

    const ordered = postIds
      .map((pid) => {
        const post = posts.find((p) => p._id.toString() === pid.toString());
        if (!post) return null;
        const entry = entryByPostId[pid.toString()];
        return {
          _id: post._id,
          author: post.author,
          content: post.content,
          media: post.media,
          likesCount: post.likesCount ?? 0,
          commentsCount: post.commentsCount ?? 0,
          sharesCount: post.sharesCount ?? 0,
          viewsCount: post.viewsCount ?? 0,
          isLiked: !!post.isLiked,
          userVote: post.userVote ?? null,
          pollResults: post.pollResults ?? null,
          interests: post.interests,
          type: post.type,
          createdAt: post.createdAt,
          feedScore: entry.score,
          feedSource: entry.source,
        };
      })
      .filter(Boolean);

    const total = await UserFeed.countDocuments({ userId });

    return res.status(200).json({
      success: true,
      feed: ordered,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + ordered.length < total,
      },
    });
  } catch (err) {
    console.error('GET /feed error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch feed.' });
  }
}

/**
 * Get all posts from all users (paginated).
 * GET /api/v1/posts?page=1&limit=20
 * Returns: { success, posts: [...], pagination }. Same list shape as /posts/my.
 */
async function getAllPosts(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const posts = await Post.find({ isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name username profilePictureUrl')
      .populate('interests', 'name')
      .select('_id userId type content media poll interests likesCount commentsCount sharesCount viewsCount createdAt')
      .lean();

    const total = await Post.countDocuments({ isActive: true });

    return res.status(200).json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + posts.length < total,
      },
    });
  } catch (err) {
    console.error('GET /posts (all) error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch posts.' });
  }
}

module.exports = { getFeed, getAllPosts };
