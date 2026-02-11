const Share = require('../../models/Share');
const Post = require('../../models/Post');
const mongoose = require('mongoose');

/**
 * Share a post.
 * POST /api/v1/posts/:postId/share
 */
async function sharePost(req, res) {
  try {
    const { postId } = req.params;
    const { shareType, caption } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    // Validate shareType
    const validShareTypes = ['repost', 'external', 'direct_message'];
    const type = shareType || 'external';
    if (!validShareTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid share type. Must be one of: ${validShareTypes.join(', ')}` 
      });
    }

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    // Create share
    const share = await Share.create({
      userId,
      postId,
      shareType: type,
      caption: caption || null,
    });

    // Increment sharesCount atomically
    await Post.findByIdAndUpdate(postId, { $inc: { sharesCount: 1 } });

    return res.status(201).json({
      success: true,
      message: 'Post shared successfully.',
      share: {
        _id: share._id,
        shareType: share.shareType,
        caption: share.caption,
        sharedAt: share.createdAt,
      },
    });
  } catch (err) {
    console.error('POST /posts/:postId/share error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to share post.' });
  }
}

/**
 * Get users who shared a post (paginated).
 * GET /api/v1/posts/:postId/shares?page=1&limit=20
 */
async function getPostShares(req, res) {
  try {
    const { postId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    // Get shares with user info
    const shares = await Share.find({ postId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name username profilePictureUrl')
      .lean();

    const total = await Share.countDocuments({ postId });

    return res.status(200).json({
      success: true,
      shares: shares.map((share) => ({
        user: share.userId,
        shareType: share.shareType,
        caption: share.caption,
        sharedAt: share.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + shares.length < total,
      },
    });
  } catch (err) {
    console.error('GET /posts/:postId/shares error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch shares.' });
  }
}

/**
 * Increment view count for a post.
 * POST /api/v1/posts/:postId/view
 */
async function incrementView(req, res) {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    // Increment viewsCount atomically (idempotent, no duplicate check needed)
    await Post.findByIdAndUpdate(postId, { $inc: { viewsCount: 1 } });

    return res.status(200).json({ success: true, message: 'View recorded.' });
  } catch (err) {
    console.error('POST /posts/:postId/view error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to record view.' });
  }
}

module.exports = { sharePost, getPostShares, incrementView };
