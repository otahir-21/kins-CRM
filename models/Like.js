const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    
    // For analytics and activity feed
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Compound unique index: user can only like a post once
likeSchema.index({ userId: 1, postId: 1 }, { unique: true });

// Index for getting all likes on a post (paginated)
likeSchema.index({ postId: 1, createdAt: -1 });

// Index for getting all posts liked by a user
likeSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Like', likeSchema);
