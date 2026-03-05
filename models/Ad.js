const mongoose = require('mongoose');

const adSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true, trim: true },
    link: { type: String, required: true, trim: true },
    title: { type: String, default: null, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    // false = home page, true = marketplace
    isForMarketplace: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

adSchema.index({ isActive: 1, isForMarketplace: 1, order: 1 });
adSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Ad', adSchema);
