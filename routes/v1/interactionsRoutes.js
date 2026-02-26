const express = require('express');
const { verifyJwt } = require('../../middleware/verifyJwt');
const {
  likePost,
  unlikePost,
  getPostLikes,
  getLikeStatus,
} = require('../../controllers/v1/likesController');
const {
  createComment,
  getPostComments,
  getCommentReplies,
  deleteComment,
  likeComment,
  unlikeComment,
} = require('../../controllers/v1/commentsController');
const {
  sharePost,
  getPostShares,
  incrementView,
} = require('../../controllers/v1/sharesController');
const {
  voteOnPoll,
  getPollResults,
  removeVote,
} = require('../../controllers/v1/pollsController');
const { savePost, unsavePost, getSaveStatus } = require('../../controllers/v1/savedPostsController');

const router = express.Router();

// All routes require JWT
router.use(verifyJwt);

// ===== LIKES =====
// Post likes
router.post('/posts/:postId/like', likePost);
router.delete('/posts/:postId/like', unlikePost);
router.get('/posts/:postId/likes', getPostLikes);
router.get('/posts/:postId/like/status', getLikeStatus);

// Comment likes
router.post('/comments/:commentId/like', likeComment);
router.delete('/comments/:commentId/like', unlikeComment);

// ===== COMMENTS =====
// Post comments
router.post('/posts/:postId/comments', createComment);
router.get('/posts/:postId/comments', getPostComments);

// Comment replies
router.get('/comments/:commentId/replies', getCommentReplies);

// Delete comment
router.delete('/comments/:commentId', deleteComment);

// ===== SHARES =====
router.post('/posts/:postId/share', sharePost);
router.get('/posts/:postId/shares', getPostShares);

// ===== VIEWS =====
router.post('/posts/:postId/view', incrementView);

// ===== SAVE (bookmark) =====
router.get('/posts/:postId/save/status', getSaveStatus);
router.post('/posts/:postId/save', savePost);
router.delete('/posts/:postId/save', unsavePost);

// ===== POLLS =====
router.post('/posts/:postId/vote', voteOnPoll);
router.get('/posts/:postId/poll', getPollResults);
router.delete('/posts/:postId/vote', removeVote);

module.exports = router;
