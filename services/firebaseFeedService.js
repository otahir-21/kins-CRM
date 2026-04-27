const { getFirestore } = require('./firebaseAdmin');
const firebaseUsersService = require('./firebaseUsersService');
const BunnyService = require('./BunnyService');

const POSTS_COLLECTION = 'posts';
const INTERESTS_COLLECTION = 'interests';
const USERS_COLLECTION = 'users';

const MAX_TAGGED_USERS = 30;

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

function nowIso() {
  return new Date().toISOString();
}

async function fetchUserLean(userId, cache) {
  const id = String(userId || '').trim();
  if (!id) return null;
  if (cache && cache.has(id)) return cache.get(id);
  const doc = await db().collection(USERS_COLLECTION).doc(id).get();
  if (!doc.exists) {
    if (cache) cache.set(id, null);
    return null;
  }
  const x = doc.data() || {};
  const u = {
    _id: id,
    id,
    name: x.name ?? x.username ?? null,
    username: x.username ?? null,
    profilePictureUrl: x.profilePictureUrl ?? null,
    isBrand: x.isBrand === true,
    brandName: x.brandName ?? null,
  };
  if (cache) cache.set(id, u);
  return u;
}

async function fetchInterestLean(interestId) {
  const id = String(interestId || '').trim();
  if (!id) return null;
  const doc = await db().collection(INTERESTS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  const x = doc.data() || {};
  return { _id: id, name: x.name ?? null };
}

function buildPollResults(poll) {
  if (!poll || typeof poll !== 'object') return null;
  const question = poll.question || '';
  const options = Array.isArray(poll.options) ? poll.options : [];
  const totalVotes = Number(poll.totalVotes || 0)
    || options.reduce((s, o) => s + (Number(o.votes) || 0), 0);
  return {
    question,
    totalVotes,
    options: options.map((opt) => {
      const votes = Number(opt.votes) || 0;
      return {
        text: opt.text || '',
        votes,
        percentage: totalVotes > 0 ? Math.round((votes / totalVotes) * 1000) / 10 : 0,
      };
    }),
  };
}

async function loadActivePostsSorted() {
  const snap = await db().collection(POSTS_COLLECTION).get();
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() || {}) }))
    .filter((r) => r.isActive !== false && r.status !== 'deleted');
  rows.sort((a, b) => String(normalizeTimestamp(b.createdAt) || '').localeCompare(String(normalizeTimestamp(a.createdAt) || '')));
  return rows;
}

function authorKeyFromRow(row) {
  if (row.userId != null) return String(row.userId);
  if (row.authorId != null) return String(row.authorId);
  return null;
}

async function mapRowToV1Post(row, cache) {
  const id = row.id;
  const authorKey = authorKeyFromRow(row);
  let author = authorKey ? await fetchUserLean(authorKey, cache) : null;
  if (!author && row.authorName) {
    author = {
      _id: authorKey || 'unknown',
      id: authorKey || 'unknown',
      name: row.authorName,
      username: null,
      profilePictureUrl: null,
      isBrand: false,
      brandName: null,
    };
  }
  const interestIds = Array.isArray(row.interests) ? row.interests.map((x) => String(x)) : [];
  const interests = [];
  for (const iid of interestIds.slice(0, 30)) {
    const i = await fetchInterestLean(iid);
    interests.push(i || { _id: iid, name: null });
  }
  const taggedIds = Array.isArray(row.taggedUserIds) ? row.taggedUserIds.map((x) => String(x)) : [];
  const taggedUsers = [];
  for (const tid of taggedIds.slice(0, MAX_TAGGED_USERS)) {
    const u = await fetchUserLean(tid, cache);
    if (u) {
      taggedUsers.push({
        id: u._id,
        name: u.name,
        username: u.username,
        profilePictureUrl: u.profilePictureUrl,
      });
    }
  }
  const isBrand = author && author.isBrand === true;
  const authorName = isBrand && author.brandName ? author.brandName : author?.name ?? null;
  return {
    _id: id,
    userId: author || { _id: authorKey, name: row.authorName ?? null },
    type: row.type || 'text',
    content: row.content ?? row.text ?? null,
    media: Array.isArray(row.media) ? row.media : [],
    poll: row.poll || null,
    interests,
    taggedUserIds: taggedIds,
    taggedUsers,
    likesCount: row.likesCount ?? 0,
    commentsCount: row.commentsCount ?? 0,
    sharesCount: row.sharesCount ?? 0,
    repostsCount: row.repostsCount ?? 0,
    viewsCount: row.viewsCount ?? 0,
    reportCount: row.reportCount ?? 0,
    createdAt: normalizeTimestamp(row.createdAt),
    updatedAt: normalizeTimestamp(row.updatedAt),
    authorName,
    authorIsBrand: isBrand,
    authorBrandName: author?.brandName ?? null,
  };
}

