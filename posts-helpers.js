/**
 * Posts — stubbed (Firebase removed). Implement with MongoDB if needed.
 */
async function getPostsPaginated(options = {}) {
  return { posts: [], nextPageToken: null, hasMore: false };
}
async function getPostById(postId) {
  return null;
}
async function deletePost(postId) {
  throw new Error('Posts not implemented (Firebase removed).');
}
async function hardDeletePost(postId) {
  throw new Error('Posts not implemented (Firebase removed).');
}
async function getReportedPostsPaginated(options = {}) {
  return { posts: [], nextPageToken: null, hasMore: false };
}
module.exports = {
  getPostsPaginated,
  getPostById,
  deletePost,
  hardDeletePost,
  getReportedPostsPaginated,
};
