require('dotenv').config();
const mongoose = require('mongoose');
const Interest = require('./models/Interest');
const { connectMongo } = require('./config/db');

const interests = [
  // Baby & infant
  'Newborn Care', 'Toddler Development', 'Child Nutrition', 'Breastfeeding', 'Baby Sleep',
  'Potty Training', 'Child Safety', 'Baby Health', 'Baby Led Weaning', 'Cloth Diapering',
  'Baby Wearing', 'Teething', 'Baby First Foods', 'Formula Feeding', 'Pumping',
  // Pregnancy & postpartum
  'Pregnancy Health', 'Postpartum Care', 'IVF & Fertility', 'First Trimester', 'Second Trimester',
  'Third Trimester', 'C-Section Recovery', 'Vaginal Birth', 'Postpartum Depression', 'Baby Blues',
  // Mom life & identity
  'Working Mum', 'Stay-at-Home Mum', 'Single Mum', 'First-Time Mum', 'Adoptive Mum',
  'Foster Mum', 'Mom Life', 'Mom Community', 'Mom Support', 'Mom Humor',
  // Wellness & self-care
  'Mental Health', 'Fitness & Exercise', 'Yoga & Meditation', 'Self-Care', 'Sleep Deprivation',
  'Stress Relief', 'Mom Burnout', 'Body Positivity', 'Post-Baby Body',
  // Products & lifestyle
  'Baby Products', 'Maternity Fashion', 'Baby Gear', 'Toys & Games', 'Organic Products',
  'Eco-Friendly Living', 'Sustainable Parenting', 'Minimalist Parenting',
  // Learning & development
  'Early Education', 'Reading & Books', 'STEM Learning', 'Language Development', 'Homeschooling',
  'Screen Time', 'Play & Learning', 'Milestones',
  // Home & routine
  'Family Travel', 'Meal Planning', 'Home Organization', 'Budgeting & Finance', 'Work-Life Balance',
  'School Run', 'Morning Routine', 'Bedtime Routine',
  // Support & community
  'Parenting Support', 'Mom Groups', 'Expert Advice', 'Dad Support', 'Grandparenting',
  'Sibling Rivalry', 'Co-Parenting',
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
