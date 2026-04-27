const { getFirestore } = require('../services/firebaseAdmin');

const CATEGORIES_COLLECTION = 'interest_categories';
const TAGS_COLLECTION = 'interests';

function getDb() {
  const db = getFirestore();
  if (!db) throw new Error('Firebase Firestore is not configured.');
  return db;
}

function normalizeName(name) {
  return String(name || '').trim();
}

function normalizeTimestamp(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value._seconds === 'number') return new Date(value._seconds * 1000).toISOString();
  return null;
}

function toCategoryDoc(id, data) {
  return {
    id: String(id),
    name: data.name || '',
    order: Number(data.order || 0),
    isActive: data.isActive !== false,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

function toTagDoc(id, data) {
  return {
    id: String(id),
    name: data.name || '',
    categoryId: data.categoryId || null,
    isActive: data.isActive !== false,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

function toInterestDoc(id, data) {
  return toTagDoc(id, data);
}

async function list(req, res) {
  try {
    const db = getDb();
    const grouped = req.query.grouped !== 'false' && req.query.flat !== 'true';
    const activeOnly = req.query.active !== 'false';

    const categoriesSnap = await db.collection(CATEGORIES_COLLECTION).get();
    const tagsSnap = await db.collection(TAGS_COLLECTION).get();

    let categories = categoriesSnap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
    let tags = tagsSnap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

    if (activeOnly) {
      categories = categories.filter((c) => c.isActive !== false);
      tags = tags.filter((t) => t.isActive !== false);
    }

    categories.sort((a, b) => {
      const orderDiff = Number(a.order || 0) - Number(b.order || 0);
      if (orderDiff !== 0) return orderDiff;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    tags.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

    if (grouped) {
      const byCategory = new Map();
      const uncategorized = [];
      for (const tag of tags) {
        const doc = toTagDoc(tag.id, tag);
        if (tag.categoryId) {
          const cid = String(tag.categoryId);
          if (!byCategory.has(cid)) byCategory.set(cid, []);
          byCategory.get(cid).push(doc);
        } else {
          uncategorized.push(doc);
        }
      }
      const categoriesWithTags = categories.map((c) => ({
        ...toCategoryDoc(c.id, c),
        tags: byCategory.get(String(c.id)) || [],
      }));
      return res.status(200).json({
        success: true,
        categories: categoriesWithTags,
        uncategorized,
        data: { categories: categoriesWithTags, uncategorized },
      });
    }

    const flat = tags.map((t) => toTagDoc(t.id, t));
    return res.status(200).json({ success: true, interests: flat, tags: flat, data: flat });
  } catch (err) {
    console.error('GET /interests list error (firebase):', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to load interests.' });
  }
}

async function listCategories(req, res) {
  try {
    const db = getDb();
    const activeOnly = req.query.active !== 'false';
    const snap = await db.collection(CATEGORIES_COLLECTION).get();
    let categories = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
    if (activeOnly) categories = categories.filter((c) => c.isActive !== false);
    categories.sort((a, b) => {
      const orderDiff = Number(a.order || 0) - Number(b.order || 0);
      if (orderDiff !== 0) return orderDiff;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    const docs = categories.map((c) => toCategoryDoc(c.id, c));
    return res.status(200).json({ success: true, categories: docs, data: docs });
  } catch (err) {
    console.error('GET /interests/categories error (firebase):', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to load categories.' });
  }
}

async function createCategory(req, res) {
  try {
    const db = getDb();
    const { name, order } = req.body || {};
    const trimmed = normalizeName(name);
    if (!trimmed) return res.status(400).json({ success: false, error: 'name is required.' });
    const nameNormalized = trimmed.toLowerCase();
    const snap = await db.collection(CATEGORIES_COLLECTION).where('nameNormalized', '==', nameNormalized).limit(1).get();
    if (!snap.empty) {
      return res.status(409).json({ success: false, error: 'A category with this name already exists.' });
    }
    const now = new Date().toISOString();
    const data = {
      name: trimmed,
      nameNormalized,
      order: typeof order === 'number' ? order : Number(order || 0),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    const ref = db.collection(CATEGORIES_COLLECTION).doc();
    await ref.set(data);
    const doc = toCategoryDoc(ref.id, data);
    return res.status(201).json({ success: true, category: doc, data: doc });
  } catch (err) {
    console.error('POST /interests/categories error (firebase):', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create category.' });
  }
}

async function updateCategory(req, res) {
  try {
    const db = getDb();
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, error: 'Invalid category ID.' });

    const ref = db.collection(CATEGORIES_COLLECTION).doc(id);
    const existingSnap = await ref.get();
    if (!existingSnap.exists) {
      return res.status(404).json({ success: false, error: 'Category not found.' });
    }
    const existing = existingSnap.data() || {};
    const { name, order, isActive } = req.body || {};
    const updates = { updatedAt: new Date().toISOString() };

    if (name !== undefined) {
      const trimmed = normalizeName(name) || existing.name;
      const nameNormalized = trimmed.toLowerCase();
      const dup = await db.collection(CATEGORIES_COLLECTION).where('nameNormalized', '==', nameNormalized).limit(5).get();
      const hasOther = dup.docs.some((d) => d.id !== id);
      if (hasOther) {
        return res.status(409).json({ success: false, error: 'A category with this name already exists.' });
      }
      updates.name = trimmed;
      updates.nameNormalized = nameNormalized;
    }
    if (order !== undefined) updates.order = Number(order) || 0;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    await ref.set(updates, { merge: true });
    const finalDoc = { ...existing, ...updates };
    const payload = toCategoryDoc(id, finalDoc);
    return res.status(200).json({ success: true, category: payload, data: payload });
  } catch (err) {
    console.error('PUT /interests/categories/:id error (firebase):', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to update category.' });
  }
}

async function removeCategory(req, res) {
  try {
    const db = getDb();
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, error: 'Invalid category ID.' });

    const ref = db.collection(CATEGORIES_COLLECTION).doc(id);
    const existingSnap = await ref.get();
    if (!existingSnap.exists) {
      return res.status(404).json({ success: false, error: 'Category not found.' });
    }
    const now = new Date().toISOString();
    await ref.set({ isActive: false, updatedAt: now }, { merge: true });

    const tagsSnap = await db.collection(TAGS_COLLECTION).where('categoryId', '==', id).get();
    const writes = tagsSnap.docs.map((d) => d.ref.set({ categoryId: null, updatedAt: now }, { merge: true }));
    await Promise.all(writes);

    const merged = { ...(existingSnap.data() || {}), isActive: false, updatedAt: now };
    return res.status(200).json({
      success: true,
      message: 'Category deactivated. Its tags are now uncategorized.',
      data: toCategoryDoc(id, merged),
    });
  } catch (err) {
    console.error('DELETE /interests/categories/:id error (firebase):', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to deactivate category.' });
  }
}

async function create(req, res) {
  try {
    const db = getDb();
    const { name, categoryId } = req.body || {};
    const trimmed = normalizeName(name);
    if (!trimmed) return res.status(400).json({ success: false, error: 'name is required.' });
    const nameNormalized = trimmed.toLowerCase();
    const cid = categoryId ? String(categoryId).trim() : null;

    if (cid) {
      const cat = await db.collection(CATEGORIES_COLLECTION).doc(cid).get();
      if (!cat.exists) {
        return res.status(400).json({ success: false, error: 'Invalid categoryId.' });
      }
    }

    const dup = await db.collection(TAGS_COLLECTION)
      .where('nameNormalized', '==', nameNormalized)
      .where('categoryId', '==', cid || null)
      .limit(1)
      .get();
    if (!dup.empty) {
      return res.status(409).json({ success: false, error: 'A tag with this name already exists in this category.' });
    }

    const now = new Date().toISOString();
    const data = {
      name: trimmed,
      nameNormalized,
      categoryId: cid || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    const ref = db.collection(TAGS_COLLECTION).doc();
    await ref.set(data);
    const interest = toInterestDoc(ref.id, data);
    return res.status(201).json({ success: true, interest, tag: toTagDoc(ref.id, data), data: interest });
  } catch (err) {
    console.error('POST /interests create error (firebase):', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create tag.' });
  }
}

async function update(req, res) {
  try {
    const db = getDb();
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, error: 'Invalid interest/tag ID.' });
    const ref = db.collection(TAGS_COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Interest/tag not found.' });
    const current = snap.data() || {};
    const { name, categoryId, isActive } = req.body || {};
    const updates = { updatedAt: new Date().toISOString() };

    let targetName = current.name || '';
    if (name !== undefined) targetName = normalizeName(name) || targetName;
    let targetCategoryId = current.categoryId || null;
    if (categoryId !== undefined) {
      targetCategoryId = categoryId ? String(categoryId).trim() : null;
      if (targetCategoryId) {
        const cat = await db.collection(CATEGORIES_COLLECTION).doc(targetCategoryId).get();
        if (!cat.exists) return res.status(400).json({ success: false, error: 'Invalid categoryId.' });
      }
      updates.categoryId = targetCategoryId || null;
    }
    if (name !== undefined) {
      const nameNormalized = targetName.toLowerCase();
      const dup = await db.collection(TAGS_COLLECTION)
        .where('nameNormalized', '==', nameNormalized)
        .where('categoryId', '==', targetCategoryId || null)
        .limit(5)
        .get();
      const hasOther = dup.docs.some((d) => d.id !== id);
      if (hasOther) {
        return res.status(409).json({ success: false, error: 'A tag with this name already exists in this category.' });
      }
      updates.name = targetName;
      updates.nameNormalized = nameNormalized;
    }
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    await ref.set(updates, { merge: true });
    const finalDoc = { ...current, ...updates };
    const interest = toInterestDoc(id, finalDoc);
    return res.status(200).json({ success: true, interest, tag: toTagDoc(id, finalDoc), data: interest });
  } catch (err) {
    console.error('PUT /interests/:id error (firebase):', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to update tag.' });
  }
}

async function remove(req, res) {
  try {
    const db = getDb();
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, error: 'Invalid interest/tag ID.' });
    const ref = db.collection(TAGS_COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Interest/tag not found.' });
    const updates = { isActive: false, updatedAt: new Date().toISOString() };
    await ref.set(updates, { merge: true });
    const merged = { ...(snap.data() || {}), ...updates };
    return res.status(200).json({ success: true, message: 'Tag deactivated.', data: toInterestDoc(id, merged) });
  } catch (err) {
    console.error('DELETE /interests/:id error (firebase):', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to deactivate tag.' });
  }
}

async function deactivateUncategorized(req, res) {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const snap = await db.collection(TAGS_COLLECTION).get();
    const targets = snap.docs.filter((d) => {
      const x = d.data() || {};
      return (x.categoryId == null || x.categoryId === '') && x.isActive !== false;
    });
    await Promise.all(targets.map((d) => d.ref.set({ isActive: false, updatedAt: now }, { merge: true })));
    return res.status(200).json({
      success: true,
      message: `Deactivated ${targets.length} uncategorized tag(s).`,
      modifiedCount: targets.length,
    });
  } catch (err) {
    console.error('DELETE /interests/uncategorized error (firebase):', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to deactivate uncategorized tags.' });
  }
}

module.exports = {
  list,
  listCategories,
  createCategory,
  updateCategory,
  removeCategory,
  create,
  update,
  remove,
  deactivateUncategorized,
};

