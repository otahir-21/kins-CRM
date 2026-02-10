const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT and attach req.user (MongoDB user) and req.userId.
 * Use for all /me routes.
 */
async function verifyJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header. Use: Bearer <token>.' });
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing token.' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, error: 'Server misconfiguration: JWT_SECRET not set.' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    const userId = decoded.userId || decoded.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Invalid token payload.' });
    }
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found.' });
    }
    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired.' });
    }
    return res.status(401).json({ success: false, error: 'Invalid token.', message: err.message });
  }
}

module.exports = { verifyJwt };
