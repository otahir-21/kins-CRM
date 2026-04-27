const { getFirestore } = require('./firebaseAdmin');

const GROUPS_COLLECTION = 'groups';

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

function toGroupDoc(id, data) {
  const members = Array.isArray(data.members) ? data.members : [];
  const memberCount = typeof data.memberCount === 'number' ? data.memberCount : members.length;
  return {
    id: String(id),
    name: data.name || '',
    description: data.description ?? null,
    type: data.type || 'interactive',
    groupImageUrl: data.groupImageUrl ?? data.imageUrl ?? null,
    memberCount,
    members,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

async function listGroups({ page = 1, limit = 20, search = '', type = '' }) {
  const snap = await db().collection(GROUPS_COLLECTION).get();
  let groups = snap.docs.map((d) => toGroupDoc(d.id, d.data() || {}));

  const q = String(search || '').trim().toLowerCase();
  if (q) {
    groups = groups.filter((g) =>
      String(g.name || '').toLowerCase().includes(q) ||
      String(g.description || '').toLowerCase().includes(q)
    );
  }

  const typeFilter = String(type || '').toLowerCase();
  if (['interactive', 'updates_only'].includes(typeFilter)) {
    groups = groups.filter((g) => String(g.type || '').toLowerCase() === typeFilter);
  }

  groups.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (p - 1) * l;
  const pageItems = groups.slice(skip, skip + l);

  return {
    groups: pageItems,
    pagination: { page: p, limit: l, total: groups.length, hasMore: skip + pageItems.length < groups.length },
  };
}

async function getGroupById(id) {
  const docId = String(id || '').trim();
  if (!docId) return null;
  const doc = await db().collection(GROUPS_COLLECTION).doc(docId).get();
  if (!doc.exists) return null;
  return toGroupDoc(doc.id, doc.data() || {});
}

module.exports = {
  listGroups,
  getGroupById,
};

