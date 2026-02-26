const mongoose = require('mongoose');
const Interest = require('../models/Interest');
const InterestCategory = require('../models/InterestCategory');
const { isValidObjectId } = require('../utils/validateObjectId');

function toTagDoc(tag) {
  if (!tag || !tag._id) return null;
  return {
    id: tag._id.toString(),
    name: tag.name,
    categoryId: tag.categoryId ? tag.categoryId.toString() : null,
    isActive: tag.isActive,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}

function toCategoryDoc(cat) {
  if (!cat || !cat._id) return null;
  return {
    id: cat._id.toString(),
    name: cat.name,
    order: cat.order ?? 0,
    isActive: cat.isActive,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  };
}

/** Backward compat: flat tag shape for existing callers */
function toInterestDoc(tag) {
  const d = toTagDoc(tag);
  if (!d) return null;
  return { ...d, name: tag.name, isActive: tag.isActive, createdAt: tag.createdAt, updatedAt: tag.updatedAt };
}

/**
 * GET /interests - return categories with nested tags (grouped) or flat tags
 * Query: ?grouped=true (default) → { categories: [ { id, name, order, isActive, tags: [...] } ], uncategorized: [...] }
 *        ?grouped=false or ?flat=true → { interests/tags: [ flat list ] } for backward compat
 */
async function list(req, res) {
  try {
    const grouped = req.query.grouped !== 'false' && req.query.flat !== 'true';
    const activeOnly = req.query.active !== 'false';

    if (grouped) {
      const catFilter = activeOnly ? { isActive: true } : {};
      const categories = await InterestCategory.find(catFilter).sort({ order: 1, name: 1 }).lean();
      const tagFilter = activeOnly ? { isActive: true } : {};
      const allTags = await Interest.find(tagFilter).sort({ name: 1 }).lean();
      const byCategory = new Map();
      const uncategorized = [];
      for (const tag of allTags) {
        const doc = toTagDoc(tag);
        if (tag.categoryId) {
          const cid = tag.categoryId.toString();
          if (!byCategory.has(cid)) byCategory.set(cid, []);
          byCategory.get(cid).push(doc);
        } else {
          uncategorized.push(doc);
        }
      }
      const categoriesWithTags = categories.map((c) => ({
        ...toCategoryDoc(c),
        tags: byCategory.get(c._id.toString()) || [],
      }));
      return res.status(200).json({
        success: true,
        categories: categoriesWithTags,
        uncategorized,
        data: { categories: categoriesWithTags, uncategorized },
      });
    }

    const filter = activeOnly ? { isActive: true } : {};
    const tags = await Interest.find(filter).sort({ name: 1 }).lean();
    const list = tags.map(toTagDoc);
    return res.status(200).json({ success: true, interests: list, tags: list, data: list });
  } catch (err) {
    console.error('GET /interests list error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to load interests.' });
  }
}

// ---------- Categories ----------

async function listCategories(req, res) {
  try {
    const activeOnly = req.query.active !== 'false';
    const filter = activeOnly ? { isActive: true } : {};
    const categories = await InterestCategory.find(filter).sort({ order: 1, name: 1 }).lean();
    return res.status(200).json({ success: true, categories: categories.map(toCategoryDoc), data: categories.map(toCategoryDoc) });
  } catch (err) {
    console.error('GET /interests/categories error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to load categories.' });
  }
}

async function createCategory(req, res) {
  try {
    const { name, order } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'name is required.' });
    }
    const trimmed = name.trim();
    const nameNormalized = trimmed.toLowerCase();
    const existing = await InterestCategory.findOne({ nameNormalized }).select('_id').lean();
    if (existing) {
      return res.status(409).json({ success: false, error: 'A category with this name already exists.' });
    }
    const category = await InterestCategory.create({
      name: trimmed,
      order: typeof order === 'number' ? order : 0,
    });
    return res.status(201).json({ success: true, category: toCategoryDoc(category), data: toCategoryDoc(category) });
  } catch (err) {
    console.error('POST /interests/categories error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create category.' });
  }
}

async function updateCategory(req, res) {
  const id = req.params.id;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: 'Invalid category ID.' });
  }
  const { name, order, isActive } = req.body;
  const category = await InterestCategory.findById(id);
  if (!category) {
    return res.status(404).json({ success: false, error: 'Category not found.' });
  }
  if (name !== undefined) {
    const trimmed = typeof name === 'string' ? name.trim() : category.name;
    const nameNormalized = trimmed.toLowerCase();
    const duplicate = await InterestCategory.findOne({ nameNormalized, _id: { $ne: id } }).select('_id').lean();
    if (duplicate) {
      return res.status(409).json({ success: false, error: 'A category with this name already exists.' });
    }
    category.name = trimmed;
  }
  if (order !== undefined) category.order = Number(order) || 0;
  if (isActive !== undefined) category.isActive = Boolean(isActive);
  await category.save();
  return res.status(200).json({ success: true, category: toCategoryDoc(category), data: toCategoryDoc(category) });
}

