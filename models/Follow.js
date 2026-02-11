const mongoose = require('mongoose');

/**
 * Follow relationship: followerId follows followingId.
 * - followerId: the user who clicks "Follow"
 * - followingId: the user who gets followed
 */
const followSchema = new mongoose.Schema(
  {
    followerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    followingId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// One follow relationship per pair (no duplicate follows)
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

// List followers of a user (who follows followingId?)
followSchema.index({ followingId: 1, createdAt: -1 });

// List who a user follows (who does followerId follow?)
followSchema.index({ followerId: 1, createdAt: -1 });

module.exports = mongoose.model('Follow', followSchema);
