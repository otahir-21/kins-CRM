const mongoose = require('mongoose');

const marketplaceListingSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'AED', trim: true },
    category: { type: String, trim: true },
    condition: {
      type: String,
      enum: ['new', 'like_new', 'good', 'fair', 'poor'],
      default: 'good',
    },
    imageUrls: [{ type: String, trim: true }],
    locationCity: { type: String, trim: true },
    locationCountry: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'sold', 'archived'],
      default: 'active',
      index: true,
    },
    isFeatured: { type: Boolean, default: false },
    // Optional: lightweight tags/attributes (size, color, etc.)
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

marketplaceListingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MarketplaceListing', marketplaceListingSchema);

