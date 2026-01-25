const admin = require('firebase-admin');
require('dotenv').config();

// Load service account from environment or file
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Parse from environment variable
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error('Error parsing FIREBASE_SERVICE_ACCOUNT:', error);
    process.exit(1);
  }
} else {
  // Load from file
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch (error) {
    console.error('Error loading serviceAccountKey.json:', error);
    console.error('Please ensure serviceAccountKey.json exists or set FIREBASE_SERVICE_ACCOUNT env variable');
    process.exit(1);
  }
}

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID || 'kins-b4afb',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'kins-b4afb.firebasestorage.app'
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth, admin };
