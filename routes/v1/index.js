const express = require('express');
const authRoutes = require('./authRoutes');
const meRoutes = require('./meRoutes');
const interestsRoutes = require('./interestsRoutes');
const postsRoutes = require('./postsRoutes');
const feedRoutes = require('./feedRoutes');
const followRoutes = require('./followRoutes');
const groupRoutes = require('./groupRoutes');
const adRoutes = require('./adRoutes');
const surveyRoutes = require('./surveyRoutes');
const chatRoutes = require('./chatRoutes');
const interactionsRoutes = require('./interactionsRoutes');
const debugRoutes = require('./debugRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/chat', chatRoutes);
router.use('/interests', interestsRoutes);
router.use('/posts', postsRoutes);
router.use('/feed', feedRoutes);
router.use('/users', followRoutes);
router.use('/groups', groupRoutes);
router.use('/ads', adRoutes);
router.use('/surveys', surveyRoutes);

// Interactions (likes, comments, shares, views, polls)
router.use('/', interactionsRoutes);

// Debug endpoints (for troubleshooting)
router.use('/debug', debugRoutes);

module.exports = router;
