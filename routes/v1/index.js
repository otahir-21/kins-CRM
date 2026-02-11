const express = require('express');
const authRoutes = require('./authRoutes');
const meRoutes = require('./meRoutes');
const interestsRoutes = require('./interestsRoutes');
const postsRoutes = require('./postsRoutes');
const feedRoutes = require('./feedRoutes');
const interactionsRoutes = require('./interactionsRoutes');
const debugRoutes = require('./debugRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/interests', interestsRoutes);
router.use('/posts', postsRoutes);
router.use('/feed', feedRoutes);

// Interactions (likes, comments, shares, views, polls)
router.use('/', interactionsRoutes);

// Debug endpoints (for troubleshooting)
router.use('/debug', debugRoutes);

module.exports = router;
