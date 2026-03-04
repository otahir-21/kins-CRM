const mongoose = require('mongoose');
const MarketplaceListing = require('../../models/MarketplaceListing');
const User = require('../../models/User');

function toListingResponse(doc, seller) {
  if (!doc || !doc._id) return null;
  const sellerPayload =
    seller && seller._id
      ? {
          id: seller._id.toString(),
          name: seller.name ?? null,
          username: seller.username ?? null,
          profilePictureUrl: seller.profilePictureUrl ?? null,
        }
      : null;

  return {
    id: doc._id.toString(),
    sellerId: doc.sellerId.toString(),
    title: doc.title,
    description: doc.description ?? null,
    price: doc.price,
    currency: doc.currency,
    category: doc.category ?? null,
    condition: doc.condition ?? null,
    imageUrls: doc.imageUrls ?? [],
    locationCity: doc.locationCity ?? null,
    locationCountry: doc.locationCountry ?? null,
    status: doc.status,
    isFeatured: doc.isFeatured ?? false,
    tags: doc.tags ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    seller: sellerPayload,
  };
}

/**
 * GET /api/v1/marketplace/listings
 * Public/app endpoint: list active listings with filters.
 */
async function listListings(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const searchQ = (req.query.search || req.query.q || '').trim();
    const category = (req.query.category || '').trim();
    const status = (req.query.status || 'active').trim().toLowerCase();
    const sellerId = (req.query.sellerId || '').trim();
    const minPrice = req.query.minPrice != null ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice != null ? parseFloat(req.query.maxPrice) : null;

    const filter = {};
    if (status && ['draft', 'active', 'sold', 'archived'].includes(status)) {
      filter.status = status;
    } else {
      filter.status = 'active';
    }

    if (category) {
      filter.category = category;
    }

    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      filter.sellerId = new mongoose.Types.ObjectId(sellerId);
    }

    if (searchQ) {
      const escaped = searchQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      filter.$or = [{ title: re }, { description: re }, { category: re }];
    }

    if (!Number.isNaN(minPrice) && minPrice != null) {
      filter.price = { ...(filter.price || {}), $gte: minPrice };
    }
    if (!Number.isNaN(maxPrice) && maxPrice != null) {
      filter.price = { ...(filter.price || {}), $lte: maxPrice };
    }

    const [docs, total] = await Promise.all([
      MarketplaceListing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MarketplaceListing.countDocuments(filter),
    ]);

    const sellerIds = docs.map((d) => d.sellerId).filter(Boolean);
    const sellers =
      sellerIds.length > 0
        ? await User.find({ _id: { $in: sellerIds } })
            .select('name username profilePictureUrl')
            .lean()
        : [];
    const sellerMap = new Map(sellers.map((u) => [u._id.toString(), u]));

    return res.status(200).json({
      success: true,
      listings: docs.map((d) => toListingResponse(d, sellerMap.get(d.sellerId.toString()) || null)),
      pagination: { page, limit, total, hasMore: skip + docs.length < total },
    });
  } catch (err) {
    console.error('GET /marketplace/listings error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to list listings.' });
  }
}

/**
 * GET /api/v1/marketplace/listings/:id
 */
async function getListingById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid listing ID.' });
    }
    const doc = await MarketplaceListing.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }
    const seller = await User.findById(doc.sellerId).select('name username profilePictureUrl').lean();
    return res.status(200).json({ success: true, listing: toListingResponse(doc, seller) });
  } catch (err) {
    console.error('GET /marketplace/listings/:id error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get listing.' });
  }
}

/**
 * POST /api/v1/marketplace/listings
 * Create listing as current user (seller).
 */
