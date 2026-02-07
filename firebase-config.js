const admin = require('firebase-admin');
require('dotenv').config();

// Load service account from environment or file (on Vercel you must set FIREBASE_SERVICE_ACCOUNT)
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    serviceAccount = JSON.parse(raw);
  } catch (e) {
    const msg = 'Invalid FIREBASE_SERVICE_ACCOUNT. On Vercel: paste the full JSON (one line) in Project → Settings → Environment Variables.';
    console.error(msg, e.message);
    throw new Error(msg);
  }
} else {
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch (e) {
    const msg = process.env.VERCEL
      ? 'On Vercel set FIREBASE_SERVICE_ACCOUNT in Project → Settings → Environment Variables (full service account JSON, one line).'
      : 'Missing Firebase credentials: add serviceAccountKey.json in project root or set FIREBASE_SERVICE_ACCOUNT env var.';
    console.error(msg);
    throw new Error(msg);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID || 'kins-b4afb',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'kins-b4afb.firebasestorage.app'
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth, admin };
