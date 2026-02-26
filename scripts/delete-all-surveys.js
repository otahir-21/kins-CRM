/**
 * Delete all surveys and their responses from the database.
 * Run: node scripts/delete-all-surveys.js
 * Requires: MONGODB_URI in .env or environment
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Survey = require('../models/Survey');
const SurveyResponse = require('../models/SurveyResponse');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGODB_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const deletedResponses = await SurveyResponse.deleteMany({});
  console.log(`Deleted ${deletedResponses.deletedCount} survey response(s).`);

  const deletedSurveys = await Survey.deleteMany({});
  console.log(`Deleted ${deletedSurveys.deletedCount} survey(s).`);

  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
