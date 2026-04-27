const { getFirestore } = require('./firebaseAdmin');

const ADS_COLLECTION = 'ads';

function db() {
  const firestore = getFirestore();
  if (!firestore) throw new Error('Firebase Firestore is not configured.');
  return firestore;
}

function normalizeTimestamp(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value._seconds === 'number') return new Date(value._seconds * 1000).toISOString();
  return null;
}

function toAdDoc(id, data) {
  return {
    id: String(id),
    imageUrl: data.imageUrl || null,
    link: data.link || '',
    title: data.title ?? null,
    isActive: data.isActive !== false,
    isForMarketplace: data.isForMarketplace === true,
    order: Number(data.order || 0),
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

async function listAds({ page = 1, limit = 20 }) {
  const snap = await db().collection(ADS_COLLECTION).get();
  const docs = snap.docs.map((d) => toAdDoc(d.id, d.data() || {}));
  docs.sort((a, b) => {
    const orderDiff = a.order - b.order;
    if (orderDiff !== 0) return orderDiff;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (p - 1) * l;
  const pageItems = docs.slice(skip, skip + l);
  return {
    ads: pageItems,
    pagination: { page: p, limit: l, total: docs.length, hasMore: skip + pageItems.length < docs.length },
  };
}

async function listActiveAds({ placement = 'home' }) {
  const snap = await db().collection(ADS_COLLECTION).get();
  let docs = snap.docs.map((d) => toAdDoc(d.id, d.data() || {})).filter((a) => a.isActive);
  if (placement === 'marketplace') docs = docs.filter((a) => a.isForMarketplace === true);
  if (placement === 'home') docs = docs.filter((a) => a.isForMarketplace !== true);
  docs.sort((a, b) => {
    const orderDiff = a.order - b.order;
    if (orderDiff !== 0) return orderDiff;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
  return docs;
}

async function getAdById(id) {
  const docId = String(id || '').trim();
  if (!docId) return null;
  const doc = await db().collection(ADS_COLLECTION).doc(docId).get();
  if (!doc.exists) return null;
  return toAdDoc(doc.id, doc.data() || {});
}

async function createAd(payload) {
  const now = new Date().toISOString();
  const ref = db().collection(ADS_COLLECTION).doc();
  const doc = {
    imageUrl: payload.imageUrl || null,
    link: payload.link || '',
    title: payload.title ?? null,
    isActive: payload.isActive !== false,
    isForMarketplace: payload.isForMarketplace === true,
    order: Number(payload.order || 0),
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(doc);
  return toAdDoc(ref.id, doc);
}

async function updateAd(id, updates) {
  const docId = String(id || '').trim();
  if (!docId) return null;
  const ref = db().collection(ADS_COLLECTION).doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const next = {
    updatedAt: new Date().toISOString(),
    ...updates,
  };
  if (next.order !== undefined) next.order = Number(next.order || 0);
  await ref.set(next, { merge: true });
  const merged = { ...(snap.data() || {}), ...next };
  return toAdDoc(docId, merged);
}

async function deleteAd(id) {
  const docId = String(id || '').trim();
  if (!docId) return false;
  const ref = db().collection(ADS_COLLECTION).doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

module.exports = {
  listAds,
  listActiveAds,
  getAdById,
  createAd,
  updateAd,
  deleteAd,
};

