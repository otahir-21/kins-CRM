const express = require('express');
const { verifyJwt } = require('../../middleware/verifyJwt');
const { getFeed } = require('../../controllers/v1/feedController');

const router = express.Router();

// All routes require JWT
router.use(verifyJwt);

// Get user feed (paginated)
router.get('/', getFeed);

module.exports = router;
