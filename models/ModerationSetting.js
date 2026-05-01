const mongoose = require('mongoose');

const DOC_ID = 'moderation_keywords';

const moderationSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: DOC_ID },
    keywords: { type: [String], default: [] },
    /** When true, new marketplace listings from the app are created as pending and must be approved in CRM. When false, they go live as active. */
    marketplaceRequiresApproval: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ModerationSetting', moderationSettingSchema);
module.exports.DOC_ID = DOC_ID;
