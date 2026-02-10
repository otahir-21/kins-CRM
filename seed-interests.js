require('dotenv').config();
const mongoose = require('mongoose');
const Interest = require('./models/Interest');
const { connectMongo } = require('./config/db');

const interests = [
  'Newborn Care', 'Toddler Development', 'Child Nutrition', 'Breastfeeding', 'Baby Sleep',
  'Potty Training', 'Child Safety', 'Pregnancy Health', 'Postpartum Care', 'Baby Health',
  'Mental Health', 'Fitness & Exercise', 'Yoga & Meditation', 'Baby Products', 'Maternity Fashion',
  'Baby Gear', 'Toys & Games', 'Organic Products', 'Eco-Friendly Living', 'Early Education',
  'Reading & Books', 'STEM Learning', 'Language Development', 'Homeschooling', 'Family Travel',
  'Meal Planning', 'Home Organization', 'Budgeting & Finance', 'Work-Life Balance', 'Self-Care',
  'Parenting Support', 'Mom Groups', 'Expert Advice',
];

async function seedInterests() {
  console.log('🌱 Seeding interests (MongoDB)...\n');
  await connectMongo();

  let successCount = 0;
  let errorCount = 0;

  for (const name of interests) {
    try {
      const nameNormalized = name.trim().toLowerCase();
      const existing = await Interest.findOne({ nameNormalized });
      if (existing) {
        console.log(`⏭️  Skip (exists): ${name}`);
        successCount++;
        continue;
      }
      const interest = await Interest.create({ name: name.trim() });
      console.log(`✅ Created: ${interest.name} (ID: ${interest._id})`);
      successCount++;
    } catch (err) {
      console.error(`❌ "${name}":`, err.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary: ${successCount} ok, ${errorCount} errors, ${interests.length} total`);
  await mongoose.disconnect();
}

seedInterests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
