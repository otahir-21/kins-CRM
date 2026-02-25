const Like = require('../../models/Like');
const Post = require('../../models/Post');
const mongoose = require('mongoose');

/**
 * Like a post.
 * POST /api/v1/posts/:postId/like
 */
async function likePost(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    // Check if post exists
    const post = await Post.findById(postId).select('_id isActive').lean();
    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    // Check if already liked
    const existingLike = await Like.findOne({ userId, postId }).select('_id').lean();
    if (existingLike) {
      return res.status(400).json({ success: false, error: 'You already liked this post.' });
    }

    // Create like
    await Like.create({ userId, postId });

    // Increment likesCount atomically
    await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });

    return res.status(200).json({ success: true, message: 'Post liked successfully.' });
  } catch (err) {
    console.error('POST /posts/:postId/like error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to like post.' });
  }
}

/**
 * Unlike a post.
 * DELETE /api/v1/posts/:postId/like
 */
async function unlikePost(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    // Find and delete like
    const like = await Like.findOneAndDelete({ userId, postId });
    if (!like) {
      return res.status(400).json({ success: false, error: 'You have not liked this post.' });
    }

    // Decrement likesCount atomically
    await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });

    return res.status(200).json({ success: true, message: 'Post unliked successfully.' });
  } catch (err) {
    console.error('DELETE /posts/:postId/like error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to unlike post.' });
  }
}

/**
 * Get users who liked a post (paginated).
 * GET /api/v1/posts/:postId/likes?page=1&limit=20
 */
async function getPostLikes(req, res) {
  try {
    const { postId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    const [likes, total] = await Promise.all([
      Like.find({ postId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name username profilePictureUrl')
        .lean(),
      Like.countDocuments({ postId }),
    ]);

    return res.status(200).json({
      success: true,
      likes: likes.map((like) => ({
        user: like.userId,
        likedAt: like.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + likes.length < total,
      },
    });
  } catch (err) {
    console.error('GET /posts/:postId/likes error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch likes.' });
  }
}

/**
 * Check if current user liked a post.
 * GET /api/v1/posts/:postId/like/status
 */
async function getLikeStatus(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    const like = await Like.findOne({ userId, postId }).select('createdAt').lean();

    return res.status(200).json({
      success: true,
      isLiked: !!like,
      likedAt: like ? like.createdAt : null,
    });
  } catch (err) {
    console.error('GET /posts/:postId/like/status error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to check like status.' });
  }
}

module.exports = { likePost, unlikePost, getPostLikes, getLikeStatus };
