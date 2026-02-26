/**
 * One-off script: deactivate all interests (tags) that have no category.
 * Run: node scripts/deactivate-uncategorized-interests.js
 * Requires: MONGODB_URI in .env or environment
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Interest = require('../models/Interest');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGODB_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const result = await Interest.updateMany(
    { $or: [{ categoryId: null }, { categoryId: { $exists: false } }], isActive: true },
    { $set: { isActive: false } }
  );
  console.log(`Deactivated ${result.modifiedCount} uncategorized interest(s).`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
