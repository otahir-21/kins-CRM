const mongoose = require('mongoose');

const socialLinkSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true }, // e.g. instagram, tiktok, website
    handle: { type: String, trim: true },
    url: { type: String, trim: true },
  },
  { _id: false }
);

const brandVerificationRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    brandName: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true },
    website: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    industry: { type: String, trim: true },
    description: { type: String, trim: true },
    socialLinks: [socialLinkSchema],
    documentUrls: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewNotes: { type: String, trim: true },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

brandVerificationRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('BrandVerificationRequest', brandVerificationRequestSchema);

