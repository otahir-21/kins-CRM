const mongoose = require('mongoose');

const userFeedSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    
    // Ranking/scoring (higher = more relevant)
    score: { type: Number, required: true, default: 0 },
    
    // Source of the feed entry (for analytics and future filters)
    source: { type: String, default: 'interest', enum: ['interest', 'follower', 'trending', 'location', 'recommended'] },
    
    // Metadata for future ranking adjustments
    metadata: {
      interestMatch: { type: Boolean, default: false },
      followerBoost: { type: Number, default: 0 },
      engagementBoost: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// One feed entry per (userId, postId) - prevents duplicate posts in feed
userFeedSchema.index({ userId: 1, postId: 1 }, { unique: true });
// Compound index for feed queries (userId + score descending)
userFeedSchema.index({ userId: 1, score: -1, createdAt: -1 });
userFeedSchema.index({ postId: 1 }); // for cleanup/updates

module.exports = mongoose.model('UserFeed', userFeedSchema);
