const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameNormalized: { type: String, lowercase: true, trim: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

interestSchema.index({ nameNormalized: 1 }, { unique: true });
interestSchema.index({ createdAt: -1 });

interestSchema.pre('save', function (next) {
  if (this.name != null) {
    this.nameNormalized = String(this.name).trim().toLowerCase();
  }
  next();
});

module.exports = mongoose.model('Interest', interestSchema);
