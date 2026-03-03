const mongoose = require('mongoose');

const DOC_ID = 'moderation_keywords';

const moderationSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: DOC_ID },
    keywords: { type: [String], default: [] },
  },
  { timestamps: true }
);

moderationSettingSchema.index({ key: 1 });

module.exports = mongoose.model('ModerationSetting', moderationSettingSchema);
module.exports.DOC_ID = DOC_ID;
