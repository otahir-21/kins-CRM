const User = require('../models/User');

/**
 * POST /auth/firebase
 * Verify Firebase ID token, upsert user in MongoDB, return profile.
 */
async function authFirebase(req, res) {
  const decoded = req.firebaseDecoded;
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Invalid token.' });
  }

  const firebaseUid = decoded.uid;
  const phoneNumber = decoded.phone_number || null;
  const email = decoded.email || null;
  const displayName = decoded.name || null;
  const photoURL = decoded.picture || null;

  let user = await User.findOne({ firebaseUid });
  if (user) {
    user.name = displayName ?? user.name;
    user.email = email ?? user.email;
    user.phoneNumber = phoneNumber ?? user.phoneNumber;
    user.avatarUrl = photoURL ?? user.avatarUrl;
    await user.save();
  } else {
    user = await User.create({
      firebaseUid,
      name: displayName,
      email,
      phoneNumber,
      avatarUrl: photoURL,
    });
  }

  const profile = {
    id: user._id.toString(),
    firebaseUid: user.firebaseUid,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return res.status(200).json({ success: true, user: profile });
}

module.exports = { authFirebase };