async function mapRowToFeedItem(row, cache) {
  const v1 = await mapRowToV1Post(row, cache);
  const author = v1.userId && typeof v1.userId === 'object' ? v1.userId : {};
  const authorId = author._id != null ? String(author._id) : null;
  const authorWithId = authorId ? { ...author, _id: authorId, id: authorId } : author;
  const displayName = v1.authorName;
  return {
    _id: v1._id,
    author: authorWithId,
    authorName: displayName,
    authorUsername: author.username ?? null,
    authorPhotoUrl: author.profilePictureUrl ?? null,
    content: v1.content,
    media: v1.media,
    likesCount: v1.likesCount,
    commentsCount: v1.commentsCount,
    sharesCount: v1.sharesCount,
    repostsCount: v1.repostsCount,
    viewsCount: v1.viewsCount,
    isLiked: false,
    userVote: null,
    pollResults: v1.type === 'poll' ? buildPollResults(v1.poll) : null,
    interests: (v1.interests || []).map((i) => ({ _id: i._id, name: i.name })),
    taggedUserIds: v1.taggedUserIds,
    taggedUsers: v1.taggedUsers,
    type: v1.type,
    createdAt: v1.createdAt,
    feedScore: 0,
    feedSource: 'firebase',
    repostedBy: null,
  };
}

async function getHomeFeed(userId, { page, limit }) {
  const p = Math.max(1, page || 1);
  const l = Math.min(100, Math.max(1, limit || 20));
  const skip = (p - 1) * l;
  const all = await loadActivePostsSorted();
  const slice = all.slice(skip, skip + l);
  const cache = new Map();
  const feed = [];
  for (const row of slice) {
    feed.push(await mapRowToFeedItem(row, cache));
  }
  return {
    feed,
    pagination: {
      page: p,
      limit: l,
      total: all.length,
      hasMore: skip + slice.length < all.length,
    },
  };
}

async function getAllPostsPaginated({ page, limit }) {
  const p = Math.max(1, page || 1);
  const l = Math.min(100, Math.max(1, limit || 20));
  const skip = (p - 1) * l;
  const all = await loadActivePostsSorted();
  const slice = all.slice(skip, skip + l);
  const cache = new Map();
  const posts = [];
  for (const row of slice) {
    const v1 = await mapRowToV1Post(row, cache);
    const { authorName, authorIsBrand, authorBrandName, taggedUserIds, taggedUsers, ...rest } = v1;
    posts.push({
      ...rest,
      authorName,
      authorIsBrand,
      authorBrandName,
      taggedUserIds,
      taggedUsers,
    });
  }
  return {
    posts,
    pagination: {
      page: p,
      limit: l,
      total: all.length,
      hasMore: skip + slice.length < all.length,
    },
  };
}

