const mongoose = require('mongoose');
const User = require('../../models/User');
const Post = require('../../models/Post');

/**
 * Save a post (bookmark).
 * POST /api/v1/posts/:postId/save
 */
async function savePost(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    const post = await Post.findById(postId).select('_id isActive').lean();
    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    const updated = await User.findOneAndUpdate(
      { _id: userId, savedPosts: { $ne: postId } },
      { $addToSet: { savedPosts: postId } },
      { new: true }
    ).select('savedPosts').lean();

    if (!updated) {
      return res.status(400).json({ success: false, error: 'Post is already saved.' });
    }

    return res.status(200).json({ success: true, message: 'Post saved.', isSaved: true });
  } catch (err) {
    console.error('POST /posts/:postId/save error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to save post.' });
  }
}

/**
 * Unsave a post (remove bookmark).
 * DELETE /api/v1/posts/:postId/save
 */
async function unsavePost(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    const updated = await User.findOneAndUpdate(
      { _id: userId, savedPosts: postId },
      { $pull: { savedPosts: postId } },
      { new: true }
    ).select('savedPosts').lean();

    if (!updated) {
      return res.status(400).json({ success: false, error: 'Post was not saved.' });
    }

    return res.status(200).json({ success: true, message: 'Post removed from saved.', isSaved: false });
  } catch (err) {
    console.error('DELETE /posts/:postId/save error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to unsave post.' });
  }
}

/**
 * Check if current user has saved a post.
 * GET /api/v1/posts/:postId/save/status
 */
async function getSaveStatus(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    const user = await User.findById(userId).select('savedPosts').lean();
    const isSaved = user && user.savedPosts && user.savedPosts.some((id) => id.toString() === postId);

    return res.status(200).json({ success: true, isSaved: !!isSaved });
  } catch (err) {
    console.error('GET /posts/:postId/save/status error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get save status.' });
  }
}

/**
 * List current user's saved posts (paginated). Same shape as feed items: author, isLiked, isSaved, etc.
 * GET /api/v1/me/saved-posts?page=1&limit=20
 */
async function getMySavedPosts(req, res) {
  try {
    const userId = req.userId;
    const currentUserObjectId = new mongoose.Types.ObjectId(userId);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).select('savedPosts').lean();
    const savedIds = (user && user.savedPosts) || [];
    if (savedIds.length === 0) {
      return res.status(200).json({
        success: true,
        posts: [],
        pagination: { page, limit, total: 0, hasMore: false },
      });
    }

    // Paginate over saved list (newest saved first = reverse order of savedPosts; we store in add order so newest at end)
    const orderedIds = [...savedIds].reverse().map((id) => id.toString());
    const paginatedIds = orderedIds.slice(skip, skip + limit);
    const postIds = paginatedIds.map((id) => new mongoose.Types.ObjectId(id));

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
          poll: 1,
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

    const ordered = paginatedIds
      .map((pid) => {
        const post = posts.find((p) => p._id.toString() === pid);
        if (!post) return null;
        return {
          _id: post._id,
          author: post.author,
          content: post.content,
          media: post.media,
          poll: post.poll,
          likesCount: post.likesCount ?? 0,
          commentsCount: post.commentsCount ?? 0,
          sharesCount: post.sharesCount ?? 0,
          viewsCount: post.viewsCount ?? 0,
          isLiked: !!post.isLiked,
          isSaved: true,
          userVote: post.userVote ?? null,
          pollResults: post.pollResults ?? null,
          interests: post.interests,
          type: post.type,
          createdAt: post.createdAt,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      posts: ordered,
      pagination: {
        page,
        limit,
        total: orderedIds.length,
        hasMore: skip + ordered.length < orderedIds.length,
      },
    });
  } catch (err) {
    console.error('GET /me/saved-posts error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch saved posts.' });
  }
}

module.exports = { savePost, unsavePost, getSaveStatus, getMySavedPosts };
