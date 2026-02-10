const express = require('express');
const rateLimit = require('express-rate-limit');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const { authFirebase } = require('../controllers/authFirebaseController');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/firebase', authLimiter, verifyFirebaseToken, authFirebase);

module.exports = router;
