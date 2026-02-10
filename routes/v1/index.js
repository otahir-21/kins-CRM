const express = require('express');
const authRoutes = require('./authRoutes');
const meRoutes = require('./meRoutes');
const interestsRoutes = require('./interestsRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/interests', interestsRoutes);

module.exports = router;
