const { getFirestore } = require('./firebaseAdmin');
const firebaseUsersService = require('./firebaseUsersService');

const LISTINGS_COLLECTION = 'marketplace_listings';

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

function toListingDoc(id, data) {
  return {
    id: String(id),
    sellerId: data.sellerId ? String(data.sellerId) : null,
    title: data.title || '',
    description: data.description ?? null,
    price: Number(data.price || 0),
    currency: data.currency || 'AED',
    category: data.category ?? null,
    condition: data.condition || 'good',
    imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
    locationCity: data.locationCity ?? null,
    locationCountry: data.locationCountry ?? null,
    status: data.status || 'active',
    isFeatured: data.isFeatured === true,
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

async function hydrateSeller(listings) {
  const sellerIds = [...new Set(listings.map((x) => x.sellerId).filter(Boolean))];
  const users = await Promise.all(sellerIds.map((id) => firebaseUsersService.getUserById(id)));
  const map = new Map(users.filter(Boolean).map((u) => [u.id, u]));
  return listings.map((l) => ({
    ...l,
    seller: l.sellerId ? {
      id: l.sellerId,
      name: map.get(l.sellerId)?.name ?? null,
      username: map.get(l.sellerId)?.username ?? null,
      profilePictureUrl: map.get(l.sellerId)?.profilePictureUrl ?? null,
    } : null,
  }));
}

async function listListings({ page = 1, limit = 20, q = '', status = '' }) {
  const snap = await db().collection(LISTINGS_COLLECTION).get();
  let listings = snap.docs.map((d) => toListingDoc(d.id, d.data() || {}));

  const normalizedStatus = String(status || '').trim().toLowerCase();
  if (['draft', 'pending', 'active', 'sold', 'archived'].includes(normalizedStatus)) {
    listings = listings.filter((l) => String(l.status || '').toLowerCase() === normalizedStatus);
  }

  const term = String(q || '').trim().toLowerCase();
  if (term) {
    listings = listings.filter((l) =>
      String(l.title || '').toLowerCase().includes(term) ||
      String(l.description || '').toLowerCase().includes(term) ||
      String(l.category || '').toLowerCase().includes(term)
    );
  }

  listings.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (p - 1) * l;
  const pageItems = listings.slice(skip, skip + l);
  const hydrated = await hydrateSeller(pageItems);
  return {
    listings: hydrated,
    pagination: { page: p, limit: l, total: listings.length, hasMore: skip + pageItems.length < listings.length },
  };
}

async function getListingById(id) {
  const docId = String(id || '').trim();
  if (!docId) return null;
  const snap = await db().collection(LISTINGS_COLLECTION).doc(docId).get();
  if (!snap.exists) return null;
  const listing = toListingDoc(snap.id, snap.data() || {});
  const [hydrated] = await hydrateSeller([listing]);
  return hydrated;
}

async function createListing(payload) {
  const now = new Date().toISOString();
  const ref = db().collection(LISTINGS_COLLECTION).doc();
  const doc = {
    sellerId: String(payload.sellerId),
    title: String(payload.title || '').trim(),
    description: payload.description ?? null,
    price: Number(payload.price || 0),
    currency: payload.currency || 'AED',
    category: payload.category ?? null,
    condition: payload.condition || 'good',
    imageUrls: Array.isArray(payload.imageUrls) ? payload.imageUrls : [],
    locationCity: payload.locationCity ?? null,
    locationCountry: payload.locationCountry ?? null,
    status: payload.status || 'active',
    isFeatured: payload.isFeatured === true,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(doc);
  return getListingById(ref.id);
}

async function updateListing(id, updates) {
  const docId = String(id || '').trim();
  if (!docId) return null;
  const ref = db().collection(LISTINGS_COLLECTION).doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const next = { ...updates, updatedAt: new Date().toISOString() };
  if (next.price !== undefined) next.price = Number(next.price || 0);
  if (next.sellerId !== undefined && next.sellerId != null) next.sellerId = String(next.sellerId);
  await ref.set(next, { merge: true });
  return getListingById(docId);
}

async function deleteListing(id) {
  const docId = String(id || '').trim();
  if (!docId) return false;
  const ref = db().collection(LISTINGS_COLLECTION).doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

module.exports = {
  listListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
};

