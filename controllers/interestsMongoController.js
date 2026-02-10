const mongoose = require('mongoose');
const Interest = require('../models/Interest');
const { isValidObjectId } = require('../utils/validateObjectId');

function toInterestDoc(i) {
  return {
    id: i._id.toString(),
    name: i.name,
    isActive: i.isActive,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

/**
 * GET /interests - return all active interests sorted by name
 */
async function list(req, res) {
  const activeOnly = req.query.active !== 'false';
  const filter = activeOnly ? { isActive: true } : {};
  const interests = await Interest.find(filter).sort({ name: 1 }).lean();
  const list = interests.map(toInterestDoc);
  return res.status(200).json({ success: true, interests: list, data: list });
}

/**
 * POST /interests - create interest, prevent duplicates (case-insensitive)
 * Body: { "name": "Sleep" }
 */
async function create(req, res) {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'name is required.' });
  }
  const trimmed = name.trim();
  const nameNormalized = trimmed.toLowerCase();
  const existing = await Interest.findOne({ nameNormalized });
  if (existing) {
    return res.status(409).json({ success: false, error: 'An interest with this name already exists.' });
  }
  const interest = await Interest.create({ name: trimmed });
  return res.status(201).json({
    success: true,
    interest: toInterestDoc(interest),
    data: toInterestDoc(interest),
  });
}

/**
 * PUT /interests/:id - update interest
 * Body: { "name": "Sleep Training", "isActive": true }
 */
async function update(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: 'Invalid interest ID.' });
  }
  const { name, isActive } = req.body;
  const interest = await Interest.findById(id);
  if (!interest) {
    return res.status(404).json({ success: false, error: 'Interest not found.' });
  }
  if (name !== undefined) {
    const trimmed = typeof name === 'string' ? name.trim() : interest.name;
    const nameNormalized = trimmed.toLowerCase();
    const duplicate = await Interest.findOne({ nameNormalized, _id: { $ne: id } });
    if (duplicate) {
      return res.status(409).json({ success: false, error: 'An interest with this name already exists.' });
    }
    interest.name = trimmed;
  }
  if (isActive !== undefined) interest.isActive = Boolean(isActive);
  await interest.save();
  return res.status(200).json({
    success: true,
    interest: toInterestDoc(interest),
    data: toInterestDoc(interest),
  });
}

/**
 * DELETE /interests/:id - soft delete (set isActive = false)
 */
async function remove(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: 'Invalid interest ID.' });
  }
  const interest = await Interest.findById(id);
  if (!interest) {
    return res.status(404).json({ success: false, error: 'Interest not found.' });
  }
  interest.isActive = false;
  await interest.save();
  return res.status(200).json({ success: true, message: 'Interest deactivated.', data: toInterestDoc(interest) });
}

module.exports = { list, create, update, remove };
