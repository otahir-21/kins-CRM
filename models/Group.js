const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    type: {
      type: String,
      enum: ['interactive', 'updates_only'],
      default: 'interactive',
    },
    groupImageUrl: { type: String, default: null },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

groupSchema.index({ createdBy: 1 });
groupSchema.index({ members: 1 });

module.exports = mongoose.model('Group', groupSchema);
