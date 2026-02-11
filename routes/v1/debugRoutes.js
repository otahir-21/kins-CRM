const express = require('express');
const { verifyJwt } = require('../../middleware/verifyJwt');
const { debugFeed, debugPosts } = require('../../controllers/v1/debugController');

const router = express.Router();

// All routes require JWT
router.use(verifyJwt);

// Debug endpoints (for troubleshooting production issues)
router.get('/feed', debugFeed);
router.get('/posts', debugPosts);

module.exports = router;