async function getMyPostsPaginated(userId, { page, limit }) {
  const uid = String(userId || '').trim();
  const p = Math.max(1, page || 1);
  const l = Math.min(100, Math.max(1, limit || 20));
  const skip = (p - 1) * l;
  const mine = (await loadActivePostsSorted()).filter((row) => {
    const k = authorKeyFromRow(row);
    return k && String(k) === uid;
  });
  const slice = mine.slice(skip, skip + l);
  const cache = new Map();
  const posts = [];
  for (const row of slice) {
    const v1 = await mapRowToV1Post(row, cache);
    const { authorName, authorIsBrand, authorBrandName, taggedUserIds, taggedUsers, ...rest } = v1;
    posts.push({
      ...rest,
      authorName,
      authorIsBrand,
      authorBrandName,
      taggedUserIds,
      taggedUsers,
    });
  }
  return {
    posts,
    pagination: {
      page: p,
      limit: l,
      total: mine.length,
      hasMore: skip + slice.length < mine.length,
    },
  };
}

async function getSinglePostForV1(id) {
  const doc = await db().collection(POSTS_COLLECTION).doc(String(id)).get();
  if (!doc.exists) return null;
  const row = { id: doc.id, ...(doc.data() || {}) };
  if (row.isActive === false || row.status === 'deleted') return null;
  const cache = new Map();
  return mapRowToV1Post(row, cache);
}

async function softDeletePostForUser(postId, userId) {
  const id = String(postId || '').trim();
  const uid = String(userId || '').trim();
  if (!id || !uid) return { ok: false, code: 'NOT_FOUND' };
  const ref = db().collection(POSTS_COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, code: 'NOT_FOUND' };
  const data = doc.data() || {};
  if (data.isActive === false || data.status === 'deleted') return { ok: false, code: 'NOT_FOUND' };
  const author = authorKeyFromRow({ ...data, id }) || '';
  if (String(author) !== uid) return { ok: false, code: 'FORBIDDEN' };
  await ref.set({ isActive: false, status: 'deleted', updatedAt: nowIso() }, { merge: true });
  return { ok: true };
}

async function assertInterestIdsExist(interestIds) {
  const ids = (Array.isArray(interestIds) ? interestIds : []).map((x) => String(x || '').trim()).filter(Boolean);
  const unique = [...new Set(ids)];
  if (unique.length === 0) return { ok: false, error: 'At least one interest is required.' };
  const found = [];
  for (const iid of unique.slice(0, 50)) {
    const doc = await db().collection(INTERESTS_COLLECTION).doc(iid).get();
    if (doc.exists) found.push(iid);
  }
  if (found.length === 0) return { ok: false, error: 'No valid interests provided.' };
  return { ok: true, ids: found };
}

async function resolveTaggedUserIds(rawTagged) {
  let parsed = [];
  if (rawTagged !== undefined && rawTagged !== null && rawTagged !== '') {
    if (Array.isArray(rawTagged)) parsed = rawTagged;
    else if (typeof rawTagged === 'string') {
      try {
        const v = JSON.parse(rawTagged);
        parsed = Array.isArray(v) ? v : [];
      } catch {
        parsed = [];
      }
    }
  }
  const ids = [...new Set(parsed.map((x) => String(x || '').trim()).filter(Boolean))].slice(0, MAX_TAGGED_USERS);
  const existing = [];
  for (const id of ids) {
    const u = await firebaseUsersService.getUserById(id);
    if (u) existing.push(id);
  }
  return existing;
}

/**
 * Create post in Firestore (multipart + JSON fields same contract as Mongo path).
 */
