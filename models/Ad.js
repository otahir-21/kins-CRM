const mongoose = require('mongoose');

const adSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true, trim: true },
    link: { type: String, required: true, trim: true },
    title: { type: String, default: null, trim: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

adSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('Ad', adSchema);
