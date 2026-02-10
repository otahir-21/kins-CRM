const { auth } = require('../firebase-config');
const User = require('../models/User');

/**
 * Verify Firebase ID token from Authorization: Bearer <token>.
 * Attaches req.firebaseDecoded (decoded token) and req.user (MongoDB user if exists).
 */
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header. Use: Bearer <Firebase_ID_Token>.' });
  }
  const idToken = authHeader.slice(7).trim();
  if (!idToken) {
    return res.status(401).json({ success: false, error: 'Missing token.' });
  }

  try {
    const decodedToken = await auth().verifyIdToken(idToken);
    req.firebaseDecoded = decodedToken;
    const user = await User.findOne({ firebaseUid: decodedToken.uid }).lean();
    if (user) {
      req.user = user;
      req.userId = user._id;
    } else {
      req.user = null;
      req.userId = null;
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.', message: err.message });
  }
}

/**
 * Same as verifyFirebaseToken but requires user to exist in MongoDB (for /me, /me/interests).
 */
async function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'User not found. Call POST /auth/firebase first to register.' });
  }
  next();
}

module.exports = { verifyFirebaseToken, requireUser };
