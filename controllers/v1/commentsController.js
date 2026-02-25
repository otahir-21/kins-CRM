const Comment = require('../../models/Comment');
const CommentLike = require('../../models/CommentLike');
const Post = require('../../models/Post');
const mongoose = require('mongoose');

/**
 * Create a comment on a post (or reply to a comment).
 * POST /api/v1/posts/:postId/comments
 */
async function createComment(req, res) {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Comment content is required.' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ success: false, error: 'Comment cannot exceed 2000 characters.' });
    }

    // Check if post exists
    const post = await Post.findById(postId).select('_id isActive').lean();
    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    // If replying to a comment, validate parent comment
    let parentComment = null;
    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({ success: false, error: 'Invalid parent comment ID.' });
      }

      parentComment = await Comment.findById(parentCommentId).select('postId isActive').lean();
      if (!parentComment || !parentComment.isActive) {
        return res.status(404).json({ success: false, error: 'Parent comment not found.' });
      }

      // Ensure parent comment belongs to the same post
      if (parentComment.postId.toString() !== postId) {
        return res.status(400).json({ success: false, error: 'Parent comment does not belong to this post.' });
      }
    }

    // Create comment
    const comment = await Comment.create({
      userId,
      postId,
      content: content.trim(),
      parentCommentId: parentCommentId || null,
    });

    // Increment counters atomically
    if (parentCommentId) {
      // Increment parent comment's repliesCount
      await Comment.findByIdAndUpdate(parentCommentId, { $inc: { repliesCount: 1 } });
    } else {
      // Increment post's commentsCount (only for top-level comments)
      await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    }

    // Populate user info
    const populatedComment = await Comment.findById(comment._id)
      .populate('userId', 'name username profilePictureUrl')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Comment created successfully.',
      comment: populatedComment,
    });
  } catch (err) {
    console.error('POST /posts/:postId/comments error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create comment.' });
  }
}

/**
 * Get comments for a post (paginated, top-level only).
 * GET /api/v1/posts/:postId/comments?page=1&limit=20
 */
async function getPostComments(req, res) {
  try {
    const { postId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    const userId = req.userId;
    const [comments, total] = await Promise.all([
      Comment.find({
        postId,
        parentCommentId: null,
        isActive: true,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name username profilePictureUrl')
        .lean(),
      Comment.countDocuments({
        postId,
        parentCommentId: null,
        isActive: true,
      }),
    ]);

    const commentIds = comments.map((c) => c._id);
    const userLikes = await CommentLike.find({ userId, commentId: { $in: commentIds } }).select('commentId').lean();
    const likedCommentIds = new Set(userLikes.map((like) => like.commentId.toString()));

    const commentsWithLikeStatus = comments.map((comment) => ({
      ...comment,
      isLikedByMe: likedCommentIds.has(comment._id.toString()),
    }));

    return res.status(200).json({
      success: true,
      comments: commentsWithLikeStatus,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + comments.length < total,
      },
    });
  } catch (err) {
    console.error('GET /posts/:postId/comments error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch comments.' });
  }
}

/**
 * Get replies for a comment (paginated).
 * GET /api/v1/comments/:commentId/replies?page=1&limit=10
 */
async function getCommentReplies(req, res) {
  try {
    const { commentId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, error: 'Invalid comment ID.' });
    }

    const userId = req.userId;
    const [replies, total] = await Promise.all([
      Comment.find({
        parentCommentId: commentId,
        isActive: true,
      })
        .sort({ createdAt: 1 }) // Oldest first for replies
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name username profilePictureUrl')
        .lean(),
      Comment.countDocuments({
        parentCommentId: commentId,
        isActive: true,
      }),
    ]);

    const replyIds = replies.map((r) => r._id);
    const userLikes = await CommentLike.find({ userId, commentId: { $in: replyIds } }).select('commentId').lean();
    const likedReplyIds = new Set(userLikes.map((like) => like.commentId.toString()));

    const repliesWithLikeStatus = replies.map((reply) => ({
      ...reply,
      isLikedByMe: likedReplyIds.has(reply._id.toString()),
    }));

    return res.status(200).json({
      success: true,
      replies: repliesWithLikeStatus,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + replies.length < total,
      },
    });
  } catch (err) {
    console.error('GET /comments/:commentId/replies error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch replies.' });
  }
}

/**
 * Delete a comment (author only).
 * DELETE /api/v1/comments/:commentId
 */
async function deleteComment(req, res) {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, error: 'Invalid comment ID.' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment || !comment.isActive) {
      return res.status(404).json({ success: false, error: 'Comment not found.' });
    }

    if (comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this comment.' });
    }

    // Soft delete
    comment.isActive = false;
    await comment.save();

    // Decrement counters atomically
    if (comment.parentCommentId) {
      await Comment.findByIdAndUpdate(comment.parentCommentId, { $inc: { repliesCount: -1 } });
    } else {
      await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });
    }

    return res.status(200).json({ success: true, message: 'Comment deleted successfully.' });
  } catch (err) {
    console.error('DELETE /comments/:commentId error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete comment.' });
  }
}

/**
 * Like a comment.
 * POST /api/v1/comments/:commentId/like
 */
async function likeComment(req, res) {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, error: 'Invalid comment ID.' });
    }

    // Check if comment exists
    const comment = await Comment.findById(commentId);
    if (!comment || !comment.isActive) {
      return res.status(404).json({ success: false, error: 'Comment not found.' });
    }

    // Check if already liked
    const existingLike = await CommentLike.findOne({ userId, commentId });
    if (existingLike) {
      return res.status(400).json({ success: false, error: 'You already liked this comment.' });
    }

    // Create like
    await CommentLike.create({ userId, commentId });

    // Increment likesCount
    await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: 1 } });

    return res.status(200).json({ success: true, message: 'Comment liked successfully.' });
  } catch (err) {
    console.error('POST /comments/:commentId/like error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to like comment.' });
  }
}

/**
 * Unlike a comment.
 * DELETE /api/v1/comments/:commentId/like
 */
async function unlikeComment(req, res) {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, error: 'Invalid comment ID.' });
    }

    // Find and delete like
    const like = await CommentLike.findOneAndDelete({ userId, commentId });
    if (!like) {
      return res.status(400).json({ success: false, error: 'You have not liked this comment.' });
    }

    // Decrement likesCount
    await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: -1 } });

    return res.status(200).json({ success: true, message: 'Comment unliked successfully.' });
  } catch (err) {
    console.error('DELETE /comments/:commentId/like error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to unlike comment.' });
  }
}

module.exports = {
  createComment,
  getPostComments,
  getCommentReplies,
  deleteComment,
  likeComment,
  unlikeComment,
};
