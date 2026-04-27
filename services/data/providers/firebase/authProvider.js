const { getFirestore } = require('../../../firebaseAdmin');

const USERS_COLLECTION = 'users';

function withTimestamps(payload, isCreate) {
  const nowIso = new Date().toISOString();
  return {
    ...payload,
    updatedAt: nowIso,
    ...(isCreate ? { createdAt: nowIso } : {}),
  };
}

function toMongoLikeUser(docId, data) {
  if (!data) return null;
  return {
    _id: docId,
    ...data,
  };
}

async function findActiveUserByProvider(provider, providerUserId) {
  const db = getFirestore();
  if (!db) {
    throw new Error('Firebase Firestore is not configured.');
  }

  const snap = await db
    .collection(USERS_COLLECTION)
    .where('provider', '==', provider)
    .where('providerUserId', '==', providerUserId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data() || {};

  if (data.deletedAt) return null;
  return toMongoLikeUser(doc.id, data);
}

async function createProviderUser(payload) {
  const db = getFirestore();
  if (!db) {
    throw new Error('Firebase Firestore is not configured.');
  }

  const docRef = db.collection(USERS_COLLECTION).doc();
  const data = withTimestamps(payload, true);
  await docRef.set(data);
  return toMongoLikeUser(docRef.id, data);
}

async function updateUserById(userId, updates) {
  const db = getFirestore();
  if (!db) {
    throw new Error('Firebase Firestore is not configured.');
  }

  const data = withTimestamps(updates, false);
  await db.collection(USERS_COLLECTION).doc(String(userId)).set(data, { merge: true });
}

module.exports = {
  findActiveUserByProvider,
  createProviderUser,
  updateUserById,
};
