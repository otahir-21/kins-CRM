const mongoose = require('mongoose');

const interestCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameNormalized: { type: String, lowercase: true, trim: true, index: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

interestCategorySchema.index({ nameNormalized: 1 }, { unique: true });
interestCategorySchema.index({ order: 1, name: 1 });
interestCategorySchema.index({ createdAt: -1 });

interestCategorySchema.pre('save', function (next) {
  if (this.name != null) {
    this.nameNormalized = String(this.name).trim().toLowerCase();
  }
  next();
});

module.exports = mongoose.model('InterestCategory', interestCategorySchema);