async function removeCategory(req, res) {
  const id = req.params.id;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: 'Invalid category ID.' });
  }
  const category = await InterestCategory.findById(id);
  if (!category) {
    return res.status(404).json({ success: false, error: 'Category not found.' });
  }
  category.isActive = false;
  await category.save();
  await Interest.updateMany({ categoryId: id }, { categoryId: null });
  return res.status(200).json({ success: true, message: 'Category deactivated. Its tags are now uncategorized.', data: toCategoryDoc(category) });
}

// ---------- Tags (interests) ----------

/**
 * POST /interests - create tag. Body: { name, categoryId? }
 */
async function create(req, res) {
  try {
    const { name, categoryId } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'name is required.' });
    }
    const trimmed = name.trim();
    const nameNormalized = trimmed.toLowerCase();
    const cid = categoryId && isValidObjectId(categoryId) ? new mongoose.Types.ObjectId(categoryId) : null;
    if (cid) {
      const cat = await InterestCategory.findById(cid).select('_id').lean();
      if (!cat) {
        return res.status(400).json({ success: false, error: 'Invalid categoryId.' });
      }
    }
    const existing = await Interest.findOne({ categoryId: cid, nameNormalized }).select('_id').lean();
    if (existing) {
      return res.status(409).json({ success: false, error: 'A tag with this name already exists in this category.' });
    }
    const interest = await Interest.create({ name: trimmed, categoryId: cid });
    return res.status(201).json({
      success: true,
      interest: toInterestDoc(interest),
      tag: toTagDoc(interest),
      data: toInterestDoc(interest),
    });
  } catch (err) {
    console.error('POST /interests create error:', err);
    const message = err.code === 11000 ? 'A tag with this name already exists in this category.' : (err.message || 'Failed to create tag.');
    return res.status(500).json({ success: false, error: message });
  }
}

/**
 * PUT /interests/:id - update tag. Body: { name?, categoryId?, isActive? }
 */
async function update(req, res) {
  const id = req.params.id;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: 'Invalid interest/tag ID.' });
  }
  const { name, categoryId, isActive } = req.body;
  const interest = await Interest.findById(id);
  if (!interest) {
    return res.status(404).json({ success: false, error: 'Interest/tag not found.' });
  }
  if (name !== undefined) {
    const trimmed = typeof name === 'string' ? name.trim() : interest.name;
    const nameNormalized = trimmed.toLowerCase();
    const cid = interest.categoryId || (categoryId && isValidObjectId(categoryId) ? new mongoose.Types.ObjectId(categoryId) : null);
    const duplicate = await Interest.findOne({ categoryId: cid, nameNormalized, _id: { $ne: id } }).select('_id').lean();
    if (duplicate) {
      return res.status(409).json({ success: false, error: 'A tag with this name already exists in this category.' });
    }
    interest.name = trimmed;
  }
  if (categoryId !== undefined) {
    if (!categoryId) {
      interest.categoryId = null;
    } else if (isValidObjectId(categoryId)) {
      const cat = await InterestCategory.findById(categoryId).select('_id').lean();
      if (!cat) return res.status(400).json({ success: false, error: 'Invalid categoryId.' });
      interest.categoryId = new mongoose.Types.ObjectId(categoryId);
    }
  }
  if (isActive !== undefined) interest.isActive = Boolean(isActive);
  await interest.save();
  return res.status(200).json({
    success: true,
    interest: toInterestDoc(interest),
    tag: toTagDoc(interest),
    data: toInterestDoc(interest),
  });
}

/**
 * DELETE /interests/:id - soft delete tag (set isActive = false)
 */
async function remove(req, res) {
  const id = req.params.id;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: 'Invalid interest/tag ID.' });
  }
  const interest = await Interest.findById(id);
  if (!interest) {
    return res.status(404).json({ success: false, error: 'Interest/tag not found.' });
  }
  interest.isActive = false;
  await interest.save();
  return res.status(200).json({ success: true, message: 'Tag deactivated.', data: toInterestDoc(interest) });
}

/**
 * DELETE /interests/uncategorized - deactivate all tags that have no category.
 * Keeps them in DB (soft-delete) so user.interests references don't break.
 */
async function deactivateUncategorized(req, res) {
  try {
    const result = await Interest.updateMany(
      { $or: [{ categoryId: null }, { categoryId: { $exists: false } }], isActive: true },
      { $set: { isActive: false } }
    );
    return res.status(200).json({
      success: true,
      message: `Deactivated ${result.modifiedCount} uncategorized tag(s).`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error('DELETE /interests/uncategorized error:', err);
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
