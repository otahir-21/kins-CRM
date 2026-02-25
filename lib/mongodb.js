/**
 * MongoDB connection cache for Vercel serverless (and Node long-running).
 *
 * - Uses global.mongoose so the connection is reused across Lambda invocations.
 * - Connection is created at most once per Lambda instance (cold start creates one,
 *   subsequent requests reuse it).
 * - No mongoose.connect() in route handlers: call connectDB() from middleware
 *   (ensureMongo) so all API routes get a connection before any DB access.
 */

const mongoose = require('mongoose');

// Log all queries and execution time in development
if (process.env.NODE_ENV !== 'production') {
  mongoose.set('debug', true);
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kins-crm';

// Persist connection across serverless invocations (Vercel/Lambda).
// Without this, each invocation could create a new connection and hit limits.
const globalForMongoose = typeof globalThis !== 'undefined' ? globalThis : global;
if (!globalForMongoose.mongoose) {
  globalForMongoose.mongoose = { conn: null, promise: null };
}

/**
 * Ensure MongoDB is connected. Safe to call on every request; returns the same
 * connection after the first successful connect. Use in middleware so all API
 * routes have a live connection before any DB calls.
 *
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDB() {
  const state = globalForMongoose.mongoose;

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (state.promise) {
    return state.promise;
  }

  const isAtlas = MONGODB_URI.includes('mongodb.net');
  const isLocal = MONGODB_URI.includes('localhost') || MONGODB_URI.includes('127.0.0.1');
  const isVercel = !!process.env.VERCEL;

  try {
    const timeoutMs = isVercel ? 30000 : 10000;

    state.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: timeoutMs,
      socketTimeoutMS: 45000,
      maxPoolSize: isVercel ? 1 : 10,
      minPoolSize: 0,
    });

    await state.promise;
    state.conn = mongoose.connection;

    console.log('MongoDB connected:', isLocal ? 'localhost' : 'Atlas', isVercel ? '(Vercel)' : '');

    return mongoose.connection;
  } catch (err) {
    state.promise = null;
    state.conn = null;

    if (isAtlas) {
      console.error('MongoDB (Atlas) connection failed:', err.message);
      console.error('  → Check: .env MONGODB_URI, internet, Atlas IP allowlist (0.0.0.0/0), cluster not paused.');
    } else {
      console.error('MongoDB (local) connection failed:', err.message);
      console.error('  → Start MongoDB: brew services start mongodb-community (Mac) or run mongod.');
    }
    throw err;
  }
}

module.exports = { connectDB, mongoose };
