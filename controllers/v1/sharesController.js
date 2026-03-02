const Share = require('../../models/Share');
const Post = require('../../models/Post');
const FeedService = require('../../services/FeedService');
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
    const post = await Post.findById(postId).select('_id isActive').lean();
    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    // Repost: one repost per user per post
    if (type === 'repost') {
      const existing = await Share.findOne({ userId, postId, shareType: 'repost' }).select('_id').lean();
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'You have already reposted this post.',
          code: 'ALREADY_REPOSTED',
        });
      }
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

    // When reposting, add this post to the feed of everyone who follows the current user (discover)
    if (type === 'repost') {
      try {
        await FeedService.fanOutRepost(userId, post._id);
      } catch (err) {
        console.error('FeedService.fanOutRepost error:', err.message);
      }
    }

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
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'You have already reposted this post.',
        code: 'ALREADY_REPOSTED',
      });
    }
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

    const [shares, total] = await Promise.all([
      Share.find({ postId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name username profilePictureUrl')
        .lean(),
      Share.countDocuments({ postId }),
    ]);

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
 * List current user's reposts (paginated). For "Your reposts" / profile reposts list.
 * GET /api/v1/me/reposts?page=1&limit=20
 * Returns: { success, reposts: [ { post: {...}, repostedAt, caption }, ... ], pagination }
 * Post shape matches feed/saved (author, content, media, interests, taggedUsers, etc.)
 */
async function getMyReposts(req, res) {
  try {
    const userId = req.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [shareDocs, total] = await Promise.all([
      Share.find({ userId, shareType: 'repost' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('postId caption createdAt')
        .lean(),
      Share.countDocuments({ userId, shareType: 'repost' }),
    ]);

    if (shareDocs.length === 0) {
      return res.status(200).json({
        success: true,
        reposts: [],
        pagination: { page, limit, total: 0, hasMore: false },
      });
    }

    const postIds = shareDocs.map((s) => s.postId);
    const shareByPostId = {};
    shareDocs.forEach((s) => {
      shareByPostId[s.postId.toString()] = { repostedAt: s.createdAt, caption: s.caption || null };
    });

    const posts = await Post.find({ _id: { $in: postIds }, isActive: true })
      .populate('userId', 'name username profilePictureUrl')
      .populate('interests', 'name')
      .populate('taggedUserIds', 'name username profilePictureUrl')
      .select('_id userId type content media poll interests taggedUserIds likesCount commentsCount sharesCount viewsCount createdAt')
      .lean();

    const toTaggedUser = (doc) => {
      if (!doc || !doc._id) return null;
      return {
        id: doc._id.toString(),
        name: doc.name ?? null,
        username: doc.username ?? null,
        profilePictureUrl: doc.profilePictureUrl ?? null,
      };
    };

    const reposts = postIds.map((pid) => {
      const post = posts.find((p) => p._id.toString() === pid.toString());
      const meta = shareByPostId[pid.toString()];
      if (!post || !meta) return null;
      const author = post.userId;
      const authorId = author && (author._id || author.id);
      const authorIdStr = authorId != null ? authorId.toString() : null;
      const taggedUsers = (post.taggedUserIds || []).map(toTaggedUser).filter(Boolean);
      const taggedUserIds = (post.taggedUserIds || []).map((u) => (u && (u._id || u.id) ? (u._id || u.id).toString() : u.toString()));
      return {
        post: {
          _id: post._id,
          author: author ? { _id: authorIdStr, id: authorIdStr, name: author.name, username: author.username, profilePictureUrl: author.profilePictureUrl } : null,
          type: post.type,
          content: post.content,
          media: post.media || [],
          poll: post.poll ?? null,
          interests: post.interests || [],
          taggedUserIds,
          taggedUsers,
          likesCount: post.likesCount ?? 0,
          commentsCount: post.commentsCount ?? 0,
          sharesCount: post.sharesCount ?? 0,
          viewsCount: post.viewsCount ?? 0,
          createdAt: post.createdAt,
        },
        repostedAt: meta.repostedAt,
        caption: meta.caption,
      };
    }).filter(Boolean);

    return res.status(200).json({
      success: true,
      reposts,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + reposts.length < total,
      },
    });
  } catch (err) {
    console.error('GET /me/reposts error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch reposts.' });
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

module.exports = { sharePost, getPostShares, getMyReposts, incrementView };
