#!/usr/bin/env node
/**
 * One-time cleanup: deactivate posts whose author (userId) no longer exists in User collection.
 * Run from project root: node scripts/deactivate-orphan-posts.js
 * Requires MONGODB_URI in .env.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const userIds = await User.distinct('_id');
  const result = await Post.updateMany(
    { userId: { $nin: userIds }, isActive: true },
    { isActive: false }
  );
  console.log('Deactivated orphan posts:', result.modifiedCount);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
