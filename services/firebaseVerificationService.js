const { getFirestore } = require('./firebaseAdmin');
const firebaseUsersService = require('./firebaseUsersService');

const COLLECTION = 'brand_verification_requests';

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

async function toVerificationDoc(id, data) {
  const user = data.userId ? await firebaseUsersService.getUserById(String(data.userId)) : null;
  return {
    id: String(id),
    userId: data.userId ? String(data.userId) : null,
    brandName: data.brandName ?? '',
    companyName: data.companyName ?? null,
    website: data.website ?? null,
    contactEmail: data.contactEmail ?? null,
    contactPhone: data.contactPhone ?? null,
    industry: data.industry ?? null,
    description: data.description ?? null,
    socialLinks: Array.isArray(data.socialLinks) ? data.socialLinks : [],
    documentUrls: Array.isArray(data.documentUrls) ? data.documentUrls : [],
    status: data.status || 'pending',
    reviewNotes: data.reviewNotes ?? null,
    reviewedBy: data.reviewedBy ?? null,
    reviewedAt: normalizeTimestamp(data.reviewedAt),
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
    user: user ? {
      id: user.id,
      name: user.name ?? null,
      username: user.username ?? null,
      profilePictureUrl: user.profilePictureUrl ?? null,
      followerCount: user.followerCount ?? 0,
      followingCount: user.followingCount ?? 0,
    } : null,
  };
}

async function listRequests({ status = '', page = 1, limit = 20, q = '' }) {
  const snap = await db().collection(COLLECTION).get();
  let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
  const s = String(status || '').toLowerCase().trim();
  if (['pending', 'approved', 'rejected'].includes(s)) rows = rows.filter((r) => String(r.status || '').toLowerCase() === s);
  const term = String(q || '').toLowerCase().trim();
  if (term) {
    rows = rows.filter((r) =>
      String(r.brandName || '').toLowerCase().includes(term) ||
      String(r.companyName || '').toLowerCase().includes(term) ||
      String(r.contactEmail || '').toLowerCase().includes(term)
    );
  }
  rows.sort((a, b) => String(normalizeTimestamp(b.createdAt) || '').localeCompare(String(normalizeTimestamp(a.createdAt) || '')));
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (p - 1) * l;
  const pageRows = rows.slice(skip, skip + l);
  const requests = [];
  for (const row of pageRows) {
    requests.push(await toVerificationDoc(row.id, row));
  }
  return {
    requests,
    pagination: { page: p, limit: l, total: rows.length, hasMore: skip + requests.length < rows.length },
  };
}

async function getRequestById(id) {
  const docId = String(id || '').trim();
  if (!docId) return null;
  const doc = await db().collection(COLLECTION).doc(docId).get();
  if (!doc.exists) return null;
  return toVerificationDoc(doc.id, doc.data() || {});
}

async function setStatus(id, status, reviewNotes) {
  const docId = String(id || '').trim();
  const ref = db().collection(COLLECTION).doc(docId);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const updates = {
    status,
    reviewNotes: reviewNotes != null ? String(reviewNotes).trim() : null,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await ref.set(updates, { merge: true });
  const merged = { ...(doc.data() || {}), ...updates };
  if (status === 'approved' && merged.userId) {
    await firebaseUsersService.updateUser(String(merged.userId), { isBrand: true, isBrandVerified: true });
  }
  return toVerificationDoc(docId, merged);
}

module.exports = {
  listRequests,
  getRequestById,
  setStatus,
};

