/**
 * Seed 20 dummy interests (tags) under a few categories for the CRM.
 * Run: node scripts/seed-dummy-interests.js
 * Requires: MONGODB_URI in .env
 */
require('dotenv').config();
const mongoose = require('mongoose');
const InterestCategory = require('../models/InterestCategory');
const Interest = require('../models/Interest');

const DUMMY_CATEGORIES = [
  { name: 'Health', order: 1 },
  { name: 'Lifestyle', order: 2 },
  { name: 'Hobbies', order: 3 },
];

const DUMMY_INTERESTS = [
  { name: 'Sleep', category: 'Health' },
  { name: 'Fitness', category: 'Health' },
  { name: 'Nutrition', category: 'Health' },
  { name: 'Meditation', category: 'Health' },
  { name: 'Yoga', category: 'Health' },
  { name: 'Travel', category: 'Lifestyle' },
  { name: 'Reading', category: 'Lifestyle' },
  { name: 'Cooking', category: 'Lifestyle' },
  { name: 'Photography', category: 'Lifestyle' },
  { name: 'Music', category: 'Lifestyle' },
  { name: 'Running', category: 'Hobbies' },
  { name: 'Gardening', category: 'Hobbies' },
  { name: 'Art', category: 'Hobbies' },
  { name: 'Gaming', category: 'Hobbies' },
  { name: 'Movies', category: 'Hobbies' },
  { name: 'Pets', category: 'Lifestyle' },
  { name: 'Parenting', category: 'Lifestyle' },
  { name: 'Wellness', category: 'Health' },
  { name: 'Outdoor', category: 'Hobbies' },
  { name: 'Tech', category: 'Hobbies' },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGODB_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const categoryByName = {};
  for (const c of DUMMY_CATEGORIES) {
    const existing = await InterestCategory.findOne({ nameNormalized: c.name.toLowerCase().trim() }).lean();
    let cat;
    if (existing) {
      cat = existing;
      console.log(`Category "${c.name}" already exists.`);
    } else {
      cat = await InterestCategory.create({ name: c.name, order: c.order });
      console.log(`Created category: ${c.name}`);
    }
    categoryByName[c.name] = cat._id;
  }

  let created = 0;
  let skipped = 0;
  for (const { name, category } of DUMMY_INTERESTS) {
    const categoryId = categoryByName[category];
    const nameNormalized = name.trim().toLowerCase();
    const exists = await Interest.findOne({ categoryId, nameNormalized }).select('_id').lean();
    if (exists) {
      skipped++;
      continue;
    }
    await Interest.create({ name: name.trim(), categoryId });
    created++;
    console.log(`  Added interest: ${name} (${category})`);
  }

  console.log(`\nDone. Created ${created} interest(s), skipped ${skipped} (already exist).`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
