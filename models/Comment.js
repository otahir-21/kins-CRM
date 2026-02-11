const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    
    // Comment content
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    
    // For threaded comments (replies)
    parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    
    // Cached counts for performance (updated atomically)
    likesCount: { type: Number, default: 0, min: 0 },
    repliesCount: { type: Number, default: 0, min: 0 },
    
    // Soft delete
    isActive: { type: Boolean, default: true, index: true },
    
    // For moderation
    isReported: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
commentSchema.index({ postId: 1, isActive: 1, createdAt: -1 }); // Get comments for a post
commentSchema.index({ parentCommentId: 1, isActive: 1, createdAt: -1 }); // Get replies for a comment
commentSchema.index({ userId: 1, isActive: 1, createdAt: -1 }); // Get user's comments

module.exports = mongoose.model('Comment', commentSchema);
