const { getFirestore } = require('./firebaseAdmin');
const firebaseModerationService = require('./firebaseModerationService');

const POSTS_COLLECTION = 'posts';

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

function toPost(id, data) {
  return {
    id: String(id),
    userId: data.userId ? String(data.userId) : null,
    authorId: data.authorId ? String(data.authorId) : (data.userId ? String(data.userId) : null),
    authorName: data.authorName ?? data.userName ?? null,
    text: data.text ?? data.content ?? '',
    content: data.content ?? data.text ?? '',
    mediaUrl: data.mediaUrl ?? data.imageUrl ?? null,
    imageUrl: data.imageUrl ?? data.mediaUrl ?? null,
    thumbnailUrl: data.thumbnailUrl ?? null,
    type: data.type ?? 'post',
    reportCount: Number(data.reportCount || 0),
    isActive: data.isActive !== false,
    status: data.status ?? (data.isActive === false ? 'deleted' : 'active'),
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

function sortByCreatedDesc(posts) {
  return posts.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

async function listPosts({ limit = 20, status = 'active', q = '', userId = null }) {
  const snap = await db().collection(POSTS_COLLECTION).get();
  let posts = snap.docs.map((d) => toPost(d.id, d.data() || {}));
  if (status === 'active') posts = posts.filter((p) => p.isActive !== false && p.status !== 'deleted');
  if (status === 'deleted') posts = posts.filter((p) => p.isActive === false || p.status === 'deleted');
  if (userId) posts = posts.filter((p) => String(p.userId || p.authorId || '') === String(userId));
  const term = String(q || '').trim().toLowerCase();
  if (term) {
    posts = posts.filter((p) => String(p.text || p.content || '').toLowerCase().includes(term));
  }
  posts = sortByCreatedDesc(posts).slice(0, Math.max(1, Number(limit) || 20));
  return { posts, hasMore: false, nextPageToken: null };
}

async function listReportedPosts({ limit = 20 }) {
  const snap = await db().collection(POSTS_COLLECTION).get();
  let posts = snap.docs.map((d) => toPost(d.id, d.data() || {}));
  posts = posts.filter((p) => Number(p.reportCount || 0) > 0);
  posts = sortByCreatedDesc(posts).slice(0, Math.max(1, Number(limit) || 20));
  return { posts, hasMore: false, nextPageToken: null };
}

async function listFlaggedPosts({ limit = 20 }) {
  const settings = await firebaseModerationService.getSettings();
  const keywords = (settings.keywords || []).map((k) => String(k).toLowerCase()).filter(Boolean);
  const snap = await db().collection(POSTS_COLLECTION).get();
  const posts = [];
  for (const d of snap.docs) {
    const post = toPost(d.id, d.data() || {});
    const hay = String(post.text || post.content || '').toLowerCase();
    const matchedKeywords = keywords.filter((k) => hay.includes(k));
    if (matchedKeywords.length > 0) posts.push({ ...post, matchedKeywords });
  }
  const sorted = sortByCreatedDesc(posts).slice(0, Math.max(1, Number(limit) || 20));
  return { posts: sorted, hasMore: false, nextPageToken: null };
}

async function getPostById(postId) {
  const id = String(postId || '').trim();
  if (!id) return null;
  const doc = await db().collection(POSTS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return toPost(doc.id, doc.data() || {});
}

async function softDeletePost(postId) {
  const id = String(postId || '').trim();
  if (!id) return null;
  const ref = db().collection(POSTS_COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const updates = { isActive: false, status: 'deleted', updatedAt: new Date().toISOString() };
  await ref.set(updates, { merge: true });
  return toPost(id, { ...(doc.data() || {}), ...updates });
}

module.exports = {
  listPosts,
  listReportedPosts,
  listFlaggedPosts,
  getPostById,
  softDeletePost,
};

