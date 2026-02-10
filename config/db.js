const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kins-crm';

async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;

  const isAtlas = MONGODB_URI.includes('mongodb.net');
  const isLocal = MONGODB_URI.includes('localhost') || MONGODB_URI.includes('127.0.0.1');

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB connected:', isLocal ? 'localhost' : 'Atlas');
  } catch (err) {
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
