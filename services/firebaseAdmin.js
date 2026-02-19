/**
 * Firebase Admin SDK – used only to create custom tokens for chat.
 * Flutter app signs in with this token to use Firestore/Storage for group chat.
 *
 * Env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * (FIREBASE_PRIVATE_KEY: private key from service account JSON; use \n for newlines in .env)
 */
let firebaseAdmin = null;
let auth = null;
let lastFirebaseError = null;

/** Returns list of missing env var names (empty if all set). */
function getMissingFirebaseEnv() {
  const missing = [];
  if (!process.env.FIREBASE_PROJECT_ID?.trim()) missing.push('FIREBASE_PROJECT_ID');
  if (!process.env.FIREBASE_CLIENT_EMAIL?.trim()) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!process.env.FIREBASE_PRIVATE_KEY?.trim()) missing.push('FIREBASE_PRIVATE_KEY');
  return missing;
}

/** Last error from Firebase init or createCustomToken (for API to return to client). */
function getLastFirebaseError() {
  return lastFirebaseError;
}

function getAuth() {
  if (auth) return auth;
  lastFirebaseError = null;
  if (!firebaseAdmin) {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!projectId || !clientEmail || !privateKey || (typeof privateKey === 'string' && !privateKey.trim())) {
      return null;
    }
    privateKey = typeof privateKey === 'string' ? privateKey.trim() : privateKey;
    if (typeof privateKey === 'string') {
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      // Vercel/env sometimes turns newlines into spaces; fix so PEM parses
      if (privateKey.includes('-----') && !privateKey.includes('\n') && privateKey.includes(' ')) {
        privateKey = privateKey.replace(/\s+-----/g, '\n-----');
        privateKey = privateKey.replace(/\n\s+/g, '\n').replace(/\s+\n/g, '\n');
      }
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
      lastFirebaseError = err.message || String(err);
      console.error('Firebase Admin init error:', lastFirebaseError);
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
    lastFirebaseError = err.message || String(err);
    console.error('Firebase createCustomToken error:', lastFirebaseError);
    return null;
  }
}

module.exports = { getAuth, createCustomToken, getMissingFirebaseEnv, getLastFirebaseError };
