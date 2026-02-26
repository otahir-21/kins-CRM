const Post = require('../../models/Post');
const BunnyService = require('../../services/BunnyService');
const FeedService = require('../../services/FeedService');
const mongoose = require('mongoose');

/**
 * Create a new post (text, image, video, or poll).
 * POST /api/v1/posts
 * Body: { type, content?, media?: [{ buffer, fileName, type }], poll?, interestIds }
 * Note: media files should be sent as multipart/form-data and processed by multer.
 */
async function createPost(req, res) {
  try {
    const { type, content, poll, interestIds } = req.body;
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

    // Prepare post data
    const postData = {
      userId,
      type,
      content: content || null,
      interests: validInterestIds,
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
      .lean();

    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    return res.status(200).json({ success: true, post });
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

module.exports = { createPost, getPost, deletePost, getMyPosts };
