/**
 * Middleware to ensure MongoDB connection is established before processing requests.
 * Critical for serverless environments (Vercel) where cold starts can cause timing issues.
 * Calls connectDB() so all API routes get a cached connection before any DB access.
 */

const { connectDB } = require('../lib/mongodb');

async function ensureMongo(req, res, next) {
  try {
    // Skip for health check
    if (req.path === '/health') {
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
