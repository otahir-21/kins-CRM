/**
 * Posts moderation – MongoDB implementation for CRM (list, get, delete, reported).
 */
const mongoose = require('mongoose');
const Post = require('./models/Post');
const User = require('./models/User');

const isValidId = (id) => id && mongoose.Types.ObjectId.isValid(id);

/** Shape expected by CRM: id, authorName, userId, content, mediaUrl, reportCount, createdAt */
function toCRMPost(doc) {
  if (!doc || !doc._id) return null;
  const authorName = doc.userId && doc.userId.name ? doc.userId.name : (doc.authorName || null);
  const userId = doc.userId && doc.userId._id ? doc.userId._id.toString() : (doc.userId && doc.userId.toString ? doc.userId.toString() : null);
  const firstMedia = Array.isArray(doc.media) && doc.media[0] ? doc.media[0] : null;
  const mediaUrl = firstMedia && firstMedia.url ? firstMedia.url : (firstMedia && firstMedia.thumbnail ? firstMedia.thumbnail : null);
  return {
    id: doc._id.toString(),
    authorName: authorName || 'Unknown',
    userName: authorName || null,
    userId,
    authorId: userId,
    content: doc.content ?? '',
    text: doc.content ?? '',
    mediaUrl: mediaUrl || null,
    imageUrl: mediaUrl || null,
    thumbnailUrl: (firstMedia && firstMedia.thumbnail) || mediaUrl || null,
    reportCount: doc.reportCount ?? 0,
    createdAt: doc.createdAt,
    type: doc.type,
    isActive: doc.isActive,
  };
}

/**
 * Get posts paginated for CRM. status: 'active' | 'deleted'
 * options: { limit, startAfterDocId, status }
 */
async function getPostsPaginated(options = {}) {
  const limit = Math.min(parseInt(options.limit) || 20, 50);
  const status = options.status || 'active';
  const startAfterDocId = options.startAfterDocId || null;

  const filter = {};
  if (status === 'active') filter.isActive = true;
  else if (status === 'deleted') filter.isActive = false;
  if (startAfterDocId && isValidId(startAfterDocId)) {
    const cursorDoc = await Post.findOne({ _id: startAfterDocId, ...filter }).select('createdAt').lean();
    if (cursorDoc) filter.createdAt = { $lt: cursorDoc.createdAt };
  }

  const docs = await Post.find(filter).sort({ createdAt: -1 }).limit(limit + 1).populate('userId', 'name').lean();
  const hasMore = docs.length > limit;
  const posts = docs.slice(0, limit).map(toCRMPost).filter(Boolean);
  const nextPageToken = hasMore && posts.length ? posts[posts.length - 1].id : null;

  return { posts, nextPageToken, hasMore };
}

/**
 * Get a single post by ID for CRM.
 */
async function getPostById(postId) {
  if (!isValidId(postId)) return null;
  const doc = await Post.findById(postId).populate('userId', 'name').lean();
  return doc ? toCRMPost(doc) : null;
}

/**
 * Soft delete: set isActive = false so post is hidden from feed.
 */
async function deletePost(postId) {
  if (!isValidId(postId)) throw new Error('Invalid post ID');
  const post = await Post.findByIdAndUpdate(postId, { $set: { isActive: false } }, { new: true }).populate('userId', 'name').lean();
  if (!post) throw new Error('Post not found');
  return toCRMPost(post);
}

/**
 * Hard delete: remove post document (and related data if any).
 */
async function hardDeletePost(postId) {
  if (!isValidId(postId)) throw new Error('Invalid post ID');
  const deleted = await Post.findByIdAndDelete(postId);
  if (!deleted) throw new Error('Post not found');
  return { deleted: true };
}

/**
 * Get reported posts only (reportCount > 0), paginated. For CRM "Reported" tab.
 */
async function getReportedPostsPaginated(options = {}) {
  const limit = Math.min(parseInt(options.limit) || 20, 50);
  const startAfterDocId = options.startAfterDocId || null;

  const filter = { reportCount: { $gt: 0 } };
  if (startAfterDocId && isValidId(startAfterDocId)) {
    const cursorDoc = await Post.findOne({ _id: startAfterDocId, reportCount: { $gt: 0 } }).select('reportCount createdAt').lean();
    if (cursorDoc) {
      filter.$or = [
        { reportCount: { $lt: cursorDoc.reportCount } },
        { reportCount: cursorDoc.reportCount, createdAt: { $lt: cursorDoc.createdAt } },
      ];
    }
  }

  const docs = await Post.find(filter).sort({ reportCount: -1, createdAt: -1 }).limit(limit + 1).populate('userId', 'name').lean();
  const hasMore = docs.length > limit;
  const posts = docs.slice(0, limit).map(toCRMPost).filter(Boolean);
  const nextPageToken = hasMore && posts.length ? posts[posts.length - 1].id : null;

  return { posts, nextPageToken, hasMore };
}

module.exports = {
  getPostsPaginated,
  getPostById,
  deletePost,
  hardDeletePost,
  getReportedPostsPaginated,
};
