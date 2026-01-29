const { db, admin } = require('./firebase-config');

/**
 * Posts collection name. If your app uses user-scoped posts (users/{userId}/posts),
 * we can switch to collection group query - just confirm your structure.
 */
const POSTS_COLLECTION = 'posts';

/**
 * Get posts with pagination to minimize Firestore reads (cost-effective).
 * Uses cursor-based pagination: only reads `limit` documents per request.
 * @param {Object} options - { limit, startAfterDocId, status }
 * @returns {Promise<{ posts, nextPageToken, hasMore }>}
 */
async function getPostsPaginated(options = {}) {
  const { limit = 20, startAfterDocId = null, status = 'active' } = options;

  try {
    let query = db
      .collection(POSTS_COLLECTION)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .limit(limit + 1);

    if (startAfterDocId) {
      const lastDoc = await db.collection(POSTS_COLLECTION).doc(startAfterDocId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    const posts = [];
    let hasMore = false;

    snapshot.forEach((doc, index) => {
      if (index < limit) {
        posts.push({
          id: doc.id,
          ...doc.data(),
        });
      } else {
        hasMore = true;
      }
    });

    const nextPageToken = hasMore && posts.length > 0 ? posts[posts.length - 1].id : null;

    return {
      posts,
      nextPageToken,
      hasMore,
    };
  } catch (error) {
    console.error('Error getting posts:', error);
    throw error;
  }
}

/**
 * Get a single post by ID.
 * @param {string} postId
 * @returns {Promise<Object|null>}
 */
async function getPostById(postId) {
  try {
    const doc = await db.collection(POSTS_COLLECTION).doc(postId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting post:', error);
    throw error;
  }
}

/**
 * Soft-delete a post (set status to 'deleted'). App can hide deleted posts.
 * @param {string} postId
 * @returns {Promise<Object>}
 */
async function deletePost(postId) {
  try {
    const ref = db.collection(POSTS_COLLECTION).doc(postId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new Error('Post not found');
    }
    await ref.update({
      status: 'deleted',
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return getPostById(postId);
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
}

/**
 * Hard-delete a post (removes document). Use with caution.
 * @param {string} postId
 * @returns {Promise<boolean>}
 */
async function hardDeletePost(postId) {
  try {
    const ref = db.collection(POSTS_COLLECTION).doc(postId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new Error('Post not found');
    }
    await ref.delete();
    return true;
  } catch (error) {
    console.error('Error hard deleting post:', error);
    throw error;
  }
}

/**
 * Get reported posts only (for "Reported" tab in CRM - minimizes reads).
 * Requires posts to have reportCount field (number). Index: reportCount asc, createdAt desc.
 * @param {Object} options - { limit, startAfterDocId }
 * @returns {Promise<{ posts, nextPageToken, hasMore }>}
 */
async function getReportedPostsPaginated(options = {}) {
  const { limit = 20, startAfterDocId = null } = options;

  try {
    let query = db
      .collection(POSTS_COLLECTION)
      .where('reportCount', '>', 0)
      .orderBy('reportCount', 'desc')
      .limit(limit + 1);

    if (startAfterDocId) {
      const lastDoc = await db.collection(POSTS_COLLECTION).doc(startAfterDocId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    const posts = [];
    let hasMore = false;

    snapshot.forEach((doc, index) => {
      if (index < limit) {
        posts.push({
          id: doc.id,
          ...doc.data(),
        });
      } else {
        hasMore = true;
      }
    });

    const nextPageToken = hasMore && posts.length > 0 ? posts[posts.length - 1].id : null;

    return {
      posts,
      nextPageToken,
      hasMore,
    };
  } catch (error) {
    console.error('Error getting reported posts:', error);
    throw error;
  }
}

module.exports = {
  getPostsPaginated,
  getPostById,
  deletePost,
  hardDeletePost,
  getReportedPostsPaginated,
};
