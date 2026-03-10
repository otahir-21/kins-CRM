const mongoose = require('mongoose');
const MarketplaceFavorite = require('../../models/MarketplaceFavorite');
const MarketplaceListing = require('../../models/MarketplaceListing');
const User = require('../../models/User');

function toFavoriteResponse(fav, listing, seller) {
  if (!fav || !fav._id || !listing || !listing._id) return null;
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
    id: fav._id.toString(),
    listingId: listing._id.toString(),
    userId: fav.userId.toString(),
    createdAt: fav.createdAt,
    updatedAt: fav.updatedAt,
    listing: {
      id: listing._id.toString(),
      sellerId: listing.sellerId.toString(),
      title: listing.title,
      description: listing.description ?? null,
      price: listing.price,
      currency: listing.currency,
      category: listing.category ?? null,
      condition: listing.condition ?? null,
      imageUrls: listing.imageUrls ?? [],
      locationCity: listing.locationCity ?? null,
      locationCountry: listing.locationCountry ?? null,
      status: listing.status,
      isFeatured: listing.isFeatured ?? false,
      tags: listing.tags ?? [],
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      seller: sellerPayload,
    },
  };
}

/**
 * POST /api/v1/marketplace/favorites
 * Body: { listingId }
 * Auth: JWT (current user).
 */
async function addFavorite(req, res) {
  try {
    const userId = req.userId;
    const { listingId } = req.body || {};
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }
    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ success: false, error: 'Valid listingId is required.' });
    }

    const listing = await MarketplaceListing.findById(listingId).lean();
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }
    if (['sold', 'archived'].includes(String(listing.status).toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Cannot favorite a sold or archived listing.' });
    }

    const fav = await MarketplaceFavorite.findOneAndUpdate(
      { userId, listingId },
      { $setOnInsert: { userId, listingId } },
      { upsert: true, new: true }
    );

    const seller = await User.findById(listing.sellerId)
      .select('name username profilePictureUrl')
      .lean();

    return res.status(201).json({
      success: true,
      favorite: toFavoriteResponse(fav, listing, seller),
    });
  } catch (err) {
    console.error('POST /marketplace/favorites error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to add favorite.' });
  }
}

/**
 * DELETE /api/v1/marketplace/favorites/:listingId
 * Auth: JWT (current user).
 */
async function removeFavorite(req, res) {
  try {
    const userId = req.userId;
    const { listingId } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }
    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ success: false, error: 'Valid listingId is required.' });
    }

    const result = await MarketplaceFavorite.findOneAndDelete({ userId, listingId });
    return res.status(200).json({ success: true, removed: !!result });
  } catch (err) {
    console.error('DELETE /marketplace/favorites/:listingId error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to remove favorite.' });
  }
}

/**
 * GET /api/v1/marketplace/favorites
 * Auth: JWT (current user).
 * Optional query: status=active|sold|draft|pending|archived|all
 */
async function listFavorites(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }
    const statusRaw = (req.query.status || 'all').trim().toLowerCase();
    const allowedStatuses = ['draft', 'pending', 'active', 'sold', 'archived'];
    const filterStatus = statusRaw === 'all' ? null : statusRaw;

    const favs = await MarketplaceFavorite.find({ userId }).lean();
    if (favs.length === 0) {
      return res.status(200).json({ success: true, favorites: [] });
    }

    const listingIds = favs.map((f) => f.listingId).filter(Boolean);
    const listingFilter = { _id: { $in: listingIds } };
    if (filterStatus && allowedStatuses.includes(filterStatus)) {
      listingFilter.status = filterStatus;
    }

    const listings = await MarketplaceListing.find(listingFilter).lean();
    const listingMap = new Map(listings.map((l) => [l._id.toString(), l]));

    const sellerIds = listings.map((l) => l.sellerId).filter(Boolean);
    const sellers =
      sellerIds.length > 0
        ? await User.find({ _id: { $in: sellerIds } })
            .select('name username profilePictureUrl')
            .lean()
        : [];
    const sellerMap = new Map(sellers.map((s) => [s._id.toString(), s]));

    const favorites = [];
    for (const fav of favs) {
      const listing = listingMap.get(fav.listingId.toString());
      if (!listing) continue;
      const seller = sellerMap.get(listing.sellerId.toString()) || null;
      const payload = toFavoriteResponse(fav, listing, seller);
      if (payload) favorites.push(payload);
    }

    return res.status(200).json({ success: true, favorites });
  } catch (err) {
    console.error('GET /marketplace/favorites error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to list favorites.' });
  }
}

module.exports = {
  addFavorite,
  removeFavorite,
  listFavorites,
};

