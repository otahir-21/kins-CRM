const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameLower: { type: String, default: null, trim: true }, // for case-insensitive unique lookup
    description: { type: String, default: null, trim: true },
    type: {
      type: String,
      enum: ['interactive', 'updates_only'],
      default: 'interactive',
    },
    groupImageUrl: { type: String, default: null },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportCount: { type: Number, default: 0, min: 0, index: true },
  },
  { timestamps: true }
);

groupSchema.index({ createdBy: 1 });
groupSchema.index({ members: 1 });
groupSchema.index({ nameLower: 1 }, { unique: true, sparse: true });
groupSchema.index({ createdAt: -1 });
groupSchema.index({ reportCount: -1, updatedAt: -1 });

groupSchema.pre('save', function (next) {
  if (this.name) {
    this.nameLower = this.name.trim().toLowerCase();
  }
  next();
});

module.exports = mongoose.model('Group', groupSchema);
