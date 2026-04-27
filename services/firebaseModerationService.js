const { getFirestore } = require('./firebaseAdmin');

const MODERATION_COLLECTION = 'moderation_settings';
const DOC_ID = 'default';

function db() {
  const firestore = getFirestore();
  if (!firestore) throw new Error('Firebase Firestore is not configured.');
  return firestore;
}

async function getSettings() {
  const doc = await db().collection(MODERATION_COLLECTION).doc(DOC_ID).get();
  const data = doc.exists ? (doc.data() || {}) : {};
  return {
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    marketplaceRequiresApproval: data.marketplaceRequiresApproval === true,
  };
}

async function setKeywords(keywords) {
  const cleaned = (Array.isArray(keywords) ? keywords : [])
    .map((k) => String(k || '').trim())
    .filter(Boolean)
    .slice(0, 200);
  await db().collection(MODERATION_COLLECTION).doc(DOC_ID).set(
    { keywords: cleaned, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  return cleaned;
}

async function setMarketplaceRequiresApproval(value) {
  const normalized = value === true || value === 'true';
  await db().collection(MODERATION_COLLECTION).doc(DOC_ID).set(
    { marketplaceRequiresApproval: normalized, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  return normalized;
}

module.exports = {
  getSettings,
  setKeywords,
  setMarketplaceRequiresApproval,
};

