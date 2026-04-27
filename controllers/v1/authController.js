const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { getAuthDataProvider, getSelectedBackend } = require('../../services/data/authDataProvider');

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

function toFirebaseUserPayload(user, provider, providerUserId) {
  return {
    provider,
    providerUserId: providerUserId.trim(),
    name: user.name ?? null,
    email: user.email ?? null,
    phoneNumber: user.phoneNumber ?? null,
    username: user.username ?? null,
    profilePictureUrl: user.profilePictureUrl ?? null,
    bio: user.bio ?? null,
    status: user.status ?? null,
    gender: user.gender ?? null,
    dateOfBirth: user.dateOfBirth ?? null,
    documentUrl: user.documentUrl ?? null,
    country: user.country ?? null,
    city: user.city ?? null,
    followerCount: user.followerCount ?? 0,
    followingCount: user.followingCount ?? 0,
    deletedAt: null,
  };
}

async function upsertMongoShadowUser({ provider, providerUserId, updates }) {
  let shadow = await User.findOne({
    provider,
    providerUserId,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  }).lean();

  if (!shadow) {
    const created = await User.create({
      provider,
      providerUserId: providerUserId.trim(),
      name: updates.name ?? null,
      email: updates.email ?? null,
      phoneNumber: updates.phoneNumber ?? null,
      profilePictureUrl: updates.profilePictureUrl ?? null,
    });
    shadow = created && created.toObject ? created.toObject() : created;
    return shadow;
  }

  if (Object.keys(updates).length > 1) {
    await User.findByIdAndUpdate(shadow._id, updates);
    shadow = { ...shadow, ...updates };
  }

  return shadow;
}

/**
 * POST /api/v1/auth/login
 * Body: { provider, providerUserId, phoneNumber?, email?, name?, profilePictureUrl? }
 * Find or create user by (provider + providerUserId), update profile if provided, issue JWT.
 * Add ?timing=1 or header X-Debug-Timing: 1 to get timing report in response.
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

  const includeTiming = req.query.timing === '1' || (req.get && req.get('x-debug-timing') === '1');
  const timing = {};

  try {
    const authDataProvider = getAuthDataProvider();
    const selectedBackend = getSelectedBackend();
    const startMs = Date.now();
    console.time('LOGIN_TOTAL');

    // User lookup (indexed: provider + providerUserId); .lean() for read-only
    console.time('LOGIN_User.findOne');
    let user = await authDataProvider.findActiveUserByProvider(provider, providerUserId);
    console.timeEnd('LOGIN_User.findOne');
    timing.userFindOneMs = Date.now() - startMs;

    const now = new Date();
    const updates = { updatedAt: now };

    if (name !== undefined) updates.name = name && typeof name === 'string' ? name.trim() || null : null;
    if (email !== undefined) updates.email = normalizeEmail(email);
    if (phoneNumber !== undefined) updates.phoneNumber = normalizePhone(phoneNumber);
    if (profilePictureUrl !== undefined) updates.profilePictureUrl = profilePictureUrl && typeof profilePictureUrl === 'string' ? profilePictureUrl.trim() || null : null;

    if (!user) {
      user = await authDataProvider.createProviderUser({
        provider,
        providerUserId: providerUserId.trim(),
        name: updates.name ?? null,
        email: updates.email ?? null,
        phoneNumber: updates.phoneNumber ?? null,
        profilePictureUrl: updates.profilePictureUrl ?? null,
      });
    } else if (Object.keys(updates).length > 1) {
      await authDataProvider.updateUserById(user._id, updates);
      user = { ...user, ...updates };
    }

    // Bridge mode: when Firebase is selected, keep Mongo shadow user in sync
    // so existing JWT-protected endpoints continue working without contract changes.
    if (selectedBackend === 'firebase') {
      try {
        const shadowUser = await upsertMongoShadowUser({ provider, providerUserId, updates });
        // Canonical bridge: keep Firebase users doc id aligned with JWT/Mongo user id.
        await authDataProvider.updateUserById(
          shadowUser._id,
          toFirebaseUserPayload(shadowUser, provider, providerUserId)
        );
        user = shadowUser;
      } catch (bridgeErr) {
        // Allow Firebase login even if Mongo is temporarily unavailable.
        console.warn('[auth/login] Mongo shadow sync skipped:', bridgeErr.message);
      }
    }

    // No bcrypt in this flow (provider-based auth: phone/google/apple)
    const beforeJwtMs = Date.now();
    console.time('LOGIN_jwt.sign');
    const token = jwt.sign(
      { userId: user._id.toString(), provider, providerUserId: user.providerUserId },
      secret,
      { expiresIn }
    );
    console.timeEnd('LOGIN_jwt.sign');
    timing.jwtSignMs = Date.now() - beforeJwtMs;

    timing.totalMs = Date.now() - startMs;
    console.timeEnd('LOGIN_TOTAL');
    console.log('[login] timing', { ...timing, dataBackend: selectedBackend });

    const payload = {
      success: true,
      token,
      user: toUserResponse(user),
    };
    if (includeTiming) payload.timing = timing;

    return res.status(200).json(payload);
  } catch (err) {
    console.timeEnd('LOGIN_TOTAL');
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'User already exists with this provider and id.' });
    }
    console.error('auth/login error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Login failed.' });
  }
}

module.exports = { login };
