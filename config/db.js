const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kins-crm';

// Cache connection promise for serverless environments (Vercel)
let cachedConnection = null;

async function connectMongo() {
  // Return existing connection if already connected
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Return pending connection promise if connecting
  if (cachedConnection) {
    return cachedConnection;
  }

  const isAtlas = MONGODB_URI.includes('mongodb.net');
  const isLocal = MONGODB_URI.includes('localhost') || MONGODB_URI.includes('127.0.0.1');
  const isVercel = !!process.env.VERCEL;

  try {
    // Longer timeout for serverless cold starts
    const timeoutMs = isVercel ? 30000 : 10000;
    
    cachedConnection = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: timeoutMs,
      socketTimeoutMS: 45000,
      // Optimize for serverless (fewer connections, faster startup)
      maxPoolSize: isVercel ? 1 : 10,
      minPoolSize: 0,
    });

    await cachedConnection;
    
    console.log('MongoDB connected:', isLocal ? 'localhost' : 'Atlas', isVercel ? '(Vercel)' : '');
    
    return mongoose.connection;
  } catch (err) {
    cachedConnection = null; // Reset cache on error
    
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

module.exports = { connectMongo, mongoose };
