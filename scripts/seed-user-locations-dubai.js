#!/usr/bin/env node
/**
 * One-time seed: set latitude/longitude for all users to different points within Dubai, UAE.
 * Run from project root: node scripts/seed-user-locations-dubai.js
 * Requires MONGODB_URI in .env.
 *
 * Dubai approximate bounds:
 *   Latitude:  24.95 – 25.35
 *   Longitude: 55.12 – 55.58
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Dubai, UAE bounds (approximate)
const DUBAI_LAT_MIN = 24.95;
const DUBAI_LAT_MAX = 25.35;
const DUBAI_LNG_MIN = 55.12;
const DUBAI_LNG_MAX = 55.58;

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find({}).select('_id name username').lean();
  const now = new Date();
  let updated = 0;

  for (const user of users) {
    const latitude = randomInRange(DUBAI_LAT_MIN, DUBAI_LAT_MAX);
    const longitude = randomInRange(DUBAI_LNG_MIN, DUBAI_LNG_MAX);
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          'location.latitude': latitude,
          'location.longitude': longitude,
          'location.isVisible': true,
          'location.updatedAt': now,
        },
      }
    );
    updated += 1;
    console.log(`Updated ${user.name || user.username || user._id}: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
  }

  console.log(`Done. Updated ${updated} users with Dubai lat/lng.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
