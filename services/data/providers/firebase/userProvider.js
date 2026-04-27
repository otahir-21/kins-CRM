const { getFirestore } = require('../../../firebaseAdmin');

const USERS_COLLECTION = 'users';

function toMongoLikeUser(docId, data) {
  if (!data) return null;
  return { _id: docId, ...data };
}

function expandDotNotation(source) {
  const output = {};
  for (const [key, value] of Object.entries(source || {})) {
    if (!key.includes('.')) {
      output[key] = value;
      continue;
    }
    const parts = key.split('.');
    let node = output;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (i === parts.length - 1) {
        node[part] = value;
      } else {
        node[part] = node[part] && typeof node[part] === 'object' ? node[part] : {};
        node = node[part];
      }
    }
  }
  return output;
}

async function findById(userId) {
  const db = getFirestore();
  if (!db) throw new Error('Firebase Firestore is not configured.');

  const doc = await db.collection(USERS_COLLECTION).doc(String(userId)).get();
  if (!doc.exists) return null;
  const data = doc.data() || {};
  if (data.deletedAt) return null;
  return toMongoLikeUser(doc.id, data);
}

async function updateById(userId, updates, options = {}) {
  const db = getFirestore();
  if (!db) throw new Error('Firebase Firestore is not configured.');

  const { returnUpdated = false } = options;
  const payload = expandDotNotation(updates || {});
  await db.collection(USERS_COLLECTION).doc(String(userId)).set(payload, { merge: true });

  if (!returnUpdated) return null;
  return findById(userId);
}

async function deleteById(userId) {
  const db = getFirestore();
  if (!db) throw new Error('Firebase Firestore is not configured.');
  await db.collection(USERS_COLLECTION).doc(String(userId)).delete();
}

module.exports = {
  findById,
  updateById,
  deleteById,
};
