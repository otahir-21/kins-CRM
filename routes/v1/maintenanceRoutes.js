const express = require('express');
const { refanOutPosts, getFeedStats } = require('../../controllers/v1/maintenanceController');
const { authenticateToken } = require('../../middleware/authMiddleware');

const router = express.Router();

// All maintenance routes require authentication
router.use(authenticateToken);

/**
 * Re-fan-out posts to UserFeed
 * POST /api/v1/maintenance/refan-out
 * Body: { type?: string, postId?: string, clearExisting?: boolean }
 */
router.post('/refan-out', refanOutPosts);

/**
 * Get feed statistics
 * GET /api/v1/maintenance/feed-stats
 */
router.get('/feed-stats', getFeedStats);

module.exports = router;
