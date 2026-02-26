const Post = require('../../models/Post');
const PostReport = require('../../models/PostReport');
const User = require('../../models/User');
const BunnyService = require('../../services/BunnyService');
const FeedService = require('../../services/FeedService');
const mongoose = require('mongoose');

const MAX_TAGGED_USERS = 30;

function toTaggedUser(doc) {
  if (!doc || !doc._id) return null;
  return {
    id: doc._id.toString(),
    name: doc.name ?? null,
    username: doc.username ?? null,
    profilePictureUrl: doc.profilePictureUrl ?? null,
  };
}

/**
 * Create a new post (text, image, video, or poll).
 * POST /api/v1/posts
 * Body: { type, content?, media?, poll?, interestIds, taggedUserIds? }
 * Note: media files sent as multipart/form-data; interestIds/taggedUserIds can be JSON strings.
 */
async function createPost(req, res) {
  try {
    const { type, content, poll, interestIds, taggedUserIds: rawTagged } = req.body;
    const userId = req.userId;

    // Validate type
    if (!['text', 'image', 'video', 'poll'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid post type.' });
    }

    // Validate interestIds
    if (!interestIds || !Array.isArray(interestIds) || interestIds.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one interest is required.' });
    }

    const validInterestIds = interestIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validInterestIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid interests provided.' });
    }

    // Parse and validate taggedUserIds (optional; can be JSON string from form-data)
    let taggedUserIds = [];
    if (rawTagged !== undefined && rawTagged !== null && rawTagged !== '') {
      let parsed = [];
      if (Array.isArray(rawTagged)) parsed = rawTagged;
      else if (typeof rawTagged === 'string') {
        try {
          const v = JSON.parse(rawTagged);
          parsed = Array.isArray(v) ? v : [];
        } catch {
          parsed = [];
        }
      }
      const ids = [...new Set(parsed.filter((id) => id && mongoose.Types.ObjectId.isValid(id)).map((id) => id.toString()))].slice(0, MAX_TAGGED_USERS);
      if (ids.length > 0) {
        const existing = await User.find({ _id: { $in: ids } }).select('_id').lean();
        const existingIds = new Set(existing.map((u) => u._id.toString()));
        taggedUserIds = ids.filter((id) => existingIds.has(id)).map((id) => new mongoose.Types.ObjectId(id));
      }
    }

    // Prepare post data
    const postData = {
      userId,
      type,
      content: content || null,
      interests: validInterestIds,
      taggedUserIds,
      media: [],
      poll: null,
    };

    // Handle media upload (image/video)
    if (type === 'image' || type === 'video') {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: `${type} post requires media files.` });
      }

      if (!BunnyService.isConfigured()) {
        return res.status(500).json({ success: false, error: 'Media upload not configured (Bunny CDN).' });
      }

      const uploads = await Promise.all(
        req.files.map(async (file) => {
          const folder = type === 'image' ? 'posts/images' : 'posts/videos';
          const { cdnUrl } = await BunnyService.upload(file.buffer, file.originalname, folder);
          
          // Generate thumbnail for video (placeholder for now)
          let thumbnail = null;
          if (type === 'video') {
            // Future: use video processing service to generate thumbnail
            thumbnail = cdnUrl.replace(/\.[^.]+$/, '_thumb.jpg'); // placeholder
          }

          return {
            type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            url: cdnUrl,
            thumbnail,
          };
        })
      );

      postData.media = uploads;
    }

    // Handle poll
    if (type === 'poll') {
      if (!poll || !poll.question || !poll.options || poll.options.length < 2) {
        return res.status(400).json({ success: false, error: 'Poll requires question and at least 2 options.' });
      }

      postData.poll = {
        question: poll.question,
        options: poll.options.map((opt) => ({ text: opt.text || opt, votes: 0 })),
        totalVotes: 0,
        votedUsers: [],
      };
    }

    // Create post
    const post = await Post.create(postData);

    // Fan-out to user feeds (background/async - do NOT block request)
    setImmediate(async () => {
      try {
        await FeedService.fanOutPost(post);
      } catch (err) {
        console.error(`Fan-out failed for post ${post._id}:`, err);
      }
    });

    const created = post.toObject ? post.toObject() : post;
    let taggedUsers = [];
    if (created.taggedUserIds && created.taggedUserIds.length > 0) {
      const users = await User.find({ _id: { $in: created.taggedUserIds } }).select('name username profilePictureUrl').lean();
      taggedUsers = users.map(toTaggedUser).filter(Boolean);
    }

    return res.status(201).json({
      success: true,
      message: 'Post created successfully.',
      post: {
        _id: post._id,
        userId: post.userId,
        type: post.type,
        content: post.content,
        media: post.media,
        poll: post.poll,
        interests: post.interests,
        taggedUserIds: (post.taggedUserIds || []).map((id) => (id && id.toString ? id.toString() : id)),
        taggedUsers,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        sharesCount: post.sharesCount,
        viewsCount: post.viewsCount,
        createdAt: post.createdAt,
      },
    });
  } catch (err) {
    console.error('POST /posts error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create post.' });
  }
}

