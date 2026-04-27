const { getFirestore } = require('./firebaseAdmin');

const USERS_COLLECTION = 'users';

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

function toUserDoc(id, data) {
  const createdAt = normalizeTimestamp(data.createdAt);
  const updatedAt = normalizeTimestamp(data.updatedAt);
  const interests = Array.isArray(data.interests) ? data.interests.map((x) => String(x)) : [];
  return {
    id: String(id),
    providerUserId: data.providerUserId ?? null,
    name: data.name ?? data.username ?? null,
    email: data.email ?? null,
    phoneNumber: data.phoneNumber ?? null,
    gender: data.gender ?? null,
    documentUrl: data.documentUrl ?? null,
    interests,
    createdAt,
    updatedAt,
    deletedAt: data.deletedAt ?? null,
    postsCount: data.postsCount ?? 0,
    warningsCount: data.warningsCount ?? 0,
  };
}

async function getAllUsers() {
  const snap = await db().collection(USERS_COLLECTION).get();
  const users = snap.docs.map((d) => toUserDoc(d.id, d.data() || {}));
  users.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return users;
}

async function getUserById(userId) {
  const id = String(userId || '').trim();
  if (!id) return null;
  const doc = await db().collection(USERS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return toUserDoc(doc.id, doc.data() || {});
}

async function getCompleteUserProfile(userId) {
  const user = await getUserById(userId);
  if (!user) return null;
  return {
    ...user,
    documents: user.documentUrl ? [{ id: 'doc1', url: user.documentUrl, type: 'document' }] : [],
    auth: {
      phoneNumber: user.phoneNumber,
      creationTime: user.createdAt,
      lastSignInTime: user.updatedAt,
    },
  };
}

async function searchUsersByName(term) {
  const q = String(term || '').trim().toLowerCase();
  if (!q) return [];
  const users = await getAllUsers();
  return users.filter((u) => String(u.name || '').toLowerCase().includes(q));
}

async function getUsersByGender(gender) {
  const g = String(gender || '').trim().toLowerCase();
  const users = await getAllUsers();
  return users.filter((u) => String(u.gender || '').toLowerCase() === g);
}

async function getUsersWithDocuments() {
  const users = await getAllUsers();
  return users.filter((u) => !!u.documentUrl);
}

async function updateUser(userId, updateData) {
  const id = String(userId || '').trim();
  if (!id) return null;
  const allowed = [
    'name',
    'gender',
    'documentUrl',
    'isBrand',
    'isBrandVerified',
    'username',
    'profilePictureUrl',
    'followerCount',
    'followingCount',
  ];
  const filtered = {};
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(updateData || {}, k)) filtered[k] = updateData[k];
  }
  filtered.updatedAt = new Date().toISOString();
  await db().collection(USERS_COLLECTION).doc(id).set(filtered, { merge: true });
  return getUserById(id);
}

async function softDeleteUser(userId) {
  const id = String(userId || '').trim();
  if (!id) return null;
  const now = new Date().toISOString();
  await db().collection(USERS_COLLECTION).doc(id).set({ deletedAt: now, updatedAt: now }, { merge: true });
  return getUserById(id);
}

async function getUserInterests(userId) {
  const user = await getUserById(userId);
  return user ? user.interests || [] : [];
}

module.exports = {
  getAllUsers,
  getUserById,
  getCompleteUserProfile,
  searchUsersByName,
  getUsersByGender,
  getUsersWithDocuments,
  updateUser,
  softDeleteUser,
  getUserInterests,
};