async function createPostFromMultipart(req) {
  const userId = String(req.userId || '').trim();
  const { type, content, poll, interestIds, taggedUserIds: rawTagged } = req.body;

  if (!['text', 'image', 'video', 'poll'].includes(type)) {
    return { error: { status: 400, body: { success: false, error: 'Invalid post type.' } } };
  }

  let parsedInterestIds = [];
  if (Array.isArray(interestIds)) parsedInterestIds = interestIds;
  else if (typeof interestIds === 'string' && interestIds.trim()) {
    try {
      const v = JSON.parse(interestIds);
      parsedInterestIds = Array.isArray(v) ? v : [];
    } catch {
      parsedInterestIds = [];
    }
  }
  const interestCheck = await assertInterestIdsExist(parsedInterestIds);
  if (!interestCheck.ok) {
    return { error: { status: 400, body: { success: false, error: interestCheck.error } } };
  }

  const taggedUserIds = await resolveTaggedUserIds(rawTagged);

  const postData = {
    userId,
    authorId: userId,
    type,
    content: content || null,
    text: content || null,
    interests: interestCheck.ids,
    taggedUserIds,
    media: [],
    poll: null,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    repostsCount: 0,
    viewsCount: 0,
    reportCount: 0,
    isActive: true,
    status: 'active',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  if (type === 'image' || type === 'video') {
    if (!req.files || req.files.length === 0) {
      return { error: { status: 400, body: { success: false, error: `${type} post requires media files.` } } };
    }
    if (!BunnyService.isConfigured()) {
      return { error: { status: 500, body: { success: false, error: 'Media upload not configured (Bunny CDN).' } } };
    }
    const uploads = await Promise.all(
      req.files.map(async (file) => {
        const folder = type === 'image' ? 'posts/images' : 'posts/videos';
        const { cdnUrl } = await BunnyService.upload(file.buffer, file.originalname, folder);
        let thumbnail = null;
        if (type === 'video') {
          thumbnail = cdnUrl.replace(/\.[^.]+$/, '_thumb.jpg');
        }
        return {
          type: file.mimetype.startsWith('image/') ? 'image' : 'video',
          url: cdnUrl,
          thumbnail,
        };
      }),
    );
    postData.media = uploads;
  }

  if (type === 'poll') {
    let pollObj = poll;
    if (typeof poll === 'string' && poll.trim()) {
      try {
        pollObj = JSON.parse(poll);
      } catch {
        pollObj = null;
      }
    }
    if (!pollObj || !pollObj.question || !pollObj.options || pollObj.options.length < 2) {
      return { error: { status: 400, body: { success: false, error: 'Poll requires question and at least 2 options.' } } };
    }
    postData.poll = {
      question: pollObj.question,
      options: pollObj.options.map((opt) => ({ text: opt.text || opt, votes: 0 })),
      totalVotes: 0,
      votedUsers: [],
    };
  }

  const ref = db().collection(POSTS_COLLECTION).doc();
  await ref.set(postData);

  const cache = new Map();
  const authorForResponse = await fetchUserLean(userId, cache);
  let taggedUsers = [];
  if (taggedUserIds.length > 0) {
    const users = await Promise.all(taggedUserIds.map((tid) => fetchUserLean(tid, cache)));
    taggedUsers = users.filter(Boolean).map((u) => ({
      id: u._id,
      name: u.name,
      username: u.username,
      profilePictureUrl: u.profilePictureUrl,
    }));
  }

  return {
    response: {
      status: 201,
      body: {
        success: true,
        message: 'Post created successfully.',
        post: {
          _id: ref.id,
          userId: authorForResponse || userId,
          type: postData.type,
          content: postData.content,
          media: postData.media,
          poll: postData.poll,
          interests: postData.interests,
          taggedUserIds,
          taggedUsers,
          likesCount: postData.likesCount,
          commentsCount: postData.commentsCount,
          sharesCount: postData.sharesCount,
          repostsCount: postData.repostsCount,
          viewsCount: postData.viewsCount,
          createdAt: postData.createdAt,
        },
      },
    },
  };
}

async function incrementReportCount(postId) {
  const id = String(postId || '').trim();
  if (!id) return { ok: false };
  const ref = db().collection(POSTS_COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false };
  const data = doc.data() || {};
  if (data.isActive === false || data.status === 'deleted') return { ok: false };
  const rc = Number(data.reportCount || 0) + 1;
  await ref.set({ reportCount: rc, updatedAt: nowIso() }, { merge: true });
  return { ok: true };
}

module.exports = {
  getHomeFeed,
  getAllPostsPaginated,
  getMyPostsPaginated,
  getSinglePostForV1,
  softDeletePostForUser,
  createPostFromMultipart,
  incrementReportCount,
};