/**
 * Get a single post by ID.
 * GET /api/v1/posts/:id
 */
async function getPost(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    const post = await Post.findById(id)
      .populate('userId', 'name username profilePictureUrl')
      .populate('interests', 'name')
      .populate('taggedUserIds', 'name username profilePictureUrl')
      .lean();

    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    const taggedUsers = (post.taggedUserIds || []).map(toTaggedUser).filter(Boolean);
    const { taggedUserIds: ids, ...rest } = post;
    return res.status(200).json({
      success: true,
      post: {
        ...rest,
        taggedUserIds: (ids || []).map((u) => (u && u._id ? u._id.toString() : u.toString())),
        taggedUsers,
      },
    });
  } catch (err) {
    console.error('GET /posts/:id error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch post.' });
  }
}

/**
 * Delete a post (soft delete).
 * DELETE /api/v1/posts/:id
 */
async function deletePost(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    const post = await Post.findById(id);

    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    if (post.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this post.' });
    }

    post.isActive = false;
    await post.save();

    // TODO: Remove from UserFeed (optional cleanup)

    return res.status(200).json({ success: true, message: 'Post deleted successfully.' });
  } catch (err) {
    console.error('DELETE /posts/:id error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete post.' });
  }
}

/**
 * Get current user's posts (paginated).
 * GET /api/v1/posts/my
 * Returns only posts where author (userId) equals the authenticated user from JWT.
 */
async function getMyPosts(req, res) {
  try {
    const rawUserId = req.userId;
    if (!rawUserId) {
      return res.status(401).json({ success: false, error: 'Not authenticated.' });
    }
    const userId = mongoose.Types.ObjectId.isValid(rawUserId) ? new mongoose.Types.ObjectId(String(rawUserId)) : null;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Invalid user id.' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find({
        userId,
        isActive: true,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name username profilePictureUrl')
        .populate('interests', 'name')
        .lean(),
      Post.countDocuments({ userId, isActive: true }),
    ]);

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
    console.error('GET /posts/my error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch posts.' });
  }
}

/**
 * Report a post. One report per user per post (idempotent).
 * POST /api/v1/posts/:postId/report
 * Body: { reason?: string }
 */
async function reportPost(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.userId;
    const { reason } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    const post = await Post.findById(postId).select('_id isActive').lean();
    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    const reporterId = new mongoose.Types.ObjectId(userId);
    const postIdObj = new mongoose.Types.ObjectId(postId);
    const existing = await PostReport.findOne({ reporterId, postId: postIdObj }).lean();
    if (existing) {
      return res.status(200).json({ success: true, message: 'You have already reported this post.', reported: true });
    }

    await PostReport.create({ reporterId, postId: postIdObj, reason: reason ? String(reason).trim().slice(0, 500) : null });
    await Post.findByIdAndUpdate(postId, { $inc: { reportCount: 1 } });

    return res.status(200).json({ success: true, message: 'Post reported.', reported: true });
  } catch (err) {
    console.error('POST /posts/:postId/report error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to report post.' });
  }
}

module.exports = { createPost, getPost, deletePost, getMyPosts, reportPost };
