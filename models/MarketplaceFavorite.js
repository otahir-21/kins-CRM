const mongoose = require('mongoose');

const marketplaceFavoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketplaceListing',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Each user can favorite a listing at most once
marketplaceFavoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true });

module.exports = mongoose.model('MarketplaceFavorite', marketplaceFavoriteSchema);

