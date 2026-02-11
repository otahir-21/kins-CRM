const express = require('express');
const authRoutes = require('./authRoutes');
const meRoutes = require('./meRoutes');
const interestsRoutes = require('./interestsRoutes');
const postsRoutes = require('./postsRoutes');
const feedRoutes = require('./feedRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/interests', interestsRoutes);
router.use('/posts', postsRoutes);
router.use('/feed', feedRoutes);

module.exports = router;
