const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, index: true }, // e.g. 'warning', 'system', 'liked_post'
    title: { type: String, default: null },
    body: { type: String, default: null }, // message text for in-app display
    senderId: { type: String, default: null }, // admin, or user id
    senderName: { type: String, default: null },
    senderProfilePicture: { type: String, default: null },
    action: { type: String, default: null }, // legacy field for CRM
    relatedPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    postThumbnail: { type: String, default: null },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