async function createListing(req, res) {
  try {
    const sellerId = req.userId;
    if (!sellerId) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }
    const {
      title,
      description,
      price,
      currency,
      category,
      condition,
      imageUrls,
      locationCity,
      locationCountry,
      tags,
    } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, error: 'title is required.' });
    }
    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ success: false, error: 'price must be a non-negative number.' });
    }

    const payload = {
      sellerId,
      title: String(title).trim(),
      description: description != null ? String(description).trim() : undefined,
      price: priceNum,
      currency: currency ? String(currency).trim() : undefined,
      category: category ? String(category).trim() : undefined,
      condition: condition ? String(condition).trim() : undefined,
      locationCity: locationCity ? String(locationCity).trim() : undefined,
      locationCountry: locationCountry ? String(locationCountry).trim() : undefined,
    };

    if (Array.isArray(imageUrls)) {
      payload.imageUrls = imageUrls.map((u) => (u != null ? String(u).trim() : '')).filter((u) => u.length > 0);
    }
    if (Array.isArray(tags)) {
      payload.tags = tags.map((t) => (t != null ? String(t).trim() : '')).filter((t) => t.length > 0);
    }

    let doc = await MarketplaceListing.create(payload);
    doc = doc.toObject();
    const seller = await User.findById(sellerId).select('name username profilePictureUrl').lean();
    return res.status(201).json({ success: true, listing: toListingResponse(doc, seller) });
  } catch (err) {
    console.error('POST /marketplace/listings error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create listing.' });
  }
}

/**
 * PUT /api/v1/marketplace/listings/:id
 * Update listing (seller only for now).
 */
async function updateListing(req, res) {
  try {
    const sellerId = req.userId;
    const { id } = req.params;
    if (!sellerId) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid listing ID.' });
    }
    const doc = await MarketplaceListing.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }
    if (String(doc.sellerId) !== String(sellerId)) {
      return res.status(403).json({ success: false, error: 'You can only update your own listings.' });
    }

    const {
      title,
      description,
      price,
      currency,
      category,
      condition,
      imageUrls,
      locationCity,
      locationCountry,
      status,
      tags,
    } = req.body || {};

    if (title !== undefined) doc.title = String(title).trim();
    if (description !== undefined) doc.description = String(description).trim();
    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ success: false, error: 'price must be a non-negative number.' });
      }
      doc.price = priceNum;
    }
    if (currency !== undefined) doc.currency = String(currency).trim();
    if (category !== undefined) doc.category = String(category).trim();
    if (condition !== undefined) doc.condition = String(condition).trim();
    if (locationCity !== undefined) doc.locationCity = String(locationCity).trim();
    if (locationCountry !== undefined) doc.locationCountry = String(locationCountry).trim();
    if (status !== undefined) doc.status = String(status).trim();
    if (Array.isArray(imageUrls)) {
      doc.imageUrls = imageUrls.map((u) => (u != null ? String(u).trim() : '')).filter((u) => u.length > 0);
    }
    if (Array.isArray(tags)) {
      doc.tags = tags.map((t) => (t != null ? String(t).trim() : '')).filter((t) => t.length > 0);
    }

    await doc.save();
    const seller = await User.findById(doc.sellerId).select('name username profilePictureUrl').lean();
    return res.status(200).json({ success: true, listing: toListingResponse(doc.toObject(), seller) });
  } catch (err) {
    console.error('PUT /marketplace/listings/:id error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to update listing.' });
  }
}

/**
 * DELETE /api/v1/marketplace/listings/:id
 * Soft delete: mark as archived (seller only).
 */
async function deleteListing(req, res) {
  try {
    const sellerId = req.userId;
    const { id } = req.params;
    if (!sellerId) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid listing ID.' });
    }
    const doc = await MarketplaceListing.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }
    if (String(doc.sellerId) !== String(sellerId)) {
      return res.status(403).json({ success: false, error: 'You can only delete your own listings.' });
    }
    doc.status = 'archived';
    await doc.save();
    return res.status(200).json({ success: true, message: 'Listing archived.' });
  } catch (err) {
    console.error('DELETE /marketplace/listings/:id error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete listing.' });
  }
}

module.exports = {
  listListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
};

