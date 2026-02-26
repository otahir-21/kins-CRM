const mongoose = require('mongoose');

const postReportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    reason: { type: String, default: null, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

postReportSchema.index({ reporterId: 1, postId: 1 }, { unique: true });
postReportSchema.index({ postId: 1 });
postReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PostReport', postReportSchema);
