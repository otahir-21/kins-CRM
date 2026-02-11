const mongoose = require('mongoose');

const commentLikeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: true, index: true },
    
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Compound unique index: user can only like a comment once
commentLikeSchema.index({ userId: 1, commentId: 1 }, { unique: true });

// Index for getting all likes on a comment
commentLikeSchema.index({ commentId: 1, createdAt: -1 });

module.exports = mongoose.model('CommentLike', commentLikeSchema);
