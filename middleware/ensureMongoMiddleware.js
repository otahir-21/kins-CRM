/**
 * Middleware to ensure MongoDB connection is established before processing requests.
 * Critical for serverless environments (Vercel) where cold starts can cause timing issues.
 * Calls connectDB() so all API routes get a cached connection before any DB access.
 */

const { connectDB } = require('../lib/mongodb');
const { getSelectedBackend } = require('../services/data/backendSelector');

function shouldBypassMongo(req) {
  const reqPath = req.path || '';
  const method = req.method || 'GET';

  // Health checks should never require DB.
  if (reqPath === '/health' || reqPath === '/api/v1/health') return true;

  // Allow frontend/static routes without DB checks.
  if (!reqPath.startsWith('/api') && !reqPath.startsWith('/auth')) return true;

  const authBackend = getSelectedBackend('auth');
  const meBackend = getSelectedBackend('me');

  // Firebase-backed login route can run without Mongo.
  if (authBackend === 'firebase' && method === 'POST' && reqPath === '/api/v1/auth/login') return true;

  // Firebase-backed /me routes can run without Mongo.
  if (meBackend === 'firebase' && reqPath.startsWith('/api/v1/me')) return true;

  // Firebase-backed interests domain should not require Mongo.
  if (getSelectedBackend('interests') === 'firebase' && (reqPath.startsWith('/api/interests') || reqPath.startsWith('/interests'))) {
    return true;
  }

  // Firebase-backed users domain should not require Mongo.
  if (getSelectedBackend('users') === 'firebase' && (
    reqPath.startsWith('/api/users') ||
    reqPath.startsWith('/api/user-interests') ||
    reqPath.startsWith('/api/crm/user/')
  )) {
    return true;
  }

  // Firebase-backed groups domain should not require Mongo.
  if (getSelectedBackend('groups') === 'firebase' && reqPath.startsWith('/api/groups')) {
    return true;
  }

  // Firebase-backed ads domain should not require Mongo.
  if (getSelectedBackend('ads') === 'firebase' && reqPath.startsWith('/api/ads')) {
    return true;
  }

  // Firebase-backed marketplace domain should not require Mongo.
  if (getSelectedBackend('marketplace') === 'firebase' && reqPath.startsWith('/api/marketplace')) {
    return true;
  }

  // Firebase-backed surveys domain should not require Mongo.
  if (getSelectedBackend('surveys') === 'firebase' && (
    reqPath.startsWith('/api/surveys') ||
    /\/api\/users\/[^/]+\/survey-responses/.test(reqPath)
  )) {
    return true;
  }

  // Firebase-backed onboarding domain should not require Mongo.
  if (getSelectedBackend('onboarding') === 'firebase' && reqPath.startsWith('/api/onboarding')) {
    return true;
  }

  // Firebase-backed moderation settings should not require Mongo.
  if (getSelectedBackend('moderation') === 'firebase' && reqPath.startsWith('/api/moderation')) {
    return true;
  }

  // Firebase-backed posts/moderation feed should not require Mongo.
  if (getSelectedBackend('posts') === 'firebase' && reqPath.startsWith('/api/posts')) {
    return true;
  }

  // Firebase-backed brand verification should not require Mongo.
  if (getSelectedBackend('verification') === 'firebase' && reqPath.startsWith('/api/brands/verification')) {
    return true;
  }

  // Firebase-backed notifications should not require Mongo.
  if (getSelectedBackend('notifications') === 'firebase' && reqPath.startsWith('/api/notifications')) {
    return true;
  }

  // Firebase-backed mobile feed + v1 posts (read/write on Firestore).
  if (getSelectedBackend('feed') === 'firebase') {
    if (reqPath === '/api/v1/feed' && method === 'GET') return true;
    if (reqPath === '/api/v1/posts' && (method === 'GET' || method === 'POST')) return true;
    if (reqPath === '/api/v1/posts/my' && method === 'GET') return true;
    const postsDetail = /^\/api\/v1\/posts\/([^/]+)$/.exec(reqPath);
    if (postsDetail) {
      const seg = postsDetail[1];
      if (seg !== 'my' && (method === 'GET' || method === 'DELETE')) return true;
    }
    if (method === 'POST' && /^\/api\/v1\/posts\/[^/]+\/report$/.test(reqPath)) return true;
  }

  // CRM analytics should remain reachable during migration even if Mongo is down.
  if (reqPath === '/api/statistics') return true;

  return false;
}

async function ensureMongo(req, res, next) {
  try {
    const bypass = shouldBypassMongo(req);
    if (bypass) {
      return next();
    }

    // Ensure MongoDB is connected before processing request (uses global cache)
    await connectDB();
    next();
  } catch (err) {
    console.error('MongoDB connection failed in middleware:', err.message);
    return res.status(503).json({
      success: false,
      error: 'Database connection unavailable',
      message: err.message,
      hint: 'MongoDB connection failed. Check MONGODB_URI environment variable and Atlas IP whitelist.',
    });
  }
}

module.exports = { ensureMongo };
