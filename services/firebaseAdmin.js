/**
 * Firebase Admin SDK – used only to create custom tokens for chat.
 * Flutter app signs in with this token to use Firestore/Storage for group chat.
 *
 * Env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * (FIREBASE_PRIVATE_KEY: private key from service account JSON; use \n for newlines in .env)
 */
let firebaseAdmin = null;
let auth = null;

/** Returns list of missing env var names (empty if all set). */
function getMissingFirebaseEnv() {
  const missing = [];
  if (!process.env.FIREBASE_PROJECT_ID?.trim()) missing.push('FIREBASE_PROJECT_ID');
  if (!process.env.FIREBASE_CLIENT_EMAIL?.trim()) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!process.env.FIREBASE_PRIVATE_KEY?.trim()) missing.push('FIREBASE_PRIVATE_KEY');
  return missing;
}

function getAuth() {
  if (auth) return auth;
  if (!firebaseAdmin) {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!projectId || !clientEmail || !privateKey || (typeof privateKey === 'string' && !privateKey.trim())) {
      return null;
    }
    privateKey = typeof privateKey === 'string' ? privateKey.trim() : privateKey;
    if (typeof privateKey === 'string' && privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    try {
      // eslint-disable-next-line global-require
      firebaseAdmin = require('firebase-admin');
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      auth = firebaseAdmin.auth();
    } catch (err) {
      console.error('Firebase Admin init error:', err.message);
      return null;
    }
  }
  return auth;
}

/**
 * Create a custom token for the given uid (use MongoDB user id string).
 * Returns token string or null if Firebase not configured.
 */
async function createCustomToken(uid) {
  const a = getAuth();
  if (!a) return null;
  try {
    return await a.createCustomToken(uid);
  } catch (err) {
    console.error('Firebase createCustomToken error:', err.message);
    return null;
  }
}

module.exports = { getAuth, createCustomToken, getMissingFirebaseEnv };
