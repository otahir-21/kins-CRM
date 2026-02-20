const express = require('express');
const { verifyJwt } = require('../../middleware/verifyJwt');
const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getPublicProfile,
  getSuggestions,
  searchUsers,
} = require('../../controllers/v1/followController');

const router = express.Router();

router.use(verifyJwt);

// Search users by username, name, or phone (must be before /:userId)
router.get('/search', searchUsers);
// Suggested for you (must be before /:userId)
router.get('/suggestions', getSuggestions);
// More specific routes first (so path segments are not parsed as userId)
router.get('/:userId/follow/status', getFollowStatus);
router.post('/:userId/follow', followUser);
router.delete('/:userId/follow', unfollowUser);
router.get('/:userId/followers', getFollowers);
router.get('/:userId/following', getFollowing);
// Public profile (must be last so "follow", "followers", "following" are not matched as userId)
router.get('/:userId', getPublicProfile);

module.exports = router;
