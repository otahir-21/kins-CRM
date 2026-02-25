const mongoose = require('mongoose');

const groupReportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    reason: { type: String, default: null, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

groupReportSchema.index({ reporterId: 1, groupId: 1 }, { unique: true });
groupReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('GroupReport', groupReportSchema);
