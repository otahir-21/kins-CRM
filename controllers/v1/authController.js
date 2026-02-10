const jwt = require('jsonwebtoken');
const User = require('../../models/User');

const PROVIDERS = ['phone', 'google', 'apple'];

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  return email.trim().toLowerCase() || null;
}

function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  return phone.trim() || null;
}

function toUserResponse(user) {
  if (!user) return null;
  const u = user._id ? user : { _id: user.id, ...user };
  return {
    id: u._id.toString(),
    provider: u.provider,
    providerUserId: u.providerUserId,
    name: u.name ?? null,
    email: u.email ?? null,
    phoneNumber: u.phoneNumber ?? null,
    username: u.username ?? null,
    profilePictureUrl: u.profilePictureUrl ?? null,
    bio: u.bio ?? null,
    status: u.status ?? null,
    gender: u.gender ?? null,
    dateOfBirth: u.dateOfBirth ?? null,
    documentUrl: u.documentUrl ?? null,
    followerCount: u.followerCount ?? 0,
    followingCount: u.followingCount ?? 0,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/**
 * POST /api/v1/auth/login
 * Body: { provider, providerUserId, phoneNumber?, email?, name?, profilePictureUrl? }
 * Find or create user by (provider + providerUserId), update profile if provided, issue JWT.
 */
async function login(req, res) {
  const { provider, providerUserId, phoneNumber, email, name, profilePictureUrl } = req.body;

  if (!provider || !PROVIDERS.includes(provider)) {
    return res.status(400).json({ success: false, error: 'provider must be one of: phone, google, apple.' });
  }
  if (!providerUserId || typeof providerUserId !== 'string' || !providerUserId.trim()) {
    return res.status(400).json({ success: false, error: 'providerUserId is required (non-empty string).' });
  }

  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  if (!secret) {
    return res.status(500).json({ success: false, error: 'Server misconfiguration: JWT_SECRET not set.' });
  }

  try {
    let user = await User.findOne({ provider, providerUserId }).lean();
    const now = new Date();
    const updates = { updatedAt: now };

    if (name !== undefined) updates.name = name && typeof name === 'string' ? name.trim() || null : null;
    if (email !== undefined) updates.email = normalizeEmail(email);
    if (phoneNumber !== undefined) updates.phoneNumber = normalizePhone(phoneNumber);
    if (profilePictureUrl !== undefined) updates.profilePictureUrl = profilePictureUrl && typeof profilePictureUrl === 'string' ? profilePictureUrl.trim() || null : null;

    if (!user) {
      user = await User.create({
        provider,
        providerUserId: providerUserId.trim(),
        name: updates.name ?? null,
        email: updates.email ?? null,
        phoneNumber: updates.phoneNumber ?? null,
        profilePictureUrl: updates.profilePictureUrl ?? null,
      });
      user = user.toObject ? user.toObject() : user;
    } else if (Object.keys(updates).length > 1) {
      await User.findByIdAndUpdate(user._id, updates);
      user = { ...user, ...updates };
    }

    const token = jwt.sign(
      { userId: user._id.toString(), provider, providerUserId: user.providerUserId },
      secret,
      { expiresIn }
    );

    return res.status(200).json({
      success: true,
      token,
      user: toUserResponse(user),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'User already exists with this provider and id.' });
    }
    console.error('auth/login error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Login failed.' });
  }
}

module.exports = { login };
