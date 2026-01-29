const { createInterest } = require('./interests-helpers');

// Dummy interests for mother & child/parenting app
const interests = [
  // Parenting & Childcare
  'Newborn Care',
  'Toddler Development',
  'Child Nutrition',
  'Breastfeeding',
  'Baby Sleep',
  'Potty Training',
  'Child Safety',
  
  // Health & Wellness
  'Pregnancy Health',
  'Postpartum Care',
  'Baby Health',
  'Mental Health',
  'Fitness & Exercise',
  'Yoga & Meditation',
  
  // Products & Shopping
  'Baby Products',
  'Maternity Fashion',
  'Baby Gear',
  'Toys & Games',
  'Organic Products',
  'Eco-Friendly Living',
  
  // Education & Learning
  'Early Education',
  'Reading & Books',
  'STEM Learning',
  'Language Development',
  'Homeschooling',
  
  // Lifestyle
  'Family Travel',
  'Meal Planning',
  'Home Organization',
  'Budgeting & Finance',
  'Work-Life Balance',
  'Self-Care',
  
  // Community & Support
  'Parenting Support',
  'Mom Groups',
  'Expert Advice',
];

async function seedInterests() {
  console.log('🌱 Starting to seed interests...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const interestName of interests) {
    try {
      const interest = await createInterest({ name: interestName });
      console.log(`✅ Created: ${interest.name} (ID: ${interest.id})`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error creating "${interestName}":`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully created: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total interests: ${interests.length}`);
  console.log('\n✨ Seeding complete!');
}

// Run the seeding
seedInterests()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
